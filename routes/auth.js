const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const crypto = require('crypto');
const { sendEmail } = require('../utils/email');
const speakeasy = require('speakeasy');
const qrcode = require('qrcode');
const auth = require('../middleware/auth'); // Assuming you have this middleware
const { logEvent } = require('../services/auditLogService');
const mongoose = require('mongoose');
const { checkLoginAnomaly, handleFailedLogin } = require('../services/anomalyService');
const keyService = require('../services/keyService');
const { authLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

// @route   POST /api/auth/register
// @desc    Register new user
// @access  Public
router.post('/register', authLimiter, async (req, res) => {
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
router.post('/login', authLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user and select the mfa_secret field
    const user = await User.findOne({ email }).select('+mfa_secret').select('+refreshTokens');
    if (!user) {
      logEvent(null, 'USER_LOGIN_FAILED', 'FAILURE', { ipAddress: req.ip, details: { email } });
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    // Check for account lock
    if (user.isLocked && user.lockExpiresAt > new Date()) {
      return res.status(403).json({ success: false, message: `Account is temporarily locked. Please try again after ${Math.ceil((user.lockExpiresAt - Date.now()) / 60000)} minutes.` });
    }

    // Check password
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
            const accessToken = jwt.sign({ userId: user._id, mfa: 'verified' }, process.env.JWT_SECRET, {
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

        const mfaToken = jwt.sign({ userId: user._id, mfa: 'setup' }, process.env.JWT_SECRET, {
            expiresIn: '15m' // Longer time for setup
        });

        return res.json({ success: true, mfaSetupRequired: true, qrCode, mfaToken });
    }
    // --- End MFA Logic ---

    // Generate full access token if MFA is not applicable
    logEvent(user._id, 'USER_LOGIN', 'SUCCESS', { ipAddress: req.ip });
    await checkLoginAnomaly(user, req.ip);
    const accessToken = jwt.sign({ userId: user._id, mfa: 'verified' }, process.env.JWT_SECRET, {
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
router.post('/mfa/verify', authLimiter, auth, async (req, res) => {
    try {
        const { mfaCode, trustDevice } = req.body;
        const { userId, mfa } = req.user; // Decoded from mfaToken

        if (mfa !== 'pending' && mfa !== 'setup') {
            return res.status(403).json({ success: false, message: 'Invalid token type for MFA verification' });
        }

        const user = await User.findById(userId).select('+backup_codes').select('+mfa_secret');
        if (!user || !user.mfa_secret) {
            return res.status(400).json({ success: false, message: 'MFA not set up for this user.' });
        }

        let isValid = false;

        // 1. Check TOTP code
        isValid = speakeasy.totp.verify({
            secret: user.mfa_secret,
            encoding: 'base32',
            token: mfaCode,
            window: 2 // Reset to 2 steps (60s) to account for clock drift
        });

        // 2. If TOTP is invalid, check backup codes
        if (!isValid) {
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

            // Generate and store hashed backup codes
            const backupCodes = Array.from({ length: 10 }, () => crypto.randomBytes(4).toString('hex').toUpperCase());
            user.backup_codes = backupCodes; // Pre-save hook will hash these
            
            // Generate tokens
            const accessToken = jwt.sign({ userId: user._id, mfa: 'verified' }, process.env.JWT_SECRET, {
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
            
            // Return backup codes to the user ONCE, along with their new token
            return res.json({ success: true, setupComplete: true, backupCodes, accessToken });
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
        const accessToken = jwt.sign({ userId: user._id, mfa: 'verified' }, process.env.JWT_SECRET, {
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
router.post('/mfa/reset-request', authLimiter, async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({ success: false, message: 'email is required' });
        }

        const user = await User.findOne({ email });
        // Always return a success-like message to prevent user enumeration
        if (!user || !user.mfa_enabled) {
            return res.json({ success: true, message: 'if your account exists and has mfa enabled, a reset link has been sent' });
        }

        const rawToken = crypto.randomBytes(32).toString('hex');
        user.mfa_reset_token = crypto.createHash('sha256').update(rawToken).digest('hex');
        user.mfa_reset_expires = Date.now() + 10 * 60 * 1000; // 10 minutes

        await user.save();

        const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-mfa-confirm/${rawToken}`;

        await sendEmail({
            to: user.email,
            subject: 'Authenticator Reset Request',
            text: `a request was made to reset the authenticator for your account. click the link to proceed: ${resetUrl}`,
            html: `<p>a request was made to reset the authenticator for your account. click the link to proceed:</p><p><a href="${resetUrl}">reset authenticator</a></p>`
        });

        res.json({ success: true, message: 'if your account exists and has mfa enabled, a reset link has been sent' });

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

        const user = await User.findOne({
            mfa_reset_token: hashedToken,
            mfa_reset_expires: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).json({ success: false, message: 'token is invalid or has expired' });
        }

        // Disable MFA
        user.mfa_enabled = false;
        user.mfa_secret = undefined;
        user.mfa_setup_completed = false; // Requires setup again
        user.backup_codes = []; // Clear backup codes
        
        // Invalidate the reset token
        user.mfa_reset_token = undefined;
        user.mfa_reset_expires = undefined;

        await user.save();

        res.json({ success: true, message: 'your authenticator has been reset. you can now log in with your password.' });

    } catch (error) {
        console.error('MFA reset confirm error:', error);
        res.status(500).json({ success: false, message: 'an internal server error occurred' });
    }
});

// @route   POST /api/auth/forgot-password
// @desc    Send password reset email
// @access  Public
router.post('/forgot-password', authLimiter, async (req, res) => {
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
  const { token, password } = req.body;
  if (!token || !password) return res.status(400).json({ success: false, message: 'Token and new password are required.' });
  // Find user with unexpired token
  const user = await User.findOne({ resetPasswordExpires: { $gt: Date.now() } }).select('+resetPasswordToken');
  if (!user) {
    return res.status(400).json({ success: false, message: 'Invalid or expired token.' });
  }
  // Compare provided token with hashed token
  const isMatch = await bcrypt.compare(token, user.resetPasswordToken);
  if (!isMatch) {
    return res.status(400).json({ success: false, message: 'Invalid or expired token.' });
  }
  user.password = password;
  user.clearPasswordResetToken();
  await user.save();
  res.json({ success: true, message: 'Password has been reset.' });
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
    const newAccessToken = jwt.sign({ userId: user._id, mfa: 'verified' }, process.env.JWT_SECRET, {
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