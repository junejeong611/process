const jwt = require('jsonwebtoken');

const mfaAuth = (req, res, next) => {
    const authHeader = req.header('Authorization');

    if (!authHeader) {
        return res.status(401).json({ message: 'Authorization header missing' });
    }

    const token = authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ message: 'Token missing from header' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Check if it's a temporary MFA token
        if (decoded.mfa !== 'pending' && decoded.mfa !== 'setup') {
            return res.status(401).json({ message: 'Invalid token type for this operation' });
        }
        
        req.user = {
            userId: decoded.userId,
            isMfaVerified: decoded.isMfaVerified || decoded.mfa, // fallback for legacy tokens
            isAdmin: decoded.isAdmin
        };
        console.log('DEBUG: req.user set to (mfa):', req.user);
        next();
    } catch (err) {
        res.status(401).json({ message: 'Token is not valid' });
    }
};

module.exports = mfaAuth; 