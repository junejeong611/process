# [auth.js]

## Purpose
This file handles user authentication, including registration and login. It provides endpoints for creating new users and authenticating existing users, returning JWT tokens for secure access.

## Dependencies
- **express**: Web framework for Node.js
- **bcrypt**: Library for hashing passwords
- **jsonwebtoken**: Library for generating and verifying JWT tokens
- **User**: Mongoose model for user data

## Key Components

### Functions/Classes
- **router.post('/api/auth/register')**: Registers a new user, checks for existing users, and returns a JWT token.
- **router.post('/api/auth/login')**: Authenticates a user, verifies credentials, and returns a JWT token.

## Usage Examples
```javascript
// Register a new user
const response = fetch('/api/auth/register', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'user@example.com', password: 'password123', name: 'User Name' })
});

// Login a user
const response = fetch('/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'user@example.com', password: 'password123' })
});