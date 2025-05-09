const express = require('express');
const router = express.Router();
const Anthropic = require('@anthropic-ai/sdk');
const Message = require('../models/Message');
const auth = require('../middleware/auth');

// Initialize Claude API client
const anthropic = new Anthropic({
  apiKey: process.env.CLAUDE_API_KEY
});

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
      role: 'user'
    });
    await userMessage.save();

    // Get Claude's response
    const completion = await anthropic.messages.create({
      model: 'claude-3-opus-20240229',
      max_tokens: 1000,
      messages: [{ role: 'user', content }]
    });

    const assistantResponse = completion.content[0].text;

    // Save assistant's response
    const assistantMessage = new Message({
      user: req.user._id,
      content: assistantResponse,
      role: 'assistant'
    });
    await assistantMessage.save();

    res.json({
      message: assistantMessage
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router; 