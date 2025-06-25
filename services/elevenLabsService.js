const { ElevenLabsClient } = require('@elevenlabs/elevenlabs-js');
const WebSocket = require('ws');
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { sendMessage, sendMessageStream } = require('./claudeService');
const { streamToBuffer, bufferToStream } = require('../utils/streamUtils');
const nlp = require('compromise');
const streamingMetricsService = require('./streamingMetricsService');

const elevenlabs = new ElevenLabsClient({
  apiKey: process.env.ELEVENLABS_API_KEY,
});

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

// Main synthesizeSpeech function (now using SDK, but not streaming output)
const synthesizeSpeech = async (text, options = {}) => {
  const startTime = Date.now();
  try {
    if (!process.env.ELEVENLABS_VOICE_ID) {
      throw new ElevenLabsApiError('ElevenLabs Voice ID not set in environment variables', 400, 'missing_config');
    }
    if (!text || typeof text !== 'string' || !text.trim()) {
      throw new ElevenLabsApiError('Text is required for speech synthesis', 400, 'missing_text');
    }

    console.log(`[ElevenLabsService] Synthesizing speech. Length: ${text.length} chars.`);

    const audioStream = await elevenlabs.textToSpeech.stream(
      process.env.ELEVENLABS_VOICE_ID,
      {
        text,
        model_id: process.env.ELEVENLABS_MODEL_ID || 'eleven_multilingual_v2',
        voice_settings: {
          ...getDefaultVoiceSettings(),
          ...(options.voice_settings || {})
        },
      }
    );

    const chunks = [];
    for await (const chunk of audioStream) {
      chunks.push(chunk);
    }
    const audioBuffer = Buffer.concat(chunks);

    streamingMetricsService.recordAPICall('elevenLabs', Date.now() - startTime, true);

    return {
      audio: audioBuffer,
      contentType: `audio/${process.env.AUDIO_FORMAT || 'mp3'}`,
      byteLength: audioBuffer.length,
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorType = error.type || 'unknown_api_error';
    streamingMetricsService.recordAPICall('elevenLabs', duration, false, errorType);

    console.error(`[ElevenLabsService] API error: ${error.message}`);
    // The SDK might throw its own specific errors. We can handle them here.
    throw new ElevenLabsApiError(error.message, error.status, error.type);
  }
};

const synthesizeSpeechStream = (textStream) => {
  const audioStream = new (require('stream').PassThrough)();
  const voiceId = process.env.ELEVENLABS_VOICE_ID;
  const modelId = process.env.ELEVENLABS_MODEL_ID || 'eleven_multilingual_v2';
  const wsUrl = `wss://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream-input?model_id=${modelId}`;
  
  const ws = new WebSocket(wsUrl);
  let textBuffer = '';

  ws.on('open', () => {
    console.log('[ElevenLabsService] WebSocket connection opened.');
    const bosMessage = {
      text: " ",
      voice_settings: getDefaultVoiceSettings(),
      xi_api_key: process.env.ELEVENLABS_API_KEY,
    };
    ws.send(JSON.stringify(bosMessage));

    textStream.on('data', (chunk) => {
      textBuffer += chunk.toString();
      const doc = nlp(textBuffer);
      const sentences = doc.sentences().out('array');

      if (sentences.length > 1) {
        const sentencesToSend = sentences.slice(0, -1).join(' ');
        const request = {
          text: sentencesToSend,
          try_trigger_generation: true,
        };
        ws.send(JSON.stringify(request));
        // Keep the last, potentially incomplete sentence in the buffer
        textBuffer = sentences[sentences.length - 1];
      }
    });

    textStream.on('end', () => {
      // Send any remaining text in the buffer
      if (textBuffer.trim().length > 0) {
        const request = {
          text: textBuffer,
          try_trigger_generation: true,
        };
        ws.send(JSON.stringify(request));
      }
      // Send End Of Stream message
      const eosMessage = { text: "" };
      ws.send(JSON.stringify(eosMessage));
      console.log('[ElevenLabsService] Text stream ended. Sent EOS message.');
    });
  });

  ws.on('message', (message) => {
    const data = JSON.parse(message);
    if (data.audio) {
      audioStream.write(Buffer.from(data.audio, 'base64'));
    }
    if (data.isFinal) {
      audioStream.end();
    }
    if (data.error) {
      audioStream.emit('error', new Error(data.error));
    }
  });

  ws.on('error', (error) => {
    console.error('[ElevenLabsService] WebSocket error:', error);
    audioStream.emit('error', error);
  });

  ws.on('close', (code, reason) => {
    console.log(`[ElevenLabsService] WebSocket closed: ${code} ${reason}`);
    if (!audioStream.writableEnded) {
      audioStream.end();
    }
  });

  return audioStream;
};

const synthesizeSpeechWithTimestampsStream = (textStream) => {
  const combinedStream = new (require('stream').PassThrough)({ objectMode: true });
  const voiceId = process.env.ELEVENLABS_VOICE_ID;
  const modelId = process.env.ELEVENLABS_MODEL_ID || 'eleven_multilingual_v2';
  const wsUrl = `wss://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream-input?model_id=${modelId}&output_format=mp3_22050_32`;

  const ws = new WebSocket(wsUrl);
  let textBuffer = '';
  let wordCounter = 0;

  ws.on('open', () => {
    console.log('[ElevenLabsService] Subtitle WebSocket connection opened.');
    const bosMessage = {
      text: " ",
      voice_settings: getDefaultVoiceSettings(),
      xi_api_key: process.env.ELEVENLABS_API_KEY,
      generation_config: {
        chunk_length_schedule: [50],
      },
    };
    ws.send(JSON.stringify(bosMessage));

    textStream.on('data', (chunk) => {
      textBuffer += chunk.toString();
      // Use compromise to split into sentences
      const doc = nlp(textBuffer);
      const sentences = doc.sentences().out('array');
      
      if (sentences.length > 1) {
        const sentencesToSend = sentences.slice(0, -1).join(' ');
        const request = {
          text: sentencesToSend + " ", // Add space to ensure last word is processed
        };
        ws.send(JSON.stringify(request));
        textBuffer = sentences[sentences.length - 1];
      }
    });

    textStream.on('end', () => {
      if (textBuffer.trim().length > 0) {
        const request = {
          text: textBuffer,
        };
        ws.send(JSON.stringify(request));
      }
      const eosMessage = { text: "" };
      ws.send(JSON.stringify(eosMessage));
      console.log('[ElevenLabsService] Subtitle text stream ended. Sent EOS message.');
    });
  });

  ws.on('message', (message) => {
    const data = JSON.parse(message);
    if (data.audio) {
      combinedStream.write({ type: 'audio', chunk: data.audio }); // audio is already base64
    }
    if (data.normalizedAlignment) {
        // The new format for word boundaries
        const { words } = data.normalizedAlignment;
        for (const word of words) {
             const subtitle = {
                text: word.word,
                startTime: word.start,
                endTime: word.end,
            };
            combinedStream.write({ type: 'subtitle', subtitle });
        }
    }
    if (data.isFinal) {
      combinedStream.end();
    }
    if (data.error) {
        combinedStream.emit('error', new Error(data.error));
    }
  });

  ws.on('error', (error) => {
    console.error('[ElevenLabsService] Subtitle WebSocket error:', error);
    combinedStream.emit('error', error);
  });

  ws.on('close', (code, reason) => {
    console.log(`[ElevenLabsService] Subtitle WebSocket closed: ${code} ${reason}`);
    if (!combinedStream.writableEnded) {
      combinedStream.end();
    }
  });

  return combinedStream;
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
      claudeRaw: claudeResult.raw
    };
  } catch (error) {
    console.error('Error in getClaudeAndSpeech:', error);
    throw new Error('Failed to get response from Claude and synthesize speech.');
  }
};

// Debounce function to prevent rapid successive calls
const debounce = (func, delay) => {
  let timeout;
  return function(...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), delay);
  };
};

// Function to synthesize speech from a stream of text
// This function will now be orchestrated by getClaudeAndSpeechStream
const synthesizeSpeechStreamFromText = async (text) => {
  try {
    const audioStream = await synthesizeSpeech(text);
    return audioStream;
  } catch (error) {
    console.error(`ElevenLabs TTS Error: ${error.message}`);
    // In case of an error, push it to the stream to be handled by the consumer
    const audioStream = new (require('stream').PassThrough)();
    audioStream.emit('error', new Error('Failed to synthesize speech.'));
    return audioStream; // Return the stream even on error to prevent crashing
  }
};

const getClaudeAndSpeechStream = (message, history = [], systemPrompt = null) => {
  // 1. Get a stream from Claude
  const claudeStream = new (require('stream').PassThrough)();
  sendMessageStream(message, history, systemPrompt)
    .then(stream => {
      stream.on('data', (chunk) => {
        if (chunk.type === 'content_block_delta' && chunk.delta?.type === 'text_delta') {
          claudeStream.write(chunk.delta.text);
        }
      });
      stream.on('end', () => {
        claudeStream.end();
      });
    })
    .catch(err => {
      console.error("Error getting stream from Claude:", err);
      claudeStream.emit('error', err);
    });

  // 2. Pipe it to ElevenLabs for TTS
  const audioStream = synthesizeSpeechStream(claudeStream);

  return audioStream;
};

// Function to get available voices from ElevenLabs
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
  synthesizeSpeechStream,
  synthesizeSpeechWithTimestampsStream,
  getCachedAudio,
  saveToCache,
  cleanupCache,
  getClaudeAndSpeech,
  getClaudeAndSpeechStream,
  getAvailableVoices,
  ElevenLabsApiError,
  RateLimitError,
};