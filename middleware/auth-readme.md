auth
Purpose of the auth file:
This middleware provides authentication functionality for your Express routes by
    Securing API Routes: Verifies that requests come from authenticated users
    Validating Tokens: Checks if provided JWT (JSON Web Token) tokens are valid
    Attaching User Data: Makes the authenticated user's data available to route handlers
    Controlling Access: Prevents unauthorized access to protected resources

This middleware serves as the security layer for protecting API routes from unauthorized access.
How it works:
    Token Extraction: Gets the JWT token from the Authorization header in the request
    Token Verification: Validates the token's authenticity using the JWT_SECRET
    User Validation: Confirms that the user associated with the token exists in the database
    Request Augmentation: Attaches the user data and token to the request object
    Error Handling: Returns a 401 status code if authentication fails for any reason

How to use (middleware, example usage):
The middleware can be applied to any route that requires authentication:
javascript// Import the auth middleware
const auth = require('../middleware/auth');

// Apply to a single route
router.get('/api/protected-resource', auth, (req, res) => {
  // Access the authenticated user via req.user
  res.json({ 
    message: `Hello, ${req.user.name}!`,
    userEmail: req.user.email 
  });
});

// Apply to multiple routes
router.use('/api/user-data', auth);
router.get('/api/user-data/profile', (req, res) => {
  // req.user is available here
});
router.post('/api/user-data/settings', (req, res) => {
  // req.user is available here
});

Dependencies:
    jsonwebtoken - For verifying JWT tokens
    User model - Database model for user data

Environment/config requirements:
    JWT_SECRET (required): Secret key used for verifying JWT tokens

Authentication Process:
Client includes JWT token in the Authorization header:
    Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Middleware extracts and verifies the token: Parses the token from the header
    Validates it using the JWT_SECRET
    Decodes the token to get the userId
Middleware fetches the user:
    Uses the userId from the token to query the database
    Confirms the user exists and is valid
On success:
    Attaches user object to req.user
    Attaches token to req.token
    Passes control to the next middleware/route handler
On failure:
    Returns a 401 Unauthorized response
    Prevents access to the protected route

Security Considerations:
    The middleware expects tokens in the Bearer authentication scheme
    All protected routes will return 401 if the token is missing or invalid
    No detailed error information is returned to prevent security leaks
    Token validation checks both token integrity and user existence