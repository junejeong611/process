const axios = require('axios');
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { sendMessage } = require('./claudeService');

// Custom error classes
class ElevenLabsApiError extends Error {
  constructor(message, statusCode, errorType) {
    super(message);
    this.name = 'ElevenLabsApiError';
    this.statusCode = statusCode;
    this.errorType = errorType;
  }
}

class RateLimitError extends ElevenLabsApiError {
  constructor(message) {
    super(message, 429, 'rate_limit_exceeded');
    this.name = 'RateLimitError';
    this.retryAfter = 60; // Default retry after 60 seconds
  }
}

// Get voice settings from environment variables
const getDefaultVoiceSettings = () => {
  return {
    stability: parseFloat(process.env.AUDIO_STABILITY) || 0.75,
    similarity_boost: parseFloat(process.env.AUDIO_SIMILARITY_BOOST) || 0.75,
    style: parseFloat(process.env.AUDIO_STYLE) || 0.35,
    use_speaker_boost: process.env.AUDIO_SPEAKER_BOOST === 'true'
  };
};

// Main synthesizeSpeech function
const synthesizeSpeech = async (text, options = {}, retryCount = 0) => {
  // Validate configuration
  if (!process.env.ELEVENLABS_API_KEY) {
    throw new ElevenLabsApiError('ElevenLabs API key not set in environment variables', 401, 'missing_api_key');
  }
  
  if (!process.env.ELEVENLABS_API_URL || !process.env.ELEVENLABS_VOICE_ID) {
    throw new ElevenLabsApiError('ElevenLabs API URL or Voice ID not set in environment variables', 400, 'missing_config');
  }
  
  if (!text || typeof text !== 'string' || !text.trim()) {
    throw new ElevenLabsApiError('Text is required for speech synthesis', 400, 'missing_text');
  }

  console.log(`[ElevenLabsService] Synthesizing speech. Length: ${text.length} chars. Attempt: ${retryCount + 1}`);
  
  // Get default voice settings and merge with provided options
  const defaultVoiceSettings = getDefaultVoiceSettings();
  
  const requestBody = {
    text,
    model_id: process.env.ELEVENLABS_MODEL_ID || 'eleven_multilingual_v2',
    voice_settings: {
      ...defaultVoiceSettings,
      ...(options.voice_settings || {})
    },
    ...(options.extraBody || {})
  };

  try {
    const response = await axios.post(
      `${process.env.ELEVENLABS_API_URL}/text-to-speech/${process.env.ELEVENLABS_VOICE_ID}`,
      requestBody,
      {
        headers: {
          'Accept': `audio/${process.env.AUDIO_FORMAT || 'mp3'}`,
          'xi-api-key': process.env.ELEVENLABS_API_KEY,
          'Content-Type': 'application/json',
        },
        responseType: 'arraybuffer',
        timeout: parseInt(process.env.REQUEST_TIMEOUT_MS) || 30000
      }
    );
    
    // Validate the response
    if (!response.data || response.data.byteLength === 0) {
      throw new ElevenLabsApiError('Received empty audio data from API', 500, 'invalid_response');
    }
    
    // Verify content type is actually audio
    const contentType = response.headers['content-type'];
    if (!contentType || !contentType.includes('audio/')) {
      console.warn(`[ElevenLabsService] Unexpected content type: ${contentType}`);
    }
    
    return {
      audio: response.data,
      contentType: contentType || `audio/${process.env.AUDIO_FORMAT || 'mp3'}`,
      byteLength: response.data.byteLength,
      raw: {
        headers: response.headers,
        status: response.status
      }
    };
  } catch (error) {
    if (error.response) {
      const { status } = error.response;
      
      // Try to parse error message from buffer if possible
      let errorMessage = 'Unknown ElevenLabs API error';
      let errorType = 'unknown';
      
      if (error.response.data) {
        try {
          // Handle both string and buffer error responses
          if (Buffer.isBuffer(error.response.data)) {
            const dataString = error.response.data.toString('utf8');
            if (dataString.includes('{')) {
              const errorData = JSON.parse(dataString);
              errorMessage = errorData.detail || errorData.message || errorMessage;
              errorType = errorData.error_type || errorType;
            } else {
              errorMessage = dataString;
            }
          } else if (typeof error.response.data === 'string') {
            if (error.response.data.includes('{')) {
              const errorData = JSON.parse(error.response.data);
              errorMessage = errorData.detail || errorData.message || errorMessage;
              errorType = errorData.error_type || errorType;
            } else {
              errorMessage = error.response.data;
            }
          } else if (typeof error.response.data === 'object') {
            errorMessage = error.response.data.detail || error.response.data.message || errorMessage;
            errorType = error.response.data.error_type || errorType;
          }
        } catch (parseError) {
          console.error('[ElevenLabsService] Error parsing error response:', parseError);
        }
      }
      
      console.error(`[ElevenLabsService] API error (${status}): ${errorMessage}`);
      
      if (status === 429) {
        const retryAfter = parseInt(error.response.headers['retry-after'] || '60', 10);
        const rateLimitError = new RateLimitError('Rate limit exceeded');
        rateLimitError.retryAfter = retryAfter;
        throw rateLimitError;
      }
      
      if (status === 401) {
        throw new ElevenLabsApiError('Authentication failed - invalid API key', 401, 'authentication_error');
      }
      
      throw new ElevenLabsApiError(errorMessage, status, errorType);
    } else if (error.request) {
      if (error.code === 'ECONNABORTED') {
        const maxRetries = parseInt(process.env.MAX_RETRIES) || 2;
        if (retryCount < maxRetries) {
          console.log(`[ElevenLabsService] Request timeout, retrying (${retryCount + 1}/${maxRetries})...`);
          return synthesizeSpeech(text, options, retryCount + 1);
        }
        throw new ElevenLabsApiError('Request timeout after retries', 408, 'timeout');
      }
      
      throw new ElevenLabsApiError('No response received from API', 0, 'network_error');
    } else {
      throw new ElevenLabsApiError(`Error setting up request: ${error.message}`, 0, 'request_setup_error');
    }
  }
};

// Simple audio caching system
const getCachedAudio = (text) => {
  if (!process.env.AUDIO_CACHE_DIR) return null;
  
  const hash = crypto.createHash('md5').update(text).digest('hex');
  const cacheFilePath = path.join(process.env.AUDIO_CACHE_DIR, `${hash}.${process.env.AUDIO_FORMAT || 'mp3'}`);
  
  if (fs.existsSync(cacheFilePath)) {
    console.log('[ElevenLabsService] Returning cached audio');
    return {
      audio: fs.readFileSync(cacheFilePath),
      contentType: `audio/${process.env.AUDIO_FORMAT || 'mp3'}`,
      fromCache: true
    };
  }
  
  return null;
};

const saveToCache = (text, audioBuffer) => {
  if (!process.env.AUDIO_CACHE_DIR) return;
  
  // Create cache directory if it doesn't exist
  if (!fs.existsSync(process.env.AUDIO_CACHE_DIR)) {
    fs.mkdirSync(process.env.AUDIO_CACHE_DIR, { recursive: true });
  }
  
  const hash = crypto.createHash('md5').update(text).digest('hex');
  const cacheFilePath = path.join(process.env.AUDIO_CACHE_DIR, `${hash}.${process.env.AUDIO_FORMAT || 'mp3'}`);
  
  fs.writeFileSync(cacheFilePath, audioBuffer);
  console.log('[ElevenLabsService] Saved audio to cache');
  
  // Cleanup cache if it exceeds max size
  const maxCacheSize = parseInt(process.env.AUDIO_CACHE_MAX_SIZE) || 100;
  cleanupCache(maxCacheSize);
};

const cleanupCache = (maxSize) => {
  if (!process.env.AUDIO_CACHE_DIR) return;
  
  try {
    const files = fs.readdirSync(process.env.AUDIO_CACHE_DIR)
      .filter(file => file.endsWith(`.${process.env.AUDIO_FORMAT || 'mp3'}`))
      .map(file => ({
        name: file,
        path: path.join(process.env.AUDIO_CACHE_DIR, file),
        mtime: fs.statSync(path.join(process.env.AUDIO_CACHE_DIR, file)).mtime.getTime()
      }));
    
    if (files.length <= maxSize) return;
    
    // Sort by modification time (oldest first)
    files.sort((a, b) => a.mtime - b.mtime);
    
    // Remove oldest files to get down to max size
    const filesToRemove = files.slice(0, files.length - maxSize);
    filesToRemove.forEach(file => {
      fs.unlinkSync(file.path);
      console.log(`[ElevenLabsService] Removed old cache file: ${file.name}`);
    });
  } catch (err) {
    console.error('[ElevenLabsService] Error cleaning up cache:', err);
  }
};

// Integration utility with caching: get Claude response and synthesize speech
const getClaudeAndSpeech = async (message, history = [], systemPrompt = null, ttsOptions = {}) => {
  try {
    // Step 1: Get response from Claude
    const claudeResult = await sendMessage(message, history, systemPrompt);
    const responseText = claudeResult.content;
    
    // Step 2: Check cache for audio
    const cachedAudio = getCachedAudio(responseText);
    if (cachedAudio) {
      return {
        text: responseText,
        audio: cachedAudio.audio,
        contentType: cachedAudio.contentType,
        fromCache: true,
        claudeRaw: claudeResult.raw
      };
    }
    
    // Step 3: Synthesize speech if not in cache
    const speechResult = await synthesizeSpeech(responseText, ttsOptions);
    
    // Step 4: Save to cache
    saveToCache(responseText, speechResult.audio);
    
    return {
      text: responseText,
      audio: speechResult.audio,
      contentType: speechResult.contentType,
      fromCache: false,
      claudeRaw: claudeResult.raw,
      elevenLabsRaw: speechResult.raw
    };
  } catch (error) {
    console.error('[ElevenLabsService] Error in getClaudeAndSpeech:', error);
    
    // If Claude response succeeded but speech synthesis failed,
    // return the text response anyway
    if (error instanceof ElevenLabsApiError && arguments[0]?.content) {
      return {
        text: arguments[0].content,
        audio: null,
        error: error.message,
        errorType: error.errorType
      };
    }
    
    throw error;
  }
};

// Add a function to get available voices
const getAvailableVoices = async () => {
  if (!process.env.ELEVENLABS_API_KEY) {
    throw new ElevenLabsApiError('ElevenLabs API key not set in environment variables', 401, 'missing_api_key');
  }
  
  try {
    const response = await axios.get(
      `${process.env.ELEVENLABS_API_URL}/voices`,
      {
        headers: {
          'xi-api-key': process.env.ELEVENLABS_API_KEY,
          'Content-Type': 'application/json',
        }
      }
    );
    
    return response.data.voices;
  } catch (error) {
    // Error handling similar to synthesizeSpeech
    // ...
    throw new ElevenLabsApiError('Error fetching available voices', 500, 'api_error');
  }
};

module.exports = {
  synthesizeSpeech,
  getAvailableVoices,
  ElevenLabsApiError,
  RateLimitError,
  getClaudeAndSpeech
};