const MAX_RETRIES = 2; // Total attempts = 1 initial + 2 retries
const RETRY_DELAY_MS = 2000;

class UnifiedStreamingService {
  constructor({ onTextChunk, onAudioChunk, onStreamEnd, onFallback, onError, onSubtitleChunk }) {
    this.onTextChunk = onTextChunk;
    this.onAudioChunk = onAudioChunk;
    this.onStreamEnd = onStreamEnd;
    this.onFallback = onFallback;
    this.onError = onError;
    this.onSubtitleChunk = onSubtitleChunk;
    
    this.controller = null;
    this.isCancelled = false;
  }

  async start(mode, { conversationId, content, history, enableSubtitles }) {
    this.isCancelled = false;
    let attempts = 0;

    const streamUrl = '/api/v1/chat/stream';
    const body = { mode, conversationId, content, history, enableSubtitles };
    const token = this._getToken();
    if (!token) {
      this.onError(new Error('Authentication token not found.'));
      return;
    }

    while (attempts <= MAX_RETRIES) {
      if (this.isCancelled) return;
      try {
        console.log('[DEBUG] UnifiedStreamingService: Attempting stream, attempt', attempts + 1);
        await this._attemptStream(mode, streamUrl, body, token);
        return; // Success, exit the loop
      } catch (error) {
        console.error('[DEBUG] UnifiedStreamingService: Stream attempt failed:', error);
        attempts++;
        if (attempts > MAX_RETRIES) {
          console.error('[DEBUG] UnifiedStreamingService: All streaming attempts failed. Executing fallback.');
          if (this.onFallback) {
            this.onFallback('streaming connection failed. getting the full response...');
          }
          await this._executeFallback({ conversationId, content }, token);
          break;
        }
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
      }
    }
  }

  async _attemptStream(mode, url, body, token) {
    this.controller = new AbortController();
    const { signal } = this.controller;

    // Get CSRF token from localStorage (set by CsrfContext.js)
    const csrfToken = localStorage.getItem('csrfToken');
    console.log('[DEBUG] StreamingService: CSRF token:', csrfToken);
    console.log('[DEBUG] StreamingService: document.cookie:', document.cookie);
    console.log('[DEBUG] StreamingService: Fetching', url, 'with body', body);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'X-CSRF-Token': csrfToken || ''
      },
      body: JSON.stringify(body),
      signal,
      credentials: 'include',
    });

    console.log('[DEBUG] StreamingService: Fetch response status:', response.status);
    if (!response.ok || !response.body) {
      throw new Error(`Server error: ${response.status}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    const processMessage = (message) => {
        if (!message.startsWith('data:')) return;
        try {
            const dataStr = message.substring(6).trim();
            if (dataStr === '[DONE]') {
                // This is a potential end-of-stream signal from the server
                // The main `done` flag from reader.read() should still be the primary mechanism
                return;
            }
            if (dataStr) {
              const data = JSON.parse(dataStr);
              console.log('[DEBUG] StreamingService: Received chunk:', data);
              if (data.type === 'audio' && this.onAudioChunk) {
                  // Assuming server sends base64 encoded audio chunk
                  const byteCharacters = atob(data.chunk);
                  const byteNumbers = new Array(byteCharacters.length);
                  for (let i = 0; i < byteCharacters.length; i++) {
                      byteNumbers[i] = byteCharacters.charCodeAt(i);
                  }
                  const byteArray = new Uint8Array(byteNumbers);
                  this.onAudioChunk(byteArray);
              } else if (data.type === 'subtitle' && this.onSubtitleChunk) {
                  this.onSubtitleChunk(data.subtitle);
              } else if (data.type === 'chunk' && this.onTextChunk) {
                  this.onTextChunk(data);
              }
            }
        } catch (e) {
            console.error('[DEBUG] StreamingService: Error parsing stream data chunk:', e);
        }
    };

    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        console.log('[DEBUG] StreamingService: Stream ended');
        this.onStreamEnd();
        break;
      }

      buffer += decoder.decode(value, { stream: true });
      let boundary = buffer.lastIndexOf('\n\n');
      if (boundary === -1) continue;

      const messages = buffer.substring(0, boundary).split('\n\n');
      buffer = buffer.substring(boundary + 2);

      for (const message of messages) {
          processMessage(message);
      }
    }
  }

  async _executeFallback(body, token) {
    try {
      // Get CSRF token from localStorage (set by CsrfContext.js)
      const csrfToken = localStorage.getItem('csrfToken');
      const response = await fetch('/api/v1/chat/message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'X-CSRF-Token': csrfToken || ''
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Fallback request failed.');
      }

      const data = await response.json();
      this.onTextChunk(data.content);
      this.onStreamEnd();
    } catch (error) {
      this.onError(error);
    }
  }

  _getToken() {
    return localStorage.getItem('token') || sessionStorage.getItem('token');
  }

  close() {
    this.isCancelled = true;
    if (this.controller) {
      this.controller.abort();
    }
  }
}

export default UnifiedStreamingService; 