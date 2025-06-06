const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const crypto = require('crypto');
const rateLimit = require('express-rate-limit');
const { sendEmail } = require('../utils/email');

const router = express.Router();

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
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    // Generate token
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
      expiresIn: '7d'
    });

    res.json({ success: true, token, user: { id: user._id, email: user.email, name: user.name } });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
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
    text: `You requested a password reset. Click the link to reset: ${resetUrl}`,
    html: `<p>You requested a password reset.</p><p><a href="${resetUrl}">Reset Password</a></p>`
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