# AI Integration

## Purpose
The `aiIntegration.js` file provides a unified service for integrating Claude's AI response generation with ElevenLabs' speech synthesis.  The functions in `aiIntegration.js` are utilized in test scripts to verify the integration and functionality of AI responses and speech synthesis. It includes caching mechanisms to optimize performance and reduce redundant API calls.

## Features
- **Claude AI Integration**: Sends messages to Claude's API and retrieves AI-generated responses.
- **Speech Synthesis**: Uses ElevenLabs' API to convert text responses into speech.
- **Caching**: Caches audio responses to minimize API usage and improve response times.
- **Cache Management**: Includes functions for checking, saving, and cleaning up cached audio files.

### Functions:
- **`getClaudeAndSpeechWithCache`**: This function is called in `claude-11labs-test.js` to test the end-to-end process of generating an AI response and converting it to speech.
- **`cleanupCache`**: Used to manage and clean up expired cache files during testing.
- **`getCachedAudio`**: Checks for existing cached audio to optimize test performance.
- **`saveAudioToCache`**: Saves audio data during tests to verify caching functionality.

These functions ensure that the integration between Claude's AI and ElevenLabs' speech synthesis is working correctly and efficiently, with caching mechanisms to improve performance during testing.

## Dependencies
- **path**: Node.js module for handling file paths.
- **fs**: Node.js module for file system operations.
- **crypto**: Node.js module for generating hashes.
- **claudeService**: Custom service for interacting with Claude's API.
- **elevenLabsService**: Custom service for interacting with ElevenLabs' API.
- **aiConfig**: Configuration settings for AI integrations.

## Usage

### Getting AI Response and Speech
To get a response from Claude and synthesize it into speech, use the `getClaudeAndSpeechWithCache` function. It supports caching and can be configured to force refresh or use custom cache expiration times.

```javascript
const { getClaudeAndSpeechWithCache } = require('./aiIntegration');

(async () => {
  try {
    const result = await getClaudeAndSpeechWithCache('Hello, how are you?', [], null, { forceRefresh: false });
    console.log('Text:', result.text);
    console.log('Audio:', result.audio);
  } catch (error) {
    console.error('Error:', error);
  }
})();
```

### Cache Management
- **getCachedAudio**: Checks if a cached audio file exists and is valid.
- **saveAudioToCache**: Saves audio data to the cache.
- **cleanupCache**: Removes expired cache files.

### Scheduled Cache Cleanup
The module includes a scheduled task to clean up expired cache files daily.

## Performance Considerations
- **Caching**: Reduces API calls by storing audio responses for repeated requests.
- **Scheduled Cleanup**: Ensures cache does not grow indefinitely by removing expired files.

## Limitations
- **In-memory Cache**: The current implementation uses a simple file-based cache, which may not be suitable for distributed systems. Consider using a distributed cache like Redis for scalability.



