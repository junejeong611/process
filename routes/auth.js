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

const router = express.Router();

// Rate limiter for login to prevent brute-force attacks
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // limit each IP to 10 login requests per windowMs
  message: { success: false, message: 'Too many login attempts from this IP, please try again after 15 minutes' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiter for MFA verification
const mfaLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 5, // limit each IP to 5 verification attempts per windowMs
  message: { success: false, message: 'Too many MFA attempts. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiter for forgot password endpoint
const forgotPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs
  message: { success: false, message: 'Too many password reset requests. Please try again later.' }
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

    // Find user and select the mfa_secret field
    const user = await User.findOne({ email }).select('+mfa_secret');
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      // Consider adding a delay to make timing attacks harder
      await new Promise(resolve => setTimeout(resolve, 500));
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    // --- Check for Trusted Device ---
    const { device_id } = req.cookies;
    if (device_id) {
        const trustedDevice = user.trusted_devices.find(d => d.device_id === device_id && d.expires_at > new Date());
        if (trustedDevice) {
            // Device is trusted, bypass MFA and issue full token
            const token = jwt.sign({ userId: user._id, mfa: 'verified' }, process.env.JWT_SECRET, {
                expiresIn: '7d'
            });
            return res.json({ success: true, token, user: { id: user._id, email: user.email, name: user.name } });
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
    const token = jwt.sign({ userId: user._id, mfa: 'verified' }, process.env.JWT_SECRET, {
      expiresIn: '7d'
    });

    res.json({ success: true, token, user: { id: user._id, email: user.email, name: user.name } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "An unexpected server error occurred." });
  }
});

// @route   POST /api/auth/mfa/verify
// @desc    Verify MFA code for login or setup
// @access  Private (requires mfaToken)
router.post('/mfa/verify', mfaLimiter, auth, async (req, res) => {
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
                    break;
                }
            }
        }

        if (!isValid) {
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
            await user.save();
            
            // Issue final, full-access token upon successful setup
            const token = jwt.sign({ userId: user._id, mfa: 'verified' }, process.env.JWT_SECRET, {
                expiresIn: '7d'
            });

            // Return backup codes to the user ONCE, along with their new token
            return res.json({ success: true, setupComplete: true, backupCodes, token });
        }

        // Handle "Trust this device"
        if (trustDevice) {
            const deviceId = crypto.randomBytes(16).toString('hex');
            const expires_at = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
            
            user.trusted_devices.push({ device_id: deviceId, expires_at });
            await user.save();

            // Set the deviceId in a secure, httpOnly cookie
            res.cookie('device_id', deviceId, { 
                httpOnly: true, 
                secure: process.env.NODE_ENV === 'production', // Use secure cookies in production
                maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days in milliseconds
                sameSite: 'strict'
            });
        }

        // Issue final, full-access token
        const token = jwt.sign({ userId: user._id, mfa: 'verified' }, process.env.JWT_SECRET, {
            expiresIn: '7d'
        });

        res.json({ success: true, token, user: { id: user._id, email: user.email, name: user.name } });

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

module.exports = router; 