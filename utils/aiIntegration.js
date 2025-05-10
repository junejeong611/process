const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const claudeService = require('../services/claudeService');
const elevenLabsService = require('../services/elevenLabsService');
const aiConfig = require('../config/aiConfig');

const CACHE_DIR = path.resolve(__dirname, '../cache');
const AUDIO_FORMAT = 'mp3';
const CACHE_EXPIRATION_MS = 24 * 60 * 60 * 1000; // 24 hours by default

/**
 * Generates a unique cache path for the given text
 * @param {string} text - Text to hash
 * @returns {string} - Path to cache file
 */
function getAudioCachePath(text) {
  const hash = crypto.createHash('md5').update(text).digest('hex');
  return path.join(CACHE_DIR, `${hash}.${AUDIO_FORMAT}`);
}

/**
 * Checks if a cached audio file exists and is not expired
 * @param {string} text - Text for which to check cache
 * @param {number} expirationMs - Cache expiration time in milliseconds
 * @returns {object|null} - Cached audio data or null if not found/expired
 */
function getCachedAudio(text, expirationMs = CACHE_EXPIRATION_MS) {
  const cachePath = getAudioCachePath(text);
  
  if (fs.existsSync(cachePath)) {
    // Check file stats for creation time
    const stats = fs.statSync(cachePath);
    const fileAgeMs = Date.now() - stats.mtimeMs;
    
    // Return file if not expired
    if (fileAgeMs < expirationMs) {
      return {
        audio: fs.readFileSync(cachePath),
        contentType: `audio/${AUDIO_FORMAT}`,
        fromCache: true,
        cacheAge: fileAgeMs
      };
    } else {
      // Optionally clean up expired file
      try {
        fs.unlinkSync(cachePath);
      } catch (err) {
        console.warn(`Failed to remove expired cache file: ${err.message}`);
      }
    }
  }
  
  return null;
}

/**
 * Saves audio buffer to cache
 * @param {string} text - Text used to generate audio
 * @param {Buffer} audioBuffer - Audio data to cache
 * @returns {boolean} - Success status
 */
function saveAudioToCache(text, audioBuffer) {
  try {
    if (!fs.existsSync(CACHE_DIR)) {
      fs.mkdirSync(CACHE_DIR, { recursive: true });
    }
    
    const cachePath = getAudioCachePath(text);
    fs.writeFileSync(cachePath, audioBuffer);
    return true;
  } catch (err) {
    console.error(`Failed to save audio to cache: ${err.message}`);
    return false;
  }
}

/**
 * Cleans up expired cache files
 * @param {number} expirationMs - Cache expiration time in milliseconds
 * @returns {number} - Number of files removed
 */
function cleanupCache(expirationMs = CACHE_EXPIRATION_MS) {
  try {
    if (!fs.existsSync(CACHE_DIR)) return 0;
    
    const files = fs.readdirSync(CACHE_DIR);
    let removedCount = 0;
    
    for (const file of files) {
      const filePath = path.join(CACHE_DIR, file);
      const stats = fs.statSync(filePath);
      const fileAgeMs = Date.now() - stats.mtimeMs;
      
      if (fileAgeMs > expirationMs) {
        fs.unlinkSync(filePath);
        removedCount++;
      }
    }
    
    return removedCount;
  } catch (err) {
    console.error(`Cache cleanup failed: ${err.message}`);
    return 0;
  }
}

/**
 * Unified function: get Claude response and synthesize speech with caching
 * @param {string} message - User message
 * @param {Array} history - Conversation history
 * @param {string|null} systemPrompt - Optional system prompt
 * @param {object} options - Options for the integrations
 * @param {object} options.tts - Options for TTS
 * @param {boolean} options.forceRefresh - Whether to bypass cache
 * @param {number} options.cacheExpirationMs - Custom cache expiration time
 * @returns {Promise<{text: string, audio: Buffer, contentType: string, fromCache: boolean, claudeRaw?: any, elevenLabsRaw?: any, error?: string}>}
 */
async function getClaudeAndSpeechWithCache(
  message, 
  history = [], 
  systemPrompt = null, 
  options = {}
) {
  const {
    tts = {},
    forceRefresh = false,
    cacheExpirationMs = CACHE_EXPIRATION_MS
  } = options;
  
  try {
    // Step 1: Get Claude response
    const claudeResult = await claudeService.sendMessage(message, history, systemPrompt);
    const responseText = claudeResult.content;
    
    // Step 2: Check audio cache (skip if forceRefresh is true)
    if (!forceRefresh) {
      const cachedAudio = getCachedAudio(responseText, cacheExpirationMs);
      if (cachedAudio) {
        return {
          text: responseText,
          audio: cachedAudio.audio,
          contentType: cachedAudio.contentType,
          fromCache: true,
          cacheAge: cachedAudio.cacheAge,
          claudeRaw: claudeResult.raw
        };
      }
    }
    
    // Step 3: Synthesize speech
    try {
      const speechResult = await elevenLabsService.synthesizeSpeech(responseText, tts);
      const cacheSaved = saveAudioToCache(responseText, speechResult.audio);
      
      return {
        text: responseText,
        audio: speechResult.audio,
        contentType: speechResult.contentType,
        fromCache: false,
        cacheSaved,
        claudeRaw: claudeResult.raw,
        elevenLabsRaw: speechResult.raw
      };
    } catch (speechError) {
      // If speech synthesis fails, still return the text response
      console.error(`Speech synthesis failed: ${speechError.message}`);
      return {
        text: responseText,
        audio: null,
        fromCache: false,
        error: `Speech synthesis failed: ${speechError.message}`,
        claudeRaw: claudeResult.raw
      };
    }
  } catch (err) {
    // Handle overall failures
    console.error(`AI integration error: ${err.message}`);
    throw new Error(`AI integration failed: ${err.message}`);
  }
}

// Run cache cleanup periodically (e.g., once a day)
// Only if this module is the main entry point (not when imported)
if (require.main === module) {
  cleanupCache();
  
  // Set up scheduled cleanup
  setInterval(() => {
    const removed = cleanupCache();
    if (removed > 0) {
      console.log(`Cleaned up ${removed} expired cache files`);
    }
  }, 24 * 60 * 60 * 1000); // Run daily
}

module.exports = {
  getClaudeAndSpeechWithCache,
  cleanupCache,
  getCachedAudio,
  saveAudioToCache,
  CACHE_EXPIRATION_MS
};