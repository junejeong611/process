const axios = require('axios');
require('dotenv').config();

// Custom error classes
class ClaudeApiError extends Error {
  constructor(message, statusCode, errorType) {
    super(message);
    this.name = 'ClaudeApiError';
    this.statusCode = statusCode;
    this.errorType = errorType;
  }
}

class RateLimitError extends ClaudeApiError {
  constructor(message) {
    super(message, 429, 'rate_limit_exceeded');
    this.name = 'RateLimitError';
    this.retryAfter = 60; // Default retry after 60 seconds
  }
}

// In-memory cache (simple, can be replaced with Redis or other store)
const responseCache = new Map();

// Helper: Generate cache key
function getCacheKey(message, history, systemPrompt) {
  return JSON.stringify({ message, history, systemPrompt });
}

// Main sendMessage function
const sendMessage = async (message, history = [], systemPrompt = null, retryCount = 0) => {
  if (!process.env.CLAUDE_API_KEY) {
    throw new ClaudeApiError('Claude API key not set in environment variables', 401, 'missing_api_key');
  }

  // Check cache
  const cacheKey = getCacheKey(message, history, systemPrompt);
  if (responseCache.has(cacheKey)) {
    console.log('[ClaudeService] Returning cached response.');
    return responseCache.get(cacheKey);
  }

  // Prepare request body
  const requestBody = {
    model: 'claude-3-opus-20240229', // or configurable
    max_tokens: 1024,
    messages: [
      ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
      ...history,
      { role: 'user', content: message }
    ]
  };

  try {
    console.log(`[ClaudeService] Sending message to Claude API. Attempt ${retryCount + 1}`);
    const response = await axios.post('https://api.anthropic.com/v1/messages', requestBody, {
      headers: {
        'x-api-key': process.env.CLAUDE_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json'
      },
      timeout: 30000 // 30 second timeout
    });

    // Format response for easy consumption
    const formatted = {
      id: response.data.id,
      content: response.data.content?.[0]?.text || '',
      raw: response.data
    };
    // Cache response
    responseCache.set(cacheKey, formatted);
    return formatted;
  } catch (error) {
    if (error.response) {
      const { status, data } = error.response;
      if (status === 429) {
        const retryAfter = parseInt(error.response.headers['retry-after'] || '60', 10);
        const rateLimitError = new RateLimitError('Rate limit exceeded');
        rateLimitError.retryAfter = retryAfter;
        throw rateLimitError;
      }
      if (status === 401) {
        throw new ClaudeApiError('Authentication failed - invalid API key', 401, 'authentication_error');
      }
      throw new ClaudeApiError(
        data.error?.message || 'Unknown Claude API error',
        status,
        data.error?.type || 'unknown'
      );
    } else if (error.request) {
      if (error.code === 'ECONNABORTED') {
        if (retryCount < 2) {
          console.log(`[ClaudeService] Request timeout, retrying (${retryCount + 1}/2)...`);
          return sendMessage(message, history, systemPrompt, retryCount + 1);
        }
        throw new ClaudeApiError('Request timeout after retries', 408, 'timeout');
      }
      throw new ClaudeApiError('No response received from API', 0, 'network_error');
    } else {
      throw new ClaudeApiError(`Error setting up request: ${error.message}`, 0, 'request_setup_error');
    }
  }
};

module.exports = {
  sendMessage,
  ClaudeApiError,
  RateLimitError
}; 