const jwt = require('jsonwebtoken');

const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'Authentication token is missing.' });
    }

    // Decode the token and attach the payload (which includes userId and mfa status) to req.user
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    if (!decoded.userId) {
        return res.status(401).json({ error: 'Invalid authentication token.' });
    }

    req.user = decoded; // Attach the full decoded payload
    req.token = token;
    
    next();
  } catch (error) {
    res.status(401).json({ error: 'Please authenticate.' });
  }
};

module.exports = auth; 