const adminEmailService = require('../services/adminEmailService');
const User = require('../models/User');

const requireAdmin = async (req, res, next) => {
  try {
    if (!req.user || !req.user.userId) {
      return res.status(401).json({ error: 'Authentication required.' });
    }

    let user;
    try {
      user = await User.findByIdWithDebug(req.user.userId);
      if (!user) {
        return res.status(404).json({ error: 'User not found.' });
      }
    } catch (err) {
      console.error('DEBUG: requireAdmin - Error during user lookup:', err);
      return res.status(500).json({ error: 'Error during user lookup.' });
    }

    const adminEmails = await adminEmailService.getAdminEmails();
    
    if (!adminEmails.includes(user.email)) {
      return res.status(403).json({ error: 'Admin access required' });
    }
    
    // For convenience, attach the full user object to the request
    // so downstream admin routes don't have to fetch it again.
    req.user = user;

    next();
  } catch (error) {
    console.error('Admin check failed:', error);
    return res.status(500).json({ error: 'Internal server error during admin check.' });
  }
};

module.exports = requireAdmin; 