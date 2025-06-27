const jwt = require('jsonwebtoken');

const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'Authentication token is missing.' });
    }

    // Decode the token and attach the payload (which includes userId and mfa status) to req.user
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (jwtErr) {
      return res.status(401).json({ error: 'Invalid authentication token.' });
    }
    
    if (!decoded.userId) {
        return res.status(401).json({ error: 'Invalid authentication token.' });
    }

    // Restructure the payload to match what the backend expects (req.user._id)
    req.user = {
      userId: decoded.userId,
      isMfaVerified: decoded.isMfaVerified,
      isAdmin: decoded.isAdmin
    };
    req.token = token;
    
    next();
  } catch (error) {
    res.status(401).json({ error: 'Please authenticate.' });
  }
};

module.exports = auth; 