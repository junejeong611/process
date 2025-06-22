const { sendMessageStream } = require('./claudeService');
const { synthesizeSpeechStream, synthesizeSpeechWithTimestampsStream } = require('./elevenLabsService');
const Message = require('../models/Message');
const Conversation = require('../models/Conversation');
const streamingMetricsService = require('./streamingMetricsService');

class StreamingManager {
  constructor(req, res) {
    this.req = req;
    this.res = res;
    this.userId = req.user._id;
  }

  async handleStream() {
    const { content, conversationId, mode = 'text', enableSubtitles } = this.req.body;
    const startTime = Date.now();

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

      // A new stream to collect the full text from Claude
      const textCaptureStream = new (require('stream').PassThrough)();
      claudeStream.on('data', (chunk) => {
        if (!firstChunkReceived) {
            firstChunkReceived = true;
            const claudeLatency = Date.now() - claudeApiCallStart;
            streamingMetricsService.recordAPICall('claude', claudeLatency, true);
        }
        if (chunk.type === 'content_block_delta' && chunk.delta?.type === 'text_delta') {
          const text = chunk.delta.text;
          fullTextResponse += text;
          textCaptureStream.write(text);
        }
      });
      claudeStream.on('end', () => {
        textCaptureStream.end();
        this.saveAiMessage(fullTextResponse, conversationId);
      });
      claudeStream.on('error', (err) => {
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
      console.error('Error in stream handler:', error);
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

    textStream.on('data', (chunk) => {
      if (firstChunk) {
        firstChunk = false;
        const latency = Date.now() - startTime;
        streamingMetricsService.recordFirstChunk('text', latency);
      }
      this.res.write(`data: ${JSON.stringify({ type: 'chunk', text: chunk.toString() })}\n\n`);
    });

    textStream.on('end', () => {
      streamingMetricsService.recordTextCompletion(true);
      this.res.write(`data: ${JSON.stringify({ type: 'end' })}\n\n`);
      this.res.end();
    });

    textStream.on('error', (err) => {
      console.error('Text stream error:', err);
      streamingMetricsService.recordTextCompletion(false);
      streamingMetricsService.recordErrorEvent('TEXT_STREAM_FAILURE', { error: err.message });
      this.res.write(`data: ${JSON.stringify({ type: 'error', message: 'Text stream failed' })}\n\n`);
      this.res.end();
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
        console.error('Subtitled audio stream error:', err);
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
      console.error('Audio stream error:', err);
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
    const userMessage = new Message({
      userId: this.userId,
      content,
      sender: 'user',
      conversationId,
    });
    await userMessage.save();
  }

  async saveAiMessage(content, conversationId) {
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