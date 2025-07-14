const jwt = require('jsonwebtoken');

const auth = async (req, res, next) => {
  try {
    // Accept both Authorization and x-auth-token headers
    let token = req.header('Authorization');
    if (token && token.startsWith('Bearer ')) {
      token = token.replace('Bearer ', '');
    } else {
      token = req.header('x-auth-token');
    }

    console.log('JWT_SECRET:', process.env.JWT_SECRET ? 'SET' : 'NOT SET');
    console.log('Authorization header:', req.header('Authorization'));
    console.log('x-auth-token header:', req.header('x-auth-token'));
    console.log('Extracted token:', token);

    if (!token) {
      console.warn('No token provided');
      return res.status(401).json({ error: 'Authentication token is missing.' });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log('Decoded JWT payload:', decoded);
    } catch (verifyError) {
      console.error('JWT verification failed:', verifyError.message);
      return res.status(401).json({ error: 'Invalid or expired authentication token.' });
    }

    if (!decoded.userId) {
      console.warn('Decoded token missing userId:', decoded);
      return res.status(401).json({ error: 'Invalid authentication token.' });
    }

    req.user = decoded;
    req.token = token;

    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(401).json({ error: 'Please authenticate.' });
  }
};

module.exports = auth; 