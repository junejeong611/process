// Centralized configuration for AI integrations
require('dotenv').config();

module.exports = {
  elevenLabs: {
    apiKey: process.env.ELEVENLABS_API_KEY || '',
    baseUrl: process.env.ELEVENLABS_BASE_URL || 'https://api.elevenlabs.io',
    voiceId: process.env.ELEVENLABS_VOICE_ID || '',
  },
  claude: {
    apiKey: process.env.CLAUDE_API_KEY || '',
    baseUrl: process.env.CLAUDE_BASE_URL || 'https://api.anthropic.com',
  },
}; 