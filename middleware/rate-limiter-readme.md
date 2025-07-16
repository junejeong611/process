# Rate Limiting System

This document explains the comprehensive rate limiting system implemented in the Express.js application.

## Overview

The rate limiting system uses `express-rate-limit` to protect against abuse and ensure fair usage of resources. Different rate limiters are applied to various types of endpoints based on their sensitivity and resource usage.

## Rate Limiters

### 1. **apiLimiter** - General API Protection
- **Limit**: 200 requests per 15 minutes per IP
- **Applied**: Globally to all `/api/` routes
- **Purpose**: Basic protection against general abuse

### 2. **authLimiter** - Authentication Endpoints
- **Limit**: 5 requests per 10 minutes per IP
- **Applied**: `/api/auth/login`, `/api/auth/register`
- **Purpose**: Prevents brute force attacks and account enumeration

### 3. **chatLimiter** - Chat/AI Conversation Endpoints
- **Limit**: 30 requests per 5 minutes per user
- **Applied**: `/api/chat/send`
- **Purpose**: Controls usage of expensive AI services

### 4. **userLimiter** - User-Specific Limits
- **Limit**: 1000 requests per hour per user
- **Applied**: All authenticated routes
- **Purpose**: Prevents individual users from overwhelming the system

### 5. **aiCallLimiter** - Expensive AI Operations
- **Limit**: 10 requests per minute per user
- **Applied**: AI-intensive endpoints
- **Purpose**: Controls costs and prevents AI service abuse

### 6. **voiceLimiter** - Voice Processing
- **Limit**: 20 requests per 5 minutes per user
- **Applied**: Voice transcription and synthesis endpoints
- **Purpose**: Controls usage of voice processing services

### 7. **uploadLimiter** - File Uploads
- **Limit**: 10 uploads per 10 minutes per user
- **Applied**: File upload endpoints
- **Purpose**: Prevents abuse of file upload functionality

## Usage

### Importing Rate Limiters

```javascript
const { 
  authLimiter, 
  chatLimiter, 
  userLimiter, 
  aiCallLimiter 
} = require('../middleware/rateLimiter');
```

### Applying to Individual Routes

```javascript
// Apply to a single route
router.post('/login', authLimiter, async (req, res) => {
  // Route handler
});

// Apply multiple limiters to a route
router.post('/chat/send', 
  auth,           // Authentication middleware
  chatLimiter,    // Chat rate limiter
  aiCallLimiter,  // AI call rate limiter
  async (req, res) => {
    // Route handler
  }
);
```

### Applying to All Routes in a Router

```javascript
// Apply to all routes in this router
router.use(chatLimiter);

router.post('/send', async (req, res) => {
  // This route will be rate limited
});

router.get('/conversations', async (req, res) => {
  // This route will also be rate limited
});
```

## Error Responses

When a rate limit is exceeded, the system returns a `429 Too Many Requests` response with:

```json
{
  "success": false,
  "message": "Too many authentication attempts. Please try again after 10 minutes.",
  "retryAfter": 600
}
```

The response includes:
- `success`: Always `false` for rate limit errors
- `message`: Human-readable error message
- `retryAfter`: Seconds until the rate limit resets

## Headers

Rate limit responses include standard HTTP headers:
- `X-RateLimit-Limit`: Maximum requests allowed
- `X-RateLimit-Remaining`: Remaining requests in current window
- `X-RateLimit-Reset`: Time when the rate limit resets
- `Retry-After`: Seconds to wait before retrying

## Key Generation

The system uses intelligent key generation:
- **Authenticated users**: Rate limited by user ID
- **Unauthenticated users**: Rate limited by IP address

This ensures that:
- Users can't bypass limits by logging out
- Unauthenticated requests are still protected
- Rate limits are fair and user-specific when possible

## Configuration

### Environment Variables

Rate limiting can be configured via environment variables:

```bash
# General API rate limit (requests per 15 minutes)
RATE_LIMIT_API_MAX=200

# Authentication rate limit (requests per 10 minutes)
RATE_LIMIT_AUTH_MAX=5

# Chat rate limit (requests per 5 minutes)
RATE_LIMIT_CHAT_MAX=30
```

### Customizing Limits

To modify rate limits, edit `middleware/rateLimiter.js`:

```javascript
const authLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 5, // Change this value to adjust the limit
  // ... other options
});
```

## Testing

Use the test script to verify rate limiting is working:

```bash
node test/rate-limit-test.js
```

This will:
- Make multiple requests to test endpoints
- Verify that rate limits are enforced
- Show detailed results of the test

## Monitoring

Rate limiting events are logged to help with monitoring:

- Rate limit exceeded events
- User/IP addresses that hit limits
- Patterns of abuse

## Best Practices

1. **Layer Rate Limits**: Apply multiple limiters for comprehensive protection
2. **User-Specific Limits**: Use user IDs when possible for authenticated routes
3. **IP Fallback**: Always fall back to IP-based limiting for unauthenticated requests
4. **Clear Messages**: Provide helpful error messages with retry information
5. **Monitor Usage**: Track rate limit events to identify abuse patterns

## Troubleshooting

### Rate Limits Too Strict
- Increase `max` values in the rate limiter configuration
- Extend `windowMs` to allow more requests over a longer period

### Rate Limits Not Working
- Check that middleware is applied in the correct order
- Verify that the rate limiter is imported and applied correctly
- Check server logs for rate limiting events

### Testing Rate Limits
- Use the provided test script
- Make multiple rapid requests to trigger limits
- Check response headers for rate limit information

## Security Considerations

- Rate limits help prevent brute force attacks
- User-specific limits prevent individual abuse
- IP-based fallbacks protect against unauthenticated abuse
- Clear error messages help legitimate users understand limits
- Monitoring helps identify and respond to abuse patterns 