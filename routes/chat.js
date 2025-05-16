const express = require('express');
const router = express.Router();
const Anthropic = require('@anthropic-ai/sdk');
const Message = require('../models/Message');
const auth = require('../middleware/auth');
const claudeService = require('../services/claudeService');
const Conversation = require('../models/Conversation');

// Initialize Claude API client
const anthropic = new Anthropic({
  apiKey: process.env.CLAUDE_API_KEY
});

console.log('chatRoutes loaded');

// @route   GET /api/chat/messages
// @desc    Get all messages for the authenticated user
// @access  Private
router.get('/messages', auth, async (req, res) => {
  try {
    const messages = await Message.find({ user: req.user._id })
      .sort({ createdAt: 1 })
      .limit(50);
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
    const { content } = req.body;

    // Save user message
    const userMessage = new Message({
      user: req.user._id,
      content,
      sender: 'user',
      conversationId: req.body.conversationId
    });
    await userMessage.save();

    // Get Claude's response using claudeService
    const claudeResponse = await claudeService.sendMessage(content);

    // Save assistant's response
    const assistantMessage = new Message({
      user: req.user._id,
      content: claudeResponse.content,
      sender: 'ai',
      conversationId: req.body.conversationId
    });
    await assistantMessage.save();

    res.json({
      message: assistantMessage
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// @route   POST /api/chat/conversations
// @desc    Create a new conversation and return its ID
// @access  Private
router.post('/conversations', auth, async (req, res) => {
  console.log('POST /conversations hit');
  try {
    const conversation = new Conversation({
      userId: req.user._id,
      title: req.body.title || 'New Conversation',
      summary: req.body.summary || '',
      tags: req.body.tags || []
    });
    await conversation.save();
    res.json({ conversationId: conversation._id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router; 