# AI Configuration

## Purpose
The `aiConfig.js` file provides a centralized configuration for AI integrations, specifically for ElevenLabs and Claude APIs. It loads configuration settings from environment variables to ensure flexibility and security.

## Features
- **Environment-Based Configuration**: Loads API keys and base URLs from environment variables.
- **Centralized Management**: Provides a single location for managing configuration settings for multiple AI services.

## Dependencies
- **dotenv**: Loads environment variables from a `.env` file.

## Configuration Details

### ElevenLabs Configuration
- **apiKey**: The API key for authenticating requests to the ElevenLabs API.
- **baseUrl**: The base URL for the ElevenLabs API.
- **voiceId**: The voice ID used for speech synthesis.

### Claude Configuration
- **apiKey**: The API key for authenticating requests to the Claude API.
- **baseUrl**: The base URL for the Claude API.

## Usage
The configuration is exported as a module and can be imported wherever needed in the application to access the AI service settings.

```javascript
const aiConfig = require('../config/aiConfig');

console.log('ElevenLabs API Key:', aiConfig.elevenLabs.apiKey);
console.log('Claude Base URL:', aiConfig.claude.baseUrl);
```

## Environment Variables
Ensure the following environment variables are set in your `.env` file:
- `ELEVENLABS_API_KEY`
- `ELEVENLABS_BASE_URL`
- `ELEVENLABS_VOICE_ID`
- `CLAUDE_API_KEY`
- `CLAUDE_BASE_URL`

## Security Considerations
- **Environment Variables**: Use environment variables to keep sensitive information like API keys secure and out of the source code. 