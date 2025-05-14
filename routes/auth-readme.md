# [auth.js] Auth.js

## Purpose of the file/module:
This file (auth.js) creates API endpoints for user authentication, including registration and login. It handles user creation, password hashing, and JWT token generation for secure access.

## How it works:
- **Route Activation**: The endpoints are activated when a user makes requests to `/api/auth/register` (POST) or `/api/auth/login` (POST).
- **User Registration**: 
  - For POST `/api/auth/register`: Accepts user email, password, and name, checks for existing users, and creates a new user if the email is not already registered.
- **User Login**: 
  - For POST `/api/auth/login`: Accepts user email and password, verifies credentials, and returns a JWT token for authentication.
- **JWT Token Generation**: The `jsonwebtoken` library is used to generate tokens for authenticated users.

## How to use (API endpoints, example usage):

### API Endpoint Details

**URL: /api/auth/register**
- **Method**: POST
- **Authentication**: Not required
- **Request Body**: `{ email: string, password: string, name: string }`
- **Returns**: JWT token and user information

**URL: /api/auth/login**
- **Method**: POST
- **Authentication**: Not required
- **Request Body**: `{ email: string, password: string }`
- **Returns**: JWT token and user information

## Dependencies:
- **express**: Web framework for Node.js
- **bcrypt**: Library for hashing passwords
- **jsonwebtoken**: Library for generating and verifying JWT tokens
- **User**: Mongoose model for user data

## Environment/config requirements:
- **JWT_SECRET** (required): Secret key for verifying JWT tokens
- **MONGODB_URI** (required): MongoDB connection string

## Troubleshooting:

### Common Issues:

- **Authentication errors (401):**
  - Ensure the JWT token is valid and included in the Authorization header as 'Bearer <token>'.
- **Registration errors (400):**
  - Check that the email is not already registered.
- **Login errors (401):**
  - Verify that the email and password are correct.
- **Database errors:**
  - Ensure that MONGODB_URI is correct and the database is accessible.

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