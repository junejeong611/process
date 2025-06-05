const express = require('express');
const router = express.Router();
const Anthropic = require('@anthropic-ai/sdk');
const Message = require('../models/Message');
const Conversation = require('../models/Conversation');
const auth = require('../middleware/auth');
const claudeService = require('../services/claudeService');
const axios = require('axios');
const { ElevenLabsClient, play } = require('@elevenlabs/elevenlabs-js');
require("dotenv").config();


// Initialize Claude API client
const anthropic = new Anthropic({
  apiKey: process.env.CLAUDE_API_KEY
});



// @route   POST /api/chat/conversations
// @desc    Create a new conversation
// @access  Private
router.post('/conversations', auth, async (req, res) => {
  try {
    const conversation = new Conversation({
      userId: req.user._id,
      title: 'New Conversation'
    });
    await conversation.save();

    // AI's first message
    const aiFirstMessage = "Hello! How can I help you today?";

    const aiMessage = new Message({
      userId: req.user._id,
      content: aiFirstMessage,
      sender: 'ai',
      conversationId: conversation._id
    });
    await aiMessage.save();

    // Update conversation's lastMessageTime and messageCount
    conversation.lastMessageTime = new Date();
    conversation.messageCount = 1;
    await conversation.save();

    res.status(201).json(conversation);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// @route   GET /api/chat/conversations
// @desc    Get all conversations for the authenticated user
// @access  Private
router.get('/conversations', auth, async (req, res) => {
  try {
    const conversations = await Conversation.find({ userId: req.user._id })
      .sort({ updatedAt: -1 });

    // Get the last message for each conversation
    const conversationsWithLastMessage = await Promise.all(conversations.map(async (conversation) => {
      const lastMessage = await Message.findOne({ 
        conversationId: conversation._id 
      }).sort({ createdAt: -1 });

      return {
        ...conversation.toObject(),
        lastMessage: lastMessage ? lastMessage.content : null,
        lastMessageTime: lastMessage ? lastMessage.createdAt : conversation.updatedAt
      };
    }));

    res.json({
      success: true,
      conversations: conversationsWithLastMessage
    });
  } catch (error) {
    console.error('Error fetching conversations:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to load conversations',
      error: error.message 
    });
  }
});

// @route   GET /api/chat/messages/:conversationId
// @desc    Get all messages for a specific conversation
// @access  Private
router.get('/messages/:conversationId', auth, async (req, res) => {
  try {
    const messages = await Message.find({ 
      userId: req.user._id,
      conversationId: req.params.conversationId 
    })
      .sort({ createdAt: 1 });
    res.json(messages);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// @route   POST /api/chat/send
// @desc    Send a message, get Claude reply, store both
// @access  Private
router.post('/send', auth, async (req, res) => {
  try {
    const { content, conversationId } = req.body;

    if (!content || !conversationId) {
      return res.status(400).json({ error: 'Message content and conversation ID are required' });
    }

    // Verify conversation exists and belongs to user
    const conversation = await Conversation.findOne({
      _id: conversationId,
      userId: req.user._id
    });

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    // Save user message
    const userMessage = new Message({
      userId: req.user._id,
      content,
      sender: 'user',
      conversationId
    });
    
    await userMessage.save();

    // Get Claude's response using claudeService
    const claudeResponse = await claudeService.sendMessage(content);

    // Save assistant's response
    const assistantMessage = new Message({
      userId: req.user._id,
      content: claudeResponse.content,
      sender: 'ai',
      conversationId
    });
    await assistantMessage.save();

    // Update conversation's last message timestamp and increment message count
    conversation.lastMessageTime = new Date();
    conversation.messageCount = (conversation.messageCount || 0) + 2; // Increment by 2 for both user and AI messages
    await conversation.save();

    console.log(assistantMessage)

    res.json({
      message: assistantMessage
    });
  } catch (error) {
    console.error('[/api/chat/send] uncaught error:', error);
    res.status(500).json({ error: error.message });
  }
});


// @route   POST /api/chat/elevenlabs
// @desc    get a audio file from elevenlabs
// @access  Private
router.post('/elevenlabs', auth, async (req, res) => {
  try {
    const elevenlabs = new ElevenLabsClient({ apiKey: process.env.ELEVENLABS_API_KEY });
    const { text } = req.body;

    console.log(process.env.ELEVENLABS_API_KEY)

    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }

    const voiceId = 'JBFqnCBsd6RMkjVDRZzb'; // Replace with your actual voice ID

    const audio = await elevenlabs.textToSpeech.convert(voiceId, {
      text,
      voiceId,
      modelId: 'eleven_multilingual_v2',
      outputFormat: 'mp3_44100_128',
    });



    const chunks = [];
    for await (const chunk of audio) {
      chunks.push(chunk);
    }
    const buffer = Buffer.concat(chunks);

    console.log("Final audio buffer size:", buffer.length); // Should be > 1000

    res.setHeader('Content-Type', 'audio/mpeg');
    res.send(buffer);

  } catch (err) {
    console.error('ElevenLabs error:', err.message);
    res.status(500).json({ error: 'Failed to generate audio' });
  }
});



module.exports = router;