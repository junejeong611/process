const express = require('express');
const router = express.Router();
const Message = require('../models/Message');
const claudeService = require('../services/claudeService');
const auth = require('../../middleware/auth');
const mongoose = require('mongoose');

// GET /api/chat/messages/:conversationId - Get recent messages for a conversation
router.get('/messages/:conversationId', auth, async (req, res) => {
  try {
    const { conversationId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(conversationId)) {
      return res.status(400).json({ success: false, message: 'Invalid conversationId' });
    }
    const messages = await Message.find({ conversationId, userId: req.user._id })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();
    res.json({ success: true, messages: messages.reverse() });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/chat/send - Send a message and get AI reply
router.post('/send', auth, async (req, res) => {
  try {
    const { content, conversationId } = req.body;
    if (!content || !conversationId) {
      return res.status(400).json({ success: false, message: 'Content and conversationId are required' });
    }
    if (!mongoose.Types.ObjectId.isValid(conversationId)) {
      return res.status(400).json({ success: false, message: 'Invalid conversationId' });
    }
    // Save user message
    const userMessage = await Message.create({
      conversationId,
      userId: req.user._id,
      content,
      sender: 'user',
    });
    // Get AI reply
    const aiResponse = await claudeService.sendMessage(content);
    // Save AI message
    const aiMessage = await Message.create({
      conversationId,
      userId: req.user._id,
      content: aiResponse.content,
      sender: 'bot',
    });
    res.json({ success: true, message: aiMessage });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/chat/conversations - Create a new conversation
router.post('/conversations', auth, async (req, res) => {
  try {
    // For simplicity, just use a new ObjectId as conversationId
    const conversationId = new mongoose.Types.ObjectId();
    res.json({ success: true, _id: conversationId });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/chat/conversations/:id - Delete a conversation
router.delete('/conversations/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid conversationId' });
    }
    await Message.deleteMany({ conversationId: id, userId: req.user._id });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/chat/conversations/bulk-delete - Bulk delete conversations
router.delete('/conversations/bulk-delete', auth, async (req, res) => {
  try {
    const { conversationIds } = req.body;
    if (!Array.isArray(conversationIds) || conversationIds.length === 0) {
      return res.status(400).json({ success: false, message: 'conversationIds required' });
    }
    await Message.deleteMany({ conversationId: { $in: conversationIds }, userId: req.user._id });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/chat/conversations - List all conversations for the user
router.get('/conversations', auth, async (req, res) => {
  try {
    // Group messages by conversationId and get the latest message for each
    const conversations = await Message.aggregate([
      { $match: { userId: req.user._id } },
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: '$conversationId',
          lastMessage: { $first: '$content' },
          lastMessageTime: { $first: '$createdAt' },
          type: { $first: '$sender' },
        },
      },
      { $sort: { lastMessageTime: -1 } },
    ]);
    res.json({ success: true, conversations });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router; 