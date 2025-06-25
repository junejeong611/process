const adminEmailService = require('../services/adminEmailService');
const User = require('../models/User');

const requireAdmin = async (req, res, next) => {
  try {
    if (!req.user || !req.user.userId) {
      return res.status(401).json({ error: 'Authentication required.' });
    }

    console.log('DEBUG: requireAdmin - userId from JWT:', req.user.userId);
    console.log('DEBUG: requireAdmin - ENCRYPTION_SECRET present:', !!process.env.ENCRYPTION_SECRET, 'length:', process.env.ENCRYPTION_SECRET ? process.env.ENCRYPTION_SECRET.length : 0);

    let user;
    try {
      user = await User.findByIdWithDebug(req.user.userId);
      console.log('DEBUG: requireAdmin - user lookup result:', user);
      if (!user) {
        console.log('DEBUG: requireAdmin - User not found for id:', req.user.userId);
        return res.status(404).json({ error: 'User not found.' });
      }
    } catch (err) {
      console.error('DEBUG: requireAdmin - Error during user lookup:', err);
      return res.status(500).json({ error: 'Error during user lookup.' });
    }

    const adminEmails = await adminEmailService.getAdminEmails();
    console.log('DEBUG: requireAdmin - user.email (decrypted):', user.email);
    console.log('DEBUG: requireAdmin - adminEmails:', adminEmails);
    
    if (!adminEmails.includes(user.email)) {
      console.log('DEBUG: requireAdmin - user.email not in adminEmails');
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