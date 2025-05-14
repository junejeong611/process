# Claude Service

## Purpose
The `claudeService.js` file provides a service for interacting with the Claude API, enabling the sending of messages and handling responses. It includes error handling, caching, and retry mechanisms to ensure robust communication with the API.

## Features
- **Send Messages**: Allows sending messages to the Claude API with optional message history and system prompts.
- **Error Handling**: Custom error classes for API errors and rate limiting.
- **Caching**: In-memory caching of responses to reduce redundant API calls.
- **Retries**: Automatic retry logic for handling timeouts and transient errors.

## Dependencies
- **axios**: Used for making HTTP requests to the Claude API.
- **dotenv**: Loads environment variables from a `.env` file.

## Environment Variables
- `CLAUDE_API_KEY`: The API key for authenticating requests to the Claude API.

## Usage

### Sending a Message
To send a message to the Claude API, use the `sendMessage` function. You can provide a message, optional history, and a system prompt.

```javascript
const { sendMessage } = require('./claudeService');

(async () => {
  try {
    const response = await sendMessage('Hello, Claude!', [{ role: 'user', content: 'Hi there!' }], 'System prompt');
    console.log('Response:', response);
  } catch (error) {
    console.error('Error:', error);
  }
})();
```

### Error Handling
The service defines custom error classes for handling different types of errors:
- `ClaudeApiError`: General API errors with status codes and error types.
- `RateLimitError`: Specific error for rate limiting, including a retry-after time.

### Caching
Responses are cached in-memory using a simple `Map`. The cache key is generated based on the message, history, and system prompt.

### Retry Logic
The service includes retry logic for handling request timeouts, with up to two retries before throwing an error.

## Performance Considerations
- **Caching**: Reduces the number of API calls by storing responses for repeated requests.
- **Retries**: Helps mitigate transient network issues by retrying failed requests.

## Limitations
- **In-memory Cache**: The current implementation uses an in-memory cache, which may not be suitable for distributed systems. Consider using a distributed cache like Redis for scalability.
