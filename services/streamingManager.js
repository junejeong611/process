const { sendMessageStream } = require('./claudeService');
const { synthesizeSpeechStream, synthesizeSpeechWithTimestampsStream } = require('./elevenLabsService');
const Message = require('../models/Message');
const Conversation = require('../models/Conversation');
const streamingMetricsService = require('./streamingMetricsService');
const nlp = require('compromise');

class StreamingManager {
  constructor(req, res) {
    this.req = req;
    this.res = res;
    this.userId = req.user.userId;
  }

  async handleStream() {
    const { content, conversationId, mode = 'text', enableSubtitles } = this.req.body;
    const startTime = Date.now();

    console.log('[DEBUG] StreamingManager: handleStream called with', { content, conversationId, mode, enableSubtitles });

    if (!content || !conversationId) {
      this.res.status(400).json({ error: 'Content and conversationId are required.' });
      return;
    }

    try {
      const conversation = await this.validateConversation(conversationId);
      if (!conversation) {
        this.res.status(404).json({ error: 'Conversation not found.' });
        return;
      }

      await this.saveUserMessage(content, conversationId);
      
      const claudeApiCallStart = Date.now();
      const claudeStream = await sendMessageStream(content);
      
      let firstChunkReceived = false;
      let fullTextResponse = '';
      let buffer = '';

      // A new stream to collect the full text from Claude
      const textCaptureStream = new (require('stream').PassThrough)();
      claudeStream.on('data', (chunk) => {
        console.log('[DEBUG] StreamingManager: Claude stream chunk:', chunk);
        // If chunk is a Buffer or string, parse it
        let parsedChunk = chunk;
        if (typeof chunk === 'string') {
          try {
            parsedChunk = JSON.parse(chunk);
          } catch (e) {
            console.error('[DEBUG] StreamingManager: Error parsing Claude chunk:', e);
            return;
          }
        }
        if (Buffer.isBuffer(chunk)) {
          try {
            parsedChunk = JSON.parse(chunk.toString('utf8'));
          } catch (e) {
            console.error('[DEBUG] StreamingManager: Error parsing Claude chunk buffer:', e);
            return;
          }
        }

        // Handle content_block_start (initial text block)
        if (parsedChunk.type === 'content_block_start' && parsedChunk.content_block?.type === 'text') {
          const text = parsedChunk.content_block.text;
          if (text) {
            fullTextResponse += text;
            buffer += text;
          }
        }

        // Handle content_block_delta (streamed text)
        if (parsedChunk.type === 'content_block_delta' && parsedChunk.delta?.type === 'text_delta') {
          const text = parsedChunk.delta.text;
          if (text) {
            fullTextResponse += text;
            buffer += text;
          }
        }

        // Emit only complete sentences using compromise
        const doc = nlp(buffer);
        const allSentences = doc.sentences().out('array');
        let toEmit = allSentences;
        // Check if the last sentence is incomplete (doesn't end with punctuation)
        if (allSentences.length > 0 && !/[.!?]$/.test(allSentences[allSentences.length - 1].trim())) {
          // Keep the last incomplete sentence in the buffer
          toEmit = allSentences.slice(0, -1);
          buffer = allSentences[allSentences.length - 1];
        } else {
          // All sentences are complete, clear the buffer
          buffer = '';
        }
        for (let sentence of toEmit) {
          // Clean up repeated punctuation at the end
          sentence = sentence.replace(/([.!?]){2,}/g, '$1').replace(/([.!?])[^a-zA-Z0-9]*$/, '$1');
          textCaptureStream.write(sentence);
        }

        if (!firstChunkReceived && (toEmit.length > 0)) {
            firstChunkReceived = true;
            const claudeLatency = Date.now() - claudeApiCallStart;
            streamingMetricsService.recordAPICall('claude', claudeLatency, true);
        }
      });
      claudeStream.on('end', () => {
        console.log('[DEBUG] StreamingManager: Claude stream ended');
        textCaptureStream.end();
        this.saveAiMessage(fullTextResponse, conversationId);
      });
      claudeStream.on('error', (err) => {
        console.error('[DEBUG] StreamingManager: Claude stream error:', err);
        streamingMetricsService.recordAPICall('claude', Date.now() - claudeApiCallStart, false, err.name);
        textCaptureStream.emit('error', err)
      });

      if (mode === 'voice') {
        if (enableSubtitles) {
          this.streamVoiceWithSubtitles(textCaptureStream, startTime);
        } else {
          this.streamVoice(textCaptureStream, startTime);
        }
      } else {
        this.streamText(textCaptureStream, startTime);
      }

    } catch (error) {
      console.error('[DEBUG] StreamingManager: Error in stream handler:', error);
      // Ensure a response is sent on error
      if (!this.res.headersSent) {
        this.res.status(500).json({ error: 'Failed to handle stream.' });
      }
    }
  }

  streamText(textStream, startTime) {
    this.res.setHeader('Content-Type', 'text/event-stream');
    this.res.setHeader('Cache-Control', 'no-cache');
    this.res.setHeader('Connection', 'keep-alive');
    this.res.flushHeaders();
    
    let firstChunk = true;
    let responseEnded = false;
    console.log('[DEBUG] streamText: Handler attached.');

    textStream.on('data', (chunk) => {
      if (responseEnded) {
        console.warn('[DEBUG] streamText: Received data after response ended!');
        return;
      }
      if (firstChunk) {
        firstChunk = false;
        const latency = Date.now() - startTime;
        streamingMetricsService.recordFirstChunk('text', latency);
      }
      console.log('[DEBUG] streamText: Sending chunk to client:', chunk.toString());
      try {
        this.res.write(`data: ${JSON.stringify({ type: 'chunk', text: chunk.toString() })}\n\n`);
      } catch (err) {
        console.error('[DEBUG] streamText: Error writing chunk to response:', err);
      }
    });

    textStream.on('end', () => {
      if (responseEnded) {
        console.warn('[DEBUG] streamText: end event after response already ended!');
        return;
      }
      streamingMetricsService.recordTextCompletion(true);
      console.log('[DEBUG] streamText: Stream to client ended');
      try {
        this.res.write(`data: ${JSON.stringify({ type: 'end' })}\n\n`);
        this.res.end();
        responseEnded = true;
        console.log('[DEBUG] streamText: Response ended (normal).');
      } catch (err) {
        console.error('[DEBUG] streamText: Error ending response:', err);
      }
    });

    textStream.on('error', (err) => {
      if (responseEnded) {
        console.warn('[DEBUG] streamText: error event after response already ended!', err);
        return;
      }
      streamingMetricsService.recordTextCompletion(false);
      streamingMetricsService.recordErrorEvent('TEXT_STREAM_FAILURE', { error: err.message });
      console.error('[DEBUG] streamText: Error in streamText:', err);
      try {
        this.res.write(`data: ${JSON.stringify({ type: 'error', message: 'Text stream failed' })}\n\n`);
        this.res.end();
        responseEnded = true;
        console.log('[DEBUG] streamText: Response ended (error).');
      } catch (endErr) {
        console.error('[DEBUG] streamText: Error ending response after error:', endErr);
      }
    });

    this.res.on('close', () => {
      responseEnded = true;
      console.log('[DEBUG] streamText: Response closed by client.');
    });
  }

  streamVoiceWithSubtitles(textStream, startTime) {
    this.res.setHeader('Content-Type', 'text/event-stream');
    this.res.setHeader('Cache-Control', 'no-cache');
    this.res.setHeader('Connection', 'keep-alive');
    this.res.flushHeaders();

    const elevenLabsApiCallStart = Date.now();
    const combinedStream = synthesizeSpeechWithTimestampsStream(textStream);

    let firstChunk = true;

    combinedStream.on('data', (data) => {
        if (firstChunk) {
            firstChunk = false;
            const latency = Date.now() - startTime;
            streamingMetricsService.recordAudioLatency(latency, true);
            const elevenLabsLatency = Date.now() - elevenLabsApiCallStart;
            streamingMetricsService.recordAPICall('elevenLabs', elevenLabsLatency, true);
        }
        this.res.write(`data: ${JSON.stringify(data)}\n\n`);
    });

    combinedStream.on('end', () => {
        streamingMetricsService.recordVoiceCompletion(true, true);
        this.res.write(`data: ${JSON.stringify({ type: 'end' })}\n\n`);
        this.res.end();
    });

    combinedStream.on('error', (err) => {
        streamingMetricsService.recordVoiceCompletion(false, true);
        streamingMetricsService.recordErrorEvent('SUBTITLED_VOICE_STREAM_FAILURE', { error: err.message });
        streamingMetricsService.recordAPICall('elevenLabs', Date.now() - elevenLabsApiCallStart, false, err.name);
        this.res.write(`data: ${JSON.stringify({ type: 'error', message: 'Subtitled audio synthesis failed' })}\n\n`);
        this.res.end();
    });
  }

  streamVoice(textStream, startTime) {
    this.res.setHeader('Content-Type', 'audio/mpeg');
    this.res.setHeader('Cache-Control', 'no-cache');
    this.res.setHeader('Connection', 'keep-alive');

    const elevenLabsApiCallStart = Date.now();
    const audioStream = synthesizeSpeechStream(textStream);
    
    let firstChunk = true;

    audioStream.on('data', (chunk) => {
      if (firstChunk) {
        firstChunk = false;
        const latency = Date.now() - startTime;
        streamingMetricsService.recordAudioLatency(latency);
        const elevenLabsLatency = Date.now() - elevenLabsApiCallStart;
        streamingMetricsService.recordAPICall('elevenLabs', elevenLabsLatency, true);
      }
      this.res.write(chunk);
    });

    audioStream.on('end', () => {
      streamingMetricsService.recordVoiceCompletion(true);
      this.res.end();
    });

    audioStream.on('error', (err) => {
      streamingMetricsService.recordVoiceCompletion(false);
      streamingMetricsService.recordErrorEvent('VOICE_STREAM_FAILURE', { error: err.message });
      streamingMetricsService.recordAPICall('elevenLabs', Date.now() - elevenLabsApiCallStart, false, err.name);
      this.res.status(500).end('Audio synthesis failed');
    });
  }

  async validateConversation(conversationId) {
    const conversation = await Conversation.findOne({
      _id: conversationId,
      userId: this.userId,
    });
    return conversation;
  }

  async saveUserMessage(content, conversationId) {
    if (!content || typeof content !== 'string' || content.trim() === '') {
      return;
    }
    const userMessage = new Message({
      userId: this.userId,
      content,
      sender: 'user',
      conversationId,
    });
    await userMessage.save();
  }

  async saveAiMessage(content, conversationId) {
    if (!content || typeof content !== 'string' || content.trim() === '') {
      return;
    }
    const assistantMessage = new Message({
      userId: this.userId,
      content,
      sender: 'ai',
      conversationId,
    });
    await assistantMessage.save();
  }
}

module.exports = StreamingManager; 