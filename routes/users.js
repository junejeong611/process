const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { deleteUserAccount } = require('../services/userService');

/**
 * @route   DELETE /api/users/me
 * @desc    Delete user account
 * @access  Private
 */
router.delete('/me', auth, async (req, res) => {
  try {
    await deleteUserAccount(req.user.id);
    res.json({ message: 'Your account has been permanently deleted.' });
  } catch (error) {
    console.error('Account deletion error:', error);
    res.status(500).send('Server error');
  }
});

/**
 * @route   POST /api/users/change-password
 * @desc    Change password for authenticated user
 * @access  Private
 */
router.post('/change-password', auth, async (req, res) => {
  try {
    const user = req.user;
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'Current and new password are required.' });
    }
    // Fetch user from DB
    const dbUser = await require('../models/User').findById(user.userId);
    if (!dbUser) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }
    // Check current password
    const isMatch = await dbUser.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Current password is incorrect.' });
    }
    // Update password
    dbUser.password = newPassword;
    await dbUser.save();
    res.json({ success: true, message: 'Password updated successfully.' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

/**
 * @route   GET /api/users/me
 * @desc    Get current authenticated user's info
 * @access  Private
 */
router.get('/me', auth, async (req, res) => {
  try {
    const dbUser = await require('../models/User').findById(req.user.userId).select('-password');
    if (!dbUser) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }
    res.json({ success: true, user: dbUser });
  } catch (error) {
    console.error('Get user info error:', error);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

module.exports = router; 