const jwt = require('jsonwebtoken');

const auth = async (req, res, next) => {
  try {
    console.log('DEBUG: Incoming Authorization header:', req.header('Authorization'));
    const token = req.header('Authorization')?.replace('Bearer ', '');
    console.log('DEBUG: Extracted token:', token);
    
    if (!token) {
      console.log('DEBUG: No token found in Authorization header.');
      return res.status(401).json({ error: 'Authentication token is missing.' });
    }

    // Decode the token and attach the payload (which includes userId and mfa status) to req.user
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log('DEBUG: Decoded JWT payload:', decoded);
    } catch (jwtErr) {
      console.log('DEBUG: JWT verification failed:', jwtErr);
      return res.status(401).json({ error: 'Invalid authentication token.' });
    }
    
    if (!decoded.userId) {
        console.log('DEBUG: Decoded token missing userId:', decoded);
        return res.status(401).json({ error: 'Invalid authentication token.' });
    }

    // Restructure the payload to match what the backend expects (req.user._id)
    req.user = {
      userId: decoded.userId,
      isMfaVerified: decoded.isMfaVerified,
      isAdmin: decoded.isAdmin
    };
    req.token = token;
    console.log('DEBUG: req.user set to:', req.user);
    
    next();
  } catch (error) {
    console.log('DEBUG: auth middleware caught error:', error);
    res.status(401).json({ error: 'Please authenticate.' });
  }
};

module.exports = auth; 