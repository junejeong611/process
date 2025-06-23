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

module.exports = router; 