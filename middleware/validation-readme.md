# Input Validation & Sanitization System

This document explains the comprehensive input validation and sanitization system implemented using `express-validator`.

## Overview

The validation system provides:
- **Input validation** for all API endpoints
- **Data sanitization** to prevent XSS and injection attacks
- **Custom error messages** for better user experience
- **Centralized validation rules** for consistency
- **Comprehensive test coverage** for all validation scenarios

## Validation Rules

### Authentication Endpoints

#### Register (`/api/auth/register`)
- **Email**: Must be valid email format, normalized to lowercase
- **Password**: Minimum 8 characters, must contain uppercase, lowercase, number, and special character
- **Name**: 2-50 characters, letters/spaces/hyphens/apostrophes only

#### Login (`/api/auth/login`)
- **Email**: Must be valid email format, normalized
- **Password**: Required field

#### MFA Verification (`/api/auth/mfa/verify`)
- **MFA Code**: Exactly 6 digits, numeric only
- **Trust Device**: Optional boolean value

#### Forgot Password (`/api/auth/forgot-password`)
- **Email**: Must be valid email format, normalized

#### Reset Password (`/api/auth/reset-password`)
- **Token**: Required reset token
- **Password**: Same requirements as register password

### Chat Endpoints

#### Send Message (`/api/chat/send`)
- **Content**: 1-5000 characters, required, sanitized
- **Conversation ID**: Valid MongoDB ObjectId format

#### Create Conversation (`/api/chat/conversations`)
- **Title**: Optional, 1-100 characters, sanitized
- **Type**: Optional, must be 'text' or 'voice'

#### Get Messages (`/api/chat/messages/:conversationId`)
- **Conversation ID**: Valid MongoDB ObjectId format

### User Profile Endpoints

#### Update Profile (`/api/users/profile`)
- **Name**: Optional, 2-50 characters, letters/spaces/hyphens/apostrophes only
- **Email**: Optional, valid email format, normalized

#### Change Password (`/api/users/change-password`)
- **Current Password**: Required
- **New Password**: Same requirements as register password

### Subscription Endpoints

#### Create Checkout Session (`/api/subscription/create-checkout`)
- **Price ID**: Required
- **Success URL**: Optional, valid URL format
- **Cancel URL**: Optional, valid URL format

### Voice/Audio Endpoints

#### Voice Recording (`/api/voice/record`)
- **Audio Data**: Required
- **Format**: Optional, must be 'wav', 'mp3', or 'webm'

## Usage

### Importing Validation Rules

```javascript
const { 
  registerValidation, 
  loginValidation, 
  sendMessageValidation 
} = require('../middleware/validation');
```

### Applying to Routes

```javascript
// Single validation rule
router.post('/register', registerValidation, async (req, res) => {
  // Route handler - validation already passed
});

// Multiple middleware (auth + validation + rate limiting)
router.post('/chat/send', 
  auth, 
  sendMessageValidation, 
  chatLimiter, 
  async (req, res) => {
    // Route handler
  }
);
```

### Error Response Format

When validation fails, the system returns:

```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "field": "email",
      "message": "Please provide a valid email address",
      "value": "invalid-email"
    },
    {
      "field": "password",
      "message": "Password must be at least 8 characters long",
      "value": "weak"
    }
  ]
}
```

## Sanitization Features

### Automatic Sanitization

All inputs are automatically sanitized:
- **Trim whitespace** from all string inputs
- **Escape HTML entities** to prevent XSS attacks
- **Normalize email addresses** to lowercase
- **Remove dangerous characters** from names and content

### Sanitization Examples

```javascript
// Input
{
  "name": "<script>alert('xss')</script>John",
  "email": "  TEST@EXAMPLE.COM  "
}

// After sanitization
{
  "name": "&lt;script&gt;alert('xss')&lt;/script&gt;John",
  "email": "test@example.com"
}
```

## Password Requirements

### Strong Password Policy

Passwords must meet these requirements:
- **Minimum length**: 8 characters
- **Uppercase letter**: At least one A-Z
- **Lowercase letter**: At least one a-z
- **Number**: At least one 0-9
- **Special character**: At least one @$!%*?&

### Examples

✅ **Valid passwords**:
- `ValidPass123!`
- `MySecure@Password1`
- `Complex#Pass2023`

❌ **Invalid passwords**:
- `weak` (too short)
- `weakpassword` (no uppercase, number, or special char)
- `WeakPassword` (no number or special char)
- `WeakPass123` (no special char)

## Email Validation

### Email Requirements

- **Valid format**: Must be a properly formatted email address
- **Normalization**: Automatically converted to lowercase
- **Domain validation**: Checks for valid domain structure

### Examples

✅ **Valid emails**:
- `user@example.com`
- `test.user+tag@domain.co.uk`
- `user123@subdomain.example.org`

❌ **Invalid emails**:
- `invalid-email`
- `user@`
- `@domain.com`
- `user..name@example.com`

## MongoDB ObjectId Validation

### ObjectId Requirements

- **Format**: 24-character hexadecimal string
- **Structure**: Must match MongoDB ObjectId pattern
- **Case**: Case-sensitive

### Examples

✅ **Valid ObjectIds**:
- `507f1f77bcf86cd799439011`
- `507f1f77bcf86cd799439012`

❌ **Invalid ObjectIds**:
- `invalid-id`
- `507f1f77bcf86cd79943901` (too short)
- `507f1f77bcf86cd7994390111` (too long)

## Testing

### Running Validation Tests

```bash
node test/validation-test.js
```

This will test:
- Email format validation
- Password strength requirements
- Name character restrictions
- Required field validation
- MongoDB ObjectId validation
- Input sanitization
- Custom error messages

### Test Coverage

The test suite covers:
- **Valid data acceptance**
- **Invalid data rejection**
- **Error message accuracy**
- **Sanitization effectiveness**
- **Edge cases and boundary conditions**

## Error Handling

### Custom Error Messages

All validation rules include user-friendly error messages:

```javascript
body('email')
  .isEmail()
  .withMessage('Please provide a valid email address')
```

### Error Formatting

Errors are formatted consistently:

```javascript
const formatValidationErrors = (errors) => {
  return errors.map(error => ({
    field: error.path,
    message: error.msg,
    value: error.value
  }));
};
```

## Security Features

### XSS Prevention

- **HTML escaping**: All user input is escaped
- **Content sanitization**: Removes dangerous HTML tags
- **Input validation**: Prevents malicious input patterns

### Injection Prevention

- **SQL injection**: Validated input prevents injection
- **NoSQL injection**: MongoDB ObjectId validation
- **Command injection**: Input sanitization prevents execution

### Data Integrity

- **Type checking**: Ensures correct data types
- **Length limits**: Prevents oversized inputs
- **Character restrictions**: Limits dangerous characters

## Best Practices

### 1. Always Validate Input

```javascript
// ✅ Good
router.post('/register', registerValidation, async (req, res) => {
  // Handle request
});

// ❌ Bad
router.post('/register', async (req, res) => {
  // No validation
});
```

### 2. Use Specific Validation Rules

```javascript
// ✅ Good - specific validation
const registerValidation = [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 8 })
];

// ❌ Bad - generic validation
const genericValidation = [
  body('*').notEmpty()
];
```

### 3. Provide Clear Error Messages

```javascript
// ✅ Good
body('email')
  .isEmail()
  .withMessage('Please provide a valid email address')

// ❌ Bad
body('email')
  .isEmail()
  .withMessage('Invalid input')
```

### 4. Sanitize All Inputs

```javascript
// ✅ Good - automatic sanitization
const sanitizeRequest = [
  body('*').trim().escape(),
  query('*').trim().escape()
];

// ❌ Bad - no sanitization
// Input used directly
```

### 5. Test Validation Thoroughly

```javascript
// Test valid data
const validData = { email: 'test@example.com', password: 'ValidPass123!' };

// Test invalid data
const invalidData = { email: 'invalid', password: 'weak' };
```

## Configuration

### Environment Variables

Validation can be configured via environment variables:

```bash
# Password requirements
MIN_PASSWORD_LENGTH=8
REQUIRE_SPECIAL_CHAR=true

# Input limits
MAX_MESSAGE_LENGTH=5000
MAX_NAME_LENGTH=50
```

### Custom Validation Rules

To add custom validation rules:

```javascript
const customValidation = [
  body('customField')
    .custom((value) => {
      // Custom validation logic
      if (!customCheck(value)) {
        throw new Error('Custom validation failed');
      }
      return true;
    }),
  handleValidationErrors
];
```

## Troubleshooting

### Common Issues

1. **Validation not working**
   - Check that validation middleware is applied before route handler
   - Verify validation rules are imported correctly

2. **Sanitization not working**
   - Ensure sanitizeRequest middleware is applied
   - Check that escape() is called on inputs

3. **Error messages not showing**
   - Verify handleValidationErrors is included in validation chain
   - Check that validationResult is called

### Debug Mode

Enable debug logging:

```javascript
// Add to validation middleware
console.log('Validation errors:', errors.array());
```

## Performance Considerations

### Validation Overhead

- **Minimal impact**: Validation adds minimal processing time
- **Early rejection**: Invalid requests are rejected quickly
- **Caching**: Consider caching validation results for repeated patterns

### Optimization Tips

1. **Validate early**: Apply validation before expensive operations
2. **Use specific rules**: Avoid overly broad validation patterns
3. **Cache results**: Cache validation results when possible
4. **Batch validation**: Validate multiple fields together

## Future Enhancements

### Planned Features

- **Async validation**: Support for database lookups during validation
- **Conditional validation**: Rules that depend on other fields
- **Custom sanitizers**: User-defined sanitization functions
- **Validation caching**: Cache validation results for performance
- **Internationalization**: Multi-language error messages

### Extension Points

The validation system is designed to be extensible:

```javascript
// Add custom validation
const customValidation = [
  body('field').custom(async (value) => {
    // Async validation
    const result = await checkDatabase(value);
    if (!result) {
      throw new Error('Custom validation failed');
    }
    return true;
  })
];
``` 