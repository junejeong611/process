/**
 * Rate Limiting Middleware Configuration
 * 
 * This module provides a comprehensive rate limiting system for the Express.js application.
 * It includes different rate limiters for various types of endpoints to prevent abuse
 * and ensure fair usage of resources.
 * 
 * Rate Limiters:
 * - apiLimiter: General protection for all API endpoints (200 requests per 15 minutes)
 * - authLimiter: Authentication endpoints (5 requests per 10 minutes)
 * - chatLimiter: Chat/AI conversation endpoints (30 requests per 5 minutes)
 * - userLimiter: User-specific limits (1000 requests per hour)
 * - aiCallLimiter: Expensive AI operations (10 requests per minute)
 * - voiceLimiter: Voice processing endpoints (20 requests per 5 minutes)
 * - uploadLimiter: File upload endpoints (10 requests per 10 minutes)
 * 
 * Usage:
 * 1. Import the desired limiter: const { authLimiter, chatLimiter } = require('./middleware/rateLimiter');
 * 2. Apply to routes: router.post('/login', authLimiter, async (req, res) => { ... });
 * 3. Apply to all routes in a router: router.use(chatLimiter);
 * 
 * Features:
 * - Custom error messages with retry-after headers
 * - User-based rate limiting when authenticated
 * - IP-based fallback for unauthenticated requests
 * - Standard HTTP rate limit headers
 * - JSON error responses with consistent format
 */

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
  message: {
    error: 'Too many requests from this IP, please try again after 15 minutes.',
    status: 429
  },
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      message: 'Too many requests from this IP, please try again after 15 minutes.',
      retryAfter: Math.ceil(req.rateLimit.resetTime / 1000)
    });
  }
});

// Authentication rate limiter for login and signup endpoints
// Prevents brute force attacks and account enumeration
const authLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 5, // Limit each IP to 5 auth attempts per 10 minutes
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many authentication attempts. Please try again after 10 minutes.',
    status: 429
  },
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      message: 'Too many authentication attempts. Please try again after 10 minutes.',
      retryAfter: Math.ceil(req.rateLimit.resetTime / 1000)
    });
  }
});

// Chat rate limiter for AI conversation endpoints
// Controls usage of expensive AI services
const chatLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 30, // Limit each user to 30 chat requests per 5 minutes
  keyGenerator,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many chat requests. Please wait before sending another message.',
    status: 429
  },
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      message: 'Too many chat requests. Please wait before sending another message.',
      retryAfter: Math.ceil(req.rateLimit.resetTime / 1000)
    });
  }
});

// Stricter rate limiter for authenticated users.
// This helps prevent a single user from overwhelming the system.
const userLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 1000, // Limit each user to 1000 requests per hour
  keyGenerator,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'You have exceeded your request limit. Please try again later.',
    status: 429
  },
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      message: 'You have exceeded your request limit. Please try again later.',
      retryAfter: Math.ceil(req.rateLimit.resetTime / 1000)
    });
  }
});

// Very strict rate limiter for expensive AI-related calls.
// This is critical for controlling costs and preventing abuse of the AI services.
const aiCallLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 10, // Limit each user to 10 AI calls per minute
  keyGenerator,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'You have made too many AI requests in a short period. Please wait a moment before trying again.',
    status: 429
  },
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      message: 'You have made too many AI requests in a short period. Please wait a moment before trying again.',
      retryAfter: Math.ceil(req.rateLimit.resetTime / 1000)
    });
  }
});

// Voice/audio processing rate limiter
// Controls usage of voice transcription and synthesis services
const voiceLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 20, // Limit each user to 20 voice requests per 5 minutes
  keyGenerator,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many voice requests. Please wait before trying again.',
    status: 429
  },
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      message: 'Too many voice requests. Please wait before trying again.',
      retryAfter: Math.ceil(req.rateLimit.resetTime / 1000)
    });
  }
});

// File upload rate limiter
// Prevents abuse of file upload endpoints
const uploadLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 10, // Limit each user to 10 uploads per 10 minutes
  keyGenerator,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many file uploads. Please wait before uploading more files.',
    status: 429
  },
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      message: 'Too many file uploads. Please wait before uploading more files.',
      retryAfter: Math.ceil(req.rateLimit.resetTime / 1000)
    });
  }
});

module.exports = {
  apiLimiter,
  authLimiter,
  chatLimiter,
  userLimiter,
  aiCallLimiter,
  voiceLimiter,
  uploadLimiter
}; 