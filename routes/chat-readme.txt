Chat.js
Purpose of the file/module:
This file (chat.js) creates API endpoints for a chat system where users can send messages to Claude and receive AI-generated responses
It handles user authentication, message storage, and communication with the Claude API

How it works:
    Route Activation: The endpoints are activated when a user makes requests to /api/chat/messages (GET) or /api/chat/send (POST).
    Authentication Check: All routes are protected by authentication middleware. Requests must include a valid JWT token. If authentication fails, the request is rejected.
    Message Handling:
    For GET /api/chat/messages: Retrieves up to 50 recent messages for the authenticated user, sorted by creation time.
    For POST /api/chat/send: Accepts a message from the user, stores it, sends it to the Claude AI service, stores the AI's reply, and returns the AI's message to the client.
    Claude AI Integration: The claudeService module handles communication with the Anthropic Claude API, including error handling and response formatting.
    Data Storage: Messages are stored in MongoDB using the Message model, which supports metadata, read status, and conversation grouping.

How to use (API endpoints, example usage):

API Endpoint Details

URL: /api/chat/messages
  Method: GET
  Authentication: Required (JWT token)
  Returns: Array of the user's recent messages (up to 50)

URL: /api/chat/send
  Method: POST
  Authentication: Required (JWT token)
  Request Body: { content: string, conversationId: string }
  Returns: The AI's reply message object

Dependencies:
    express, mongoose, @anthropic-ai/sdk (for Claude integration), axios (for HTTP requests to Claude API), dotenv (for environment variable management), jsonwebtoken (for authentication)

Environment/config requirements:
    CLAUDE_API_KEY (required): Your Anthropic Claude API key
    JWT_SECRET (required): Secret key for verifying JWT tokens
    MONGODB_URI (required): MongoDB connection string

Troubleshooting:

Common Issues:

Authentication errors (401):
    Ensure the JWT token is valid and included in the Authorization header as 'Bearer <token>'.
Claude API errors (500):
    Check that CLAUDE_API_KEY is set and valid.
    Ensure your Anthropic account is active and has sufficient quota.
Database errors:
    Verify that MONGODB_URI is correct and the database is accessible.
Message not saved or retrieved:
    Ensure conversationId and content are provided and valid in requests. 