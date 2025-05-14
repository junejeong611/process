elevenLabsService
Purpose of the elevenLabsService file:
    Text-to-Speech Conversion: The core functionality to transform text into natural-sounding speech
    Caching System: Stores previously generated audio to improve performance and reduce API calls
    Error Handling: Manages various API errors with specific error types
    Integration with Claude: Combines the Claude AI service with speech synthesis
    Configuration Management: Handles voice settings and API configurations 

Main Functions:
    synthesizeSpeech(text, options, retryCount): Converts text to speech using the ElevenLabs API
    getAvailableVoices(): Retrieves the list of available voices from ElevenLabs
    getCachedAudio(text): Checks if audio for the given text already exists in cache
    saveToCache(text, audioBuffer): Saves generated audio to the cache directory
    cleanupCache(maxSize): Removes oldest files when the cache exceeds its size limit
    getClaudeAndSpeech(message, history, systemPrompt, ttsOptions): Gets Claude AI response and converts it to speech

Example Usage:
javascriptconst { synthesizeSpeech, getAvailableVoices, getClaudeAndSpeech } = require('./elevenLabsService');

// Basic text-to-speech conversion
async function convertTextToSpeech() {
  try {
    const result = await synthesizeSpeech('Hello, how can I assist you today?');
    // result contains audio data, content type, and metadata
    return result.audio; // Buffer containing audio data
  } catch (error) {
    console.error('Text-to-speech conversion failed:', error.message);
  }
}

// Get response from Claude and convert to speech
async function getResponseWithAudio(userMessage) {
  try {
    const result = await getClaudeAndSpeech(userMessage);
    // result contains both text and audio
    console.log('AI Response:', result.text);
    return {
      text: result.text,
      audio: result.audio
    };
  } catch (error) {
    console.error('Failed to get AI response with audio:', error.message);
  }
}

// List available voices
async function listVoices() {
  try {
    const voices = await getAvailableVoices();
    console.log('Available voices:', voices.map(v => v.name));
  } catch (error) {
    console.error('Failed to retrieve voices:', error.message);
  }
}

Dependencies:
    axios: Used for HTTP requests to the ElevenLabs API
    dotenv: For loading environment variables
    fs: For file system operations (cache management)
    path: For file path handling
    crypto: For MD5 hashing of text for cache filenames
    claudeService: For integration with Claude AI

Environment/config requirements:
Required Variables:
    ELEVENLABS_API_KEY: Your API key for ElevenLabs
    ELEVENLABS_API_URL: Base URL for the ElevenLabs API
    ELEVENLABS_VOICE_ID: ID of the voice to use for synthesis

Optional Variables:
    ELEVENLABS_MODEL_ID: Model ID to use (default: "eleven_multilingual_v2")
    AUDIO_FORMAT: Output format (default: "mp3")
    AUDIO_STABILITY: Voice stability setting (default: 0.75)
    AUDIO_SIMILARITY_BOOST: Similarity boost setting (default: 0.75)
    AUDIO_STYLE: Style setting (default: 0.35)
    AUDIO_SPEAKER_BOOST: Whether to use speaker boost (default: false)
    AUDIO_CACHE_DIR: Directory for caching audio files (disabled if not set)
    AUDIO_CACHE_MAX_SIZE: Maximum number of files in cache (default: 100)
    REQUEST_TIMEOUT_MS: Timeout for API requests in ms (default: 30000)
    MAX_RETRIES: Number of retries for failed requests (default: 2)

Error Handling:
    The module defines custom error classes for different scenarios:
    ElevenLabsApiError: Base class for all API errors with status code and error type
    RateLimitError: Specialized error for rate limit exceeded with retry-after information

Common error types handled:
    Authentication errors (invalid API key)
    Rate limit exceeded
    Network errors and timeouts
    Invalid responses
    Missing configuration

Performance Optimization:
    Audio caching system avoids redundant API calls for the same text
    Automatic cleanup of old cache files to manage disk usage
    Retry mechanism for transient issues (timeouts)
    Detailed error information for troubleshooting