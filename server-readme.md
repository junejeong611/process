Server.js
Purpose of the file/module:
This file serves as the main entry point for the application, initializing and configuring the Express server. It connects all essential services (MongoDB, Claude API, ElevenLabs APIs), implements security layers (rate limiting, secure headers, input validation), handles errors, and establishes the RESTful API structure for client interactions.
How it works:
    Application Initialization: Loads all necessary tools (Express, MongoDB connection, etc.)
    Request Handling: Processes incoming requests through middleware and routes them to the appropriate handlers
    Error Management: Catches errors, logs them, and sends appropriate responses back to users
    Graceful Shutdown: When the server stops, it carefully closes connections to the database and shuts down properly

How to use (API endpoints, example usage):
API Endpoints
Authentication:
    POST /api/v1/auth/register - Create new account
    POST /api/v1/auth/login - User login
Chat:
    POST /api/v1/chat/message - Send message and get AI response
    GET /api/v1/chat/conversations - List conversations
Voice:
    POST /api/v1/voice/synthesize - Convert text to speech

Example Usage:
Setting Up the Server:
// Install dependencies
npm install
// Start the server
npm start

Authentication:
// Register a new user
fetch('http://localhost:5001/api/v1/auth/register', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    username: 'jane_doe',
    email: 'jane@example.com',
    password: 'secure_password123'
  })
})
.then(res => res.json())
.then(data => console.log('Registration successful:', data));

// Login to get access token
fetch('http://localhost:5001/api/v1/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'jane@example.com',
    password: 'secure_password123'
  })
})
.then(res => res.json())
.then(data => {
  const token = data.token;
  localStorage.setItem('auth_token', token);
});

Dependencies:
Main Dependencies:
    express: Web server framework
    cors: Cross-Origin Resource Sharing middleware
    helmet: Security middleware for HTTP headers
    morgan: HTTP request logger
    mongoose: MongoDB object modeling tool
    express-rate-limit: Rate limiting middleware
    compression: Middleware to gzip responses
    dotenv: Loads environment variables from .env file

Other Project Dependencies:
    @anthropic-ai/sdk: Claude API integration
    axios: Promise-based HTTP client
    bcrypt: Password hashing
    elevenlabs-node: ElevenLabs API integration
    jsonwebtoken: For JWT authentication

Dev Dependencies:
    concurrently: Run multiple npm scripts concurrently
    nodemon: Auto-restart server on file changes

Environment/config requirements:
Required Environment Variables:
    JWT_SECRET - Secret key for signing JWT tokens
    CLAUDE_API_KEY - API key for Claude (Anthropic) integration
    ELEVENLABS_API_KEY - API key for ElevenLabs voice synthesis

Optional/Recommended Environment Variables:
    PORT - Server port (default: 5001)
    MONGODB_URI - MongoDB connection string (default: mongodb://127.0.0.1:27017/emotionalsupportapp)
    CLIENT_URL - Allowed CORS origin (default: *)
    NODE_ENV - Set to production or development
    RATE_LIMIT_WINDOW_MS - Rate limit window in ms (default: 15 * 60 * 1000)
    RATE_LIMIT_MAX_REQUESTS - Max requests per window (default: 100)
    ELEVENLABS_API_URL - Override ElevenLabs API base URL
    ELEVENLABS_VOICE_ID - Default voice for ElevenLabs
    CLAUDE_BASE_URL - Override Claude API base URL

ElevenLabs Voice Settings (Optional):
    AUDIO_STABILITY
    AUDIO_SIMILARITY_BOOST
    AUDIO_STYLE
    AUDIO_SPEAKER_BOOST
    ELEVENLABS_MODEL_ID

Testing instructions:
Automated Endpoint Testing:
    The script test/test_endpoints.sh tests the main API endpoints using curl commands
    It checks health endpoint, auth endpoints, chat endpoints, and voice endpoint
    To use:
    Start your server (default port: 5001)
    Run: bash test/test_endpoints.sh
    The script will output the results of each test
    It will attempt to create and delete a test audio file for the voice endpoint