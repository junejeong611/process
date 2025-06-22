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
  max: 200, // Limit each IP to 200 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many requests from this IP, please try again after 15 minutes.',
});

// Stricter rate limiter for authenticated users.
// This helps prevent a single user from overwhelming the system.
const userLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 1000, // Limit each user to 1000 requests per hour
  keyGenerator,
  standardHeaders: true,
  legacyHeaders: false,
  message: 'You have exceeded your request limit. Please try again later.',
});


// Very strict rate limiter for expensive AI-related calls.
// This is critical for controlling costs and preventing abuse of the AI services.
const aiCallLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 10, // Limit each user to 10 AI calls per minute
  keyGenerator,
  standardHeaders: true,
  legacyHeaders: false,
  message: 'You have made too many AI requests in a short period. Please wait a moment before trying again.',
});

module.exports = {
  apiLimiter,
  userLimiter,
  aiCallLimiter,
}; 