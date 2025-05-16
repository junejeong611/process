const express = require('express');
const router = express.Router();
const Anthropic = require('@anthropic-ai/sdk');
const Message = require('../models/Message');
const Conversation = require('../models/Conversation');
const auth = require('../middleware/auth');
const claudeService = require('../services/claudeService');

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
    res.json(conversations);
  } catch (error) {
    res.status(500).json({ error: error.message });
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

    // Update conversation's last message timestamp
    conversation.updatedAt = new Date();
    await conversation.save();

    res.json({
      message: assistantMessage
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;