/**
 * Input Validation & Sanitization Middleware
 * 
 * This module provides comprehensive validation and sanitization for all API endpoints
 * using express-validator. It includes validation rules for authentication, chat,
 * and other routes with proper error handling and sanitization.
 */

const { body, param, query, validationResult } = require('express-validator');

/**
 * Custom error formatter for validation errors
 */
const formatValidationErrors = (errors) => {
  return errors.map(error => ({
    field: error.path,
    message: error.msg,
    value: error.value
  }));
};

/**
 * Middleware to handle validation errors
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: formatValidationErrors(errors.array())
    });
  }
  next();
};

/**
 * Authentication Validation Rules
 */

// Register validation
const registerValidation = [
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail()
    .trim(),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character')
    .trim(),
  body('name')
    .isLength({ min: 2, max: 50 })
    .withMessage('Name must be between 2 and 50 characters')
    .matches(/^[a-zA-Z\s'-]+$/)
    .withMessage('Name can only contain letters, spaces, hyphens, and apostrophes')
    .trim()
    .escape(),
  handleValidationErrors
];

// Login validation
const loginValidation = [
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail()
    .trim(),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
    .trim(),
  handleValidationErrors
];

// MFA validation
const mfaValidation = [
  body('mfaCode')
    .isLength({ min: 6, max: 6 })
    .withMessage('MFA code must be exactly 6 digits')
    .isNumeric()
    .withMessage('MFA code must contain only numbers')
    .trim(),
  body('trustDevice')
    .optional()
    .isBoolean()
    .withMessage('trustDevice must be a boolean value'),
  handleValidationErrors
];

// Forgot password validation
const forgotPasswordValidation = [
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail()
    .trim(),
  handleValidationErrors
];

// Reset password validation
const resetPasswordValidation = [
  body('token')
    .notEmpty()
    .withMessage('Reset token is required')
    .trim(),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character')
    .trim(),
  handleValidationErrors
];

/**
 * Chat Validation Rules
 */

// Send message validation
const sendMessageValidation = [
  body('content')
    .notEmpty()
    .withMessage('Message content cannot be empty')
    .isLength({ min: 1, max: 5000 })
    .withMessage('Message must be between 1 and 5000 characters')
    .trim()
    .escape(),
  body('conversationId')
    .isMongoId()
    .withMessage('Invalid conversation ID format'),
  handleValidationErrors
];

// Create conversation validation
const createConversationValidation = [
  body('title')
    .optional()
    .isLength({ min: 1, max: 100 })
    .withMessage('Title must be between 1 and 100 characters')
    .trim()
    .escape(),
  body('type')
    .optional()
    .isIn(['text', 'voice'])
    .withMessage('Type must be either "text" or "voice"'),
  handleValidationErrors
];

// Get messages validation
const getMessagesValidation = [
  param('conversationId')
    .isMongoId()
    .withMessage('Invalid conversation ID format'),
  handleValidationErrors
];

/**
 * User Profile Validation Rules
 */

// Update profile validation
const updateProfileValidation = [
  body('name')
    .optional()
    .isLength({ min: 2, max: 50 })
    .withMessage('Name must be between 2 and 50 characters')
    .matches(/^[a-zA-Z\s'-]+$/)
    .withMessage('Name can only contain letters, spaces, hyphens, and apostrophes')
    .trim()
    .escape(),
  body('email')
    .optional()
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail()
    .trim(),
  handleValidationErrors
];

// Change password validation
const changePasswordValidation = [
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required')
    .trim(),
  body('newPassword')
    .isLength({ min: 8 })
    .withMessage('New password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('New password must contain at least one uppercase letter, one lowercase letter, one number, and one special character')
    .trim(),
  handleValidationErrors
];

/**
 * Subscription Validation Rules
 */

// Create checkout session validation
const createCheckoutValidation = [
  body('priceId')
    .notEmpty()
    .withMessage('Price ID is required')
    .trim(),
  body('successUrl')
    .optional()
    .isURL()
    .withMessage('Success URL must be a valid URL'),
  body('cancelUrl')
    .optional()
    .isURL()
    .withMessage('Cancel URL must be a valid URL'),
  handleValidationErrors
];

/**
 * Voice/Audio Validation Rules
 */

// Voice recording validation
const voiceRecordingValidation = [
  body('audioData')
    .notEmpty()
    .withMessage('Audio data is required'),
  body('format')
    .optional()
    .isIn(['wav', 'mp3', 'webm'])
    .withMessage('Audio format must be wav, mp3, or webm'),
  handleValidationErrors
];

/**
 * General Validation Rules
 */

// Pagination validation
const paginationValidation = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  handleValidationErrors
];

// ID validation for MongoDB ObjectIds
const idValidation = [
  param('id')
    .isMongoId()
    .withMessage('Invalid ID format'),
  handleValidationErrors
];

/**
 * Sanitization Middleware
 */

// General sanitization for all requests
const sanitizeRequest = [
  body('*').trim().escape(),
  query('*').trim().escape(),
  param('*').trim().escape()
];

/**
 * Export all validation rules
 */
module.exports = {
  // Authentication validations
  registerValidation,
  loginValidation,
  mfaValidation,
  forgotPasswordValidation,
  resetPasswordValidation,
  
  // Chat validations
  sendMessageValidation,
  createConversationValidation,
  getMessagesValidation,
  
  // User profile validations
  updateProfileValidation,
  changePasswordValidation,
  
  // Subscription validations
  createCheckoutValidation,
  
  // Voice validations
  voiceRecordingValidation,
  
  // General validations
  paginationValidation,
  idValidation,
  sanitizeRequest,
  
  // Error handling
  handleValidationErrors,
  formatValidationErrors
}; 