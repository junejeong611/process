const rateLimit = require('express-rate-limit');

// Define a key generator for user-based rate limiting.
// It falls back to the IP address if the user is not authenticated.
const keyGenerator = (req) => {
  if (req.user && req.user._id) {
    return req.user._id;
  }
  return req.ip;
};

// General API rate limiter for all requests.
// This is a broad protection against general high-traffic abuse.
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 2000, // Increased limit for local development
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many requests from this IP, please try again after 15 minutes.',
});

// Stricter rate limiter for authenticated users.
// This helps prevent a single user from overwhelming the system.
const userLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10000, // Increased limit for local development
  keyGenerator,
  standardHeaders: true,
  legacyHeaders: false,
  message: 'You have exceeded your request limit. Please try again later.',
});


// Very strict rate limiter for expensive AI-related calls.
// This is critical for controlling costs and preventing abuse of the AI services.
const aiCallLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100, // Increased limit for local development
  keyGenerator,
  standardHeaders: true,
  legacyHeaders: false,
  message: 'You have made too many AI requests in a short period. Please wait a moment before trying again.',
});

// Rate limiter for login attempts.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 failed login attempts per windowMs
  message: { success: false, message: 'Too many login attempts from this IP. Please try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Only count failed attempts
});

// Rate limiter for MFA verification.
const mfaLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 5, // Limit each IP to 5 verification attempts per windowMs
  message: { success: false, message: 'Too many MFA attempts. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiter for forgot password endpoint.
const forgotPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 requests per windowMs
  message: { success: false, message: 'Too many password reset requests. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = {
  apiLimiter,
  userLimiter,
  aiCallLimiter,
  loginLimiter,
  mfaLimiter,
  forgotPasswordLimiter,
}; 