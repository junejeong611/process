const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const crypto = require('crypto');
const rateLimit = require('express-rate-limit');
const { sendEmail } = require('../utils/email');
const speakeasy = require('speakeasy');
const qrcode = require('qrcode');
const auth = require('../middleware/auth'); // Assuming you have this middleware
const { logEvent } = require('../services/auditLogService');
const mongoose = require('mongoose');
const { checkLoginAnomaly, handleFailedLogin } = require('../services/anomalyService');
const keyService = require('../services/keyService');
const mfaAuth = require('../middleware/mfa');
const { mfaLimiter, forgotPasswordLimiter } = require('../middleware/rateLimiter');
const adminEmailService = require('../services/adminEmailService');

const router = express.Router();

// Rate limiter for login to prevent brute-force attacks
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // limit each IP to 10 login requests per windowMs
  message: { success: false, message: 'Too many login attempts from this IP, please try again after 15 minutes' },
  standardHeaders: true,
  legacyHeaders: false,
});

// @route   POST /api/auth/register
// @desc    Register new user
// @access  Public
router.post('/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Email already registered' });
    }

    // Create new user
    const user = new User({ email, password, name });
    await user.save();

    // Generate token
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
      expiresIn: '7d'
    });

    res.status(201).json({ success: true, token, user: { id: user._id, email: user.email, name: user.name } });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// @route   POST /api/auth/login
// @desc    Login user and return JWT
// @access  Public
router.post('/login', loginLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user and select fields needed for login and reset flow
    const user = await User.findOne({ email }).select('+mfa_secret +refreshTokens +password');
    if (!user) {
      logEvent(null, 'USER_LOGIN_FAILED', 'FAILURE', { ipAddress: req.ip, details: { email } });
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    // --- Handle Forced Password Reset ---
    if (user.passwordResetRequired === true) {
      logEvent(user._id, 'FORCED_PASSWORD_RESET_INITIATED', 'SUCCESS', { ipAddress: req.ip });
      // Generate a secure, one-time password reset token
      const resetToken = crypto.randomBytes(32).toString('hex');
      // Hash the token for secure storage in the database
      user.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
      // Set a 1-hour expiry for the token
      user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
      
      await user.save();

      // Send a specific response to the client
      return res.status(200).json({ 
        success: false, // Not a successful login
        passwordResetRequired: true, 
        resetToken: resetToken // Send the unhashed token to the client
      });
    }

    // Check for account lock
    if (user.isLocked && user.lockExpiresAt > new Date()) {
      return res.status(403).json({ success: false, message: `Account is temporarily locked. Please try again after ${Math.ceil((user.lockExpiresAt - Date.now()) / 60000)} minutes.` });
    }

    // Check password
    if (!user.password) {
        // This case should not be hit if the passwordResetRequired flow is working, but it's a good safeguard.
        return res.status(401).json({ success: false, message: 'Invalid credentials. Please reset your password.' });
    }
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      logEvent(user._id, 'USER_LOGIN_FAILED', 'FAILURE', { ipAddress: req.ip });
      await handleFailedLogin(user._id, req.ip);
      // Consider adding a delay to make timing attacks harder
      await new Promise(resolve => setTimeout(resolve, 500));
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    // --- Check for Trusted Device ---
    const { device_id } = req.cookies;
    if (device_id) {
        const hashedDeviceId = crypto.createHash('sha256').update(device_id).digest('hex');
        const trustedDevice = user.trusted_devices.find(d => d.device_id === hashedDeviceId && d.expires_at > new Date());
        if (trustedDevice) {
            // Device is trusted, bypass MFA and issue tokens
            logEvent(user._id, 'USER_LOGIN', 'SUCCESS', { ipAddress: req.ip, details: { trustedDevice: true } });
            await checkLoginAnomaly(user, req.ip);
            const adminEmails = await adminEmailService.getAdminEmails();
            const isAdmin = adminEmails.includes(user.email);
            const accessToken = jwt.sign({ userId: user._id, mfa: 'verified', isAdmin }, process.env.JWT_SECRET, {
                expiresIn: '15m'
            });

            const refreshToken = crypto.randomBytes(40).toString('hex');
            const hashedRefreshToken = crypto.createHash('sha256').update(refreshToken).digest('hex');

            user.refreshTokens.push({ token: hashedRefreshToken, device: req.headers['user-agent'] });
            await user.save();
            
            res.cookie('refreshToken', refreshToken, {
              httpOnly: true,
              secure: process.env.NODE_ENV === 'production',
              sameSite: 'strict',
              maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
            });

            return res.json({ success: true, accessToken, user: { id: user._id, email: user.email, name: user.name } });
        }
    }
    
    // --- MFA Logic ---
    if (user.mfa_enabled) {
      // User has MFA enabled, require verification
      // Issue a temporary token that only grants access to the MFA verification route
      const mfaToken = jwt.sign({ userId: user._id, mfa: 'pending' }, process.env.JWT_SECRET, {
        expiresIn: '10m' // Short-lived
      });
      return res.json({ success: true, mfaRequired: true, mfaToken });
    }

    if (!user.mfa_setup_completed) {
        // First-time MFA setup is required. We generate a new secret and otpauth_url in one step
        // to ensure the QR code is perfectly in sync with the stored secret.
        const secret = speakeasy.generateSecret({ 
            name: `Process (${user.email})`,
            issuer: 'Process'
        });

        // Store the base32 secret
        user.mfa_secret = secret.base32;
        await user.save();
        
        // Generate the QR code directly from the otpauth_url provided by generateSecret
        const qrCode = await qrcode.toDataURL(secret.otpauth_url);

        const adminEmails = await adminEmailService.getAdminEmails();
        const isAdmin = adminEmails.includes(user.email);
        const mfaToken = jwt.sign({ userId: user._id, mfa: 'setup', isAdmin }, process.env.JWT_SECRET, {
            expiresIn: '15m' // Longer time for setup
        });

        return res.json({ success: true, mfaSetupRequired: true, qrCode, mfaToken });
    }
    // --- End MFA Logic ---

    // Generate full access token if MFA is not applicable
    logEvent(user._id, 'USER_LOGIN', 'SUCCESS', { ipAddress: req.ip });
    await checkLoginAnomaly(user, req.ip);
    const adminEmails = await adminEmailService.getAdminEmails();
    const isAdmin = adminEmails.includes(user.email);
    const accessToken = jwt.sign({ userId: user._id, mfa: 'verified', isAdmin }, process.env.JWT_SECRET, {
      expiresIn: '15m'
    });

    const refreshToken = crypto.randomBytes(40).toString('hex');
    const hashedRefreshToken = crypto.createHash('sha256').update(refreshToken).digest('hex');

    user.refreshTokens.push({ token: hashedRefreshToken, device: req.headers['user-agent'] });
    await user.save();

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    res.json({ success: true, accessToken, user: { id: user._id, email: user.email, name: user.name } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "An unexpected server error occurred." });
  }
});

// @route   POST /api/auth/mfa/verify
// @desc    Verify MFA code for login or setup
// @access  Private (requires mfaToken)
router.post('/mfa/verify', mfaLimiter, mfaAuth, async (req, res) => {
    try {
        const { mfaCode, trustDevice, useBackupCode } = req.body;
        const { userId, mfa } = req.user; // Decoded from mfaToken

        const user = await User.findById(userId).select('+backup_codes').select('+mfa_secret');
        if (!user || (!user.mfa_secret && !useBackupCode)) { // Allow backup code even if mfa_secret is somehow missing
            return res.status(400).json({ success: false, message: 'MFA not set up for this user.' });
        }

        let isValid = false;

        if (useBackupCode) {
            // Verification logic for backup codes
            if (!user.backup_codes || user.backup_codes.length === 0) {
                 return res.status(400).json({ success: false, message: 'No backup codes available for this user.' });
            }
            for (let i = 0; i < user.backup_codes.length; i++) {
                const isMatch = await bcrypt.compare(mfaCode, user.backup_codes[i]);
                if (isMatch) {
                    isValid = true;
                    user.backup_codes.splice(i, 1); // Invalidate used backup code
                    logEvent(userId, 'MFA_VERIFY_SUCCESS', 'SUCCESS', { ipAddress: req.ip, details: { usingBackupCode: true } });
                    await checkLoginAnomaly(await User.findById(userId), req.ip);
                    break;
                }
            }
        } else {
            // Verification logic for TOTP codes
            if (!user.mfa_secret) {
                return res.status(400).json({ success: false, message: 'MFA not set up for this user.' });
            }
            isValid = speakeasy.totp.verify({
                secret: user.mfa_secret,
                encoding: 'base32',
                token: mfaCode,
                window: 2 // 2 * 30s = 1-minute tolerance window
            });
        }

        if (!isValid) {
            logEvent(userId, 'MFA_VERIFY_FAILED', 'FAILURE', { ipAddress: req.ip });
            return res.status(401).json({ success: false, message: 'Invalid verification code' });
        }
        
        // --- Handle successful verification ---
        
        // If this was the setup verification
        if (mfa === 'setup') {
            user.mfa_enabled = true;
            user.mfa_setup_completed = true;

            // Generate plain-text codes to display to the user once.
            const plainTextBackupCodes = Array.from({ length: 10 }, () => crypto.randomBytes(4).toString('hex').toUpperCase());
            
            // Hash the codes before saving them to the database.
            user.backup_codes = await Promise.all(
                plainTextBackupCodes.map(code => bcrypt.hash(code, 10))
            );
            user.markModified('backup_codes'); // Ensure Mongoose detects the change to the array.
            
            // Generate tokens
            const adminEmails = await adminEmailService.getAdminEmails();
            const isAdmin = adminEmails.includes(user.email);
            const accessToken = jwt.sign({ userId: user._id, mfa: 'verified', isAdmin }, process.env.JWT_SECRET, {
                expiresIn: '15m'
            });
            const refreshToken = crypto.randomBytes(40).toString('hex');
            const hashedRefreshToken = crypto.createHash('sha256').update(refreshToken).digest('hex');
            user.refreshTokens.push({ token: hashedRefreshToken, device: req.headers['user-agent'] });
            
            await user.save();

            res.cookie('refreshToken', refreshToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict',
                maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
            });
            
            // Return the PLAIN TEXT backup codes to the user ONCE for them to save.
            return res.json({ success: true, setupComplete: true, backupCodes: plainTextBackupCodes, accessToken });
        }

        // Handle "Trust this device"
        if (trustDevice) {
            const deviceId = crypto.randomBytes(16).toString('hex');
            const hashedDeviceId = crypto.createHash('sha256').update(deviceId).digest('hex');
            const expires_at = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
            
            user.trusted_devices.push({ device_id: hashedDeviceId, expires_at });

            // Set the raw deviceId in a secure, httpOnly cookie
            res.cookie('device_id', deviceId, { 
                httpOnly: true, 
                secure: process.env.NODE_ENV === 'production', // Use secure cookies in production
                maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days in milliseconds
                sameSite: 'strict'
            });
        }

        // Issue final, full-access token
        const adminEmails = await adminEmailService.getAdminEmails();
        const isAdmin = adminEmails.includes(user.email);
        const accessToken = jwt.sign({ userId: user._id, mfa: 'verified', isAdmin }, process.env.JWT_SECRET, {
            expiresIn: '15m'
        });

        const refreshToken = crypto.randomBytes(40).toString('hex');
        const hashedRefreshToken = crypto.createHash('sha256').update(refreshToken).digest('hex');
        user.refreshTokens.push({ token: hashedRefreshToken, device: req.headers['user-agent'] });

        await user.save();

        res.cookie('refreshToken', refreshToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict',
          maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
        });

        res.json({ success: true, accessToken, user: { id: user._id, email: user.email, name: user.name } });

    } catch (error) {
        console.error('MFA verification error:', error);
        res.status(500).json({ success: false, message: 'An internal error occurred during MFA verification.' });
    }
});

// @route   POST /api/auth/mfa/reset-request
// @desc    Initiate a request to reset MFA authenticator
// @access  Public
router.post('/mfa/reset-request', forgotPasswordLimiter, async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({ success: false, message: 'email is required' });
        }

        const user = await User.findOne({ email });

        // If the user doesn't exist, we still send a success-like message 
        // to prevent email enumeration attacks.
        if (!user) {
            return res.json({ success: true, message: 'if your account exists, a reset link has been sent' });
        }

        // --- FIX: Always attempt to send the reset link if the user exists ---
        // This breaks the loop for users who are stuck in a bad MFA state.
        const rawToken = crypto.randomBytes(32).toString('hex');
        user.mfa_reset_token = crypto.createHash('sha256').update(rawToken).digest('hex');
        user.mfa_reset_expires = Date.now() + 10 * 60 * 1000; // 10 minutes

        await user.save();

        const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-mfa-confirm/${rawToken}`;

        try {
            // The sendEmail function will now be called, and we will see the diagnostic logs.
            await sendEmail({
                to: user.email,
                subject: 'Authenticator Reset Request',
                text: `A request was made to reset the authenticator for your account. Click the link to proceed: ${resetUrl}`,
                html: `<p>A request was made to reset the authenticator for your account. Click the link to proceed:</p><p><a href="${resetUrl}">Reset Authenticator</a></p>`
            });
            // If we get here, the email was sent successfully.
            res.json({ success: true, message: 'if your account exists and has mfa enabled, a reset link has been sent' });
        } catch (emailError) {
            console.error("❌ Failed to send MFA reset email:", emailError.message);
            // Return a more specific error to the client
            return res.status(500).json({ success: false, message: 'Could not send the reset email. Please check server logs.' });
        }

    } catch (error) {
        console.error('MFA reset request error:', error);
        res.status(500).json({ success: false, message: 'an internal server error occurred' });
    }
});

// @route   POST /api/auth/mfa/reset-confirm
// @desc    Confirm and execute the MFA reset
// @access  Public
router.post('/mfa/reset-confirm', async (req, res) => {
    try {
        const { token } = req.body;
        if (!token) {
            return res.status(400).json({ success: false, message: 'reset token is required' });
        }

        const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

        // First, try to find a user with a valid, non-expired token.
        const user = await User.findOne({
            mfa_reset_token: hashedToken,
            mfa_reset_expires: { $gt: Date.now() }
        });

        // If we found a user with a valid token, this is the happy path.
        if (user) {
            // Disable MFA
            user.mfa_enabled = false;
            user.mfa_secret = undefined;
            user.mfa_setup_completed = false;
            user.backup_codes = [];
            
            // Invalidate the reset token so it can't be used again
            user.mfa_reset_token = undefined;
            user.mfa_reset_expires = undefined;

            await user.save();

            return res.json({ success: true, message: 'your authenticator has been reset, you can now log in with your password' });
        }

        // --- Improved Error Handling ---
        // If the user wasn't found, it means the token is either invalid or expired.
        // We can check if a user with this token ever existed to provide a better error message.
        const expiredOrInvalidUser = await User.findOne({ mfa_reset_token: hashedToken });
        
        if (expiredOrInvalidUser) {
            // The token existed but is now expired or has been superseded by a new one.
            return res.status(400).json({ success: false, message: 'this reset link has expired, please request a new one' });
        } else {
            // The token is completely invalid.
            return res.status(400).json({ success: false, message: 'this reset link is invalid' });
        }

    } catch (error) {
        console.error('MFA reset confirm error:', error);
        res.status(500).json({ success: false, message: 'an internal server error occurred' });
    }
});

// @route   POST /api/auth/forgot-password
// @desc    Send password reset email
// @access  Public
router.post('/forgot-password', forgotPasswordLimiter, async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ success: false, message: 'Email is required.' });
  const user = await User.findOne({ email });
  if (!user) {
    // Do not reveal if email exists
    return res.json({ success: true, message: 'If that email is registered, a reset link has been sent.' });
  }
  // Generate raw token
  const rawToken = crypto.randomBytes(32).toString('hex');
  await user.setPasswordResetToken(rawToken);
  await user.save();
  // Send email with raw token
  const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password/${rawToken}`;
  
  await sendEmail({
    to: user.email,
    subject: 'Password Reset',
    text: `A password reset has been requested for your Process account. Click the link to reset your password: ${resetUrl}`,
    html: `<p>A password reset has been requested for your Process account. Click the link to reset your password.</p><p><a href="${resetUrl}">Reset Password</a></p>`
  });
  res.json({ success: true, message: 'If that email is registered, a reset link has been sent.' });
});

// @route   GET /api/auth/reset-password/:token
// @desc    Verify reset token
// @access  Public
router.get('/reset-password/:token', async (req, res) => {
  const { token } = req.params;
  const user = await User.findOne({
    resetPasswordToken: token,
    resetPasswordExpires: { $gt: Date.now() }
  });
  if (!user) {
    return res.status(400).json({ success: false, message: 'Invalid or expired token.' });
  }
  res.json({ success: true, message: 'Token valid.' });
});

// @route   POST /api/auth/reset-password
// @desc    Reset password
// @access  Public
router.post('/reset-password', async (req, res) => {
    try {
        const { token, password } = req.body;
        if (!token || !password) {
            return res.status(400).json({ success: false, message: 'token and new password are required' });
        }

        // Hash the incoming token so it can be matched with the stored hashed token
        const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

        // Find the user with the matching hashed token that has not expired
        const user = await User.findOne({
            resetPasswordToken: hashedToken,
            resetPasswordExpires: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).json({ success: false, message: 'password reset token is invalid or has expired' });
        }

        // Set the new password. The pre-save hook in the User model will hash it.
        user.password = password;
        // Clear the reset token fields
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;
        // The forced reset is complete
        user.passwordResetRequired = false;
        
        await user.save();
        
        logEvent(user._id, 'USER_PASSWORD_RESET', 'SUCCESS', { ipAddress: req.ip });

        res.json({ success: true, message: 'password has been reset successfully' });

    } catch (error) {
        console.error('Password reset error:', error);
        // Check for validation errors from the User model
        if (error.name === 'ValidationError') {
            return res.status(400).json({ success: false, message: error.message });
        }
        res.status(500).json({ success: false, message: 'an internal server error occurred' });
    }
});

// @route   POST /api/auth/refresh-token
// @desc    Get a new access token using a refresh token
// @access  Public (access controlled by refresh token cookie)
router.post('/refresh-token', async (req, res) => {
  const { refreshToken } = req.cookies;
  if (!refreshToken) {
    return res.status(401).json({ success: false, message: 'Refresh token not found.' });
  }

  try {
    const hashedRefreshToken = crypto.createHash('sha256').update(refreshToken).digest('hex');

    const user = await User.findOne({ 
      'refreshTokens.token': hashedRefreshToken 
    }).select('+refreshTokens');

    if (!user) {
      // If the refresh token is not found, it might have been stolen.
      // For security, we can clear the cookie.
      res.clearCookie('refreshToken');
      return res.status(403).json({ success: false, message: 'Invalid refresh token.' });
    }

    // Token Rotation
    // Remove the old token
    user.refreshTokens = user.refreshTokens.filter(rt => rt.token !== hashedRefreshToken);

    // Generate new tokens
    const adminEmails = await adminEmailService.getAdminEmails();
    const isAdmin = adminEmails.includes(user.email);
    const newAccessToken = jwt.sign({ userId: user._id, mfa: 'verified', isAdmin }, process.env.JWT_SECRET, {
      expiresIn: '15m'
    });
    const newRefreshToken = crypto.randomBytes(40).toString('hex');
    const newHashedRefreshToken = crypto.createHash('sha256').update(newRefreshToken).digest('hex');

    // Add the new refresh token
    user.refreshTokens.push({ token: newHashedRefreshToken, device: req.headers['user-agent'], lastUsed: new Date() });
    
    await user.save();

    // Send the new refresh token in a cookie
    res.cookie('refreshToken', newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    res.json({ success: true, accessToken: newAccessToken });

  } catch (error) {
    console.error('Refresh token error:', error);
    res.status(500).json({ success: false, message: 'Internal server error.' });
  }
});

// @route   POST /api/auth/logout
// @desc    Logout user by invalidating refresh token
// @access  Private (requires auth to get user id)
router.post('/logout', auth, async (req, res) => {
    try {
        const { refreshToken } = req.cookies;
        if (refreshToken) {
            const hashedRefreshToken = crypto.createHash('sha256').update(refreshToken).digest('hex');
            
            // Remove the specific refresh token from the user's document
            await User.updateOne(
                { _id: req.user.userId },
                { $pull: { refreshTokens: { token: hashedRefreshToken } } }
            );
        }
        
        logEvent(req.user.userId, 'USER_LOGOUT', 'SUCCESS', { ipAddress: req.ip });

        res.clearCookie('refreshToken');
        res.clearCookie('device_id'); // Also clear trusted device cookie
        res.json({ success: true, message: 'Logged out successfully' });
    } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

// @route   DELETE /api/auth/account
// @desc    Delete user account and all associated data
// @access  Private
router.delete('/account', auth, async (req, res) => {
    try {
        const { password } = req.body;
        const userId = req.user.userId;

        if (!password) {
            return res.status(400).json({ success: false, message: 'Password is required to delete your account.' });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }

        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            logEvent(userId, 'ACCOUNT_DELETED', 'FAILURE', { ipAddress: req.ip, details: { reason: 'Invalid password' } });
            return res.status(401).json({ success: false, message: 'Invalid password.' });
        }

        // --- Cascade Delete ---
        // 1. Delete all user's messages
        await mongoose.model('Message').deleteMany({ userId });
        // 2. Delete all user's conversations
        await mongoose.model('Conversation').deleteMany({ userId });
        // 3. Delete all user's audit logs
        await mongoose.model('AuditLog').deleteMany({ userId });
        // 4. Delete the user
        await user.remove();

        logEvent(userId, 'ACCOUNT_DELETED', 'SUCCESS', { ipAddress: req.ip });

        res.clearCookie('refreshToken');
        res.clearCookie('device_id');
        res.json({ success: true, message: 'Your account and all associated data have been permanently deleted.' });

    } catch (error) {
        console.error('Account deletion error:', error);
        res.status(500).json({ success: false, message: 'An internal server error occurred during account deletion.' });
    }
});

// @route   GET /api/auth/public-key
// @desc    Get the server's public key for encryption
// @access  Private
router.get('/public-key', auth, (req, res) => {
  try {
    const publicKey = keyService.getPublicKey();
    res.json({ publicKey });
  } catch (error) {
    console.error('Error fetching public key:', error);
    res.status(500).json({ error: 'Could not retrieve server key.' });
  }
});

module.exports = router; 