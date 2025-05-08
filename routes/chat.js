const express = require('express');
const axios = require('axios');
const Message = require('../models/Message');
const auth = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/chat/messages
// @desc    Get all messages for the authenticated user
// @access  Private
router.get('/messages', auth, async (req, res) => {
  try {
    const messages = await Message.find({ user: req.userId }).sort({ createdAt: 1 });
    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// @route   POST /api/chat/message
// @desc    Send a message, get Claude reply, store both
// @access  Private
router.post('/message', auth, async (req, res) => {
  const { text } = req.body;
  if (!text || typeof text !== 'string' || !text.trim()) {
    return res.status(400).json({ error: 'Message text is required' });
  }
  try {
    // Store user message
    const userMsg = await Message.create({ user: req.userId, text });

    // Call Claude API (Anthropic)
    // NOTE: Replace with your actual Claude API integration as needed
    const claudeRes = await axios.post(
      process.env.CLAUDE_API_URL,
      {
        model: process.env.CLAUDE_API_MODEL,
        max_tokens: 256,
        messages: [
          { role: 'user', content: text }
        ]
      },
      {
        headers: {
          'x-api-key': process.env.CLAUDE_API_KEY,
          'content-type': 'application/json',
        }
      }
    );
    const replyText = claudeRes.data?.content || 'Sorry, I could not process your message.';
    // Store Claude reply
    const aiMsg = await Message.create({ user: req.userId, text: replyText });
    res.json({ user: userMsg, ai: aiMsg });
  } catch (err) {
    res.status(500).json({ error: 'Failed to send message or get reply' });
  }
});

module.exports = router; 