console.log('chat.js router loaded');
const express = require('express');
const router = express.Router();
const Message = require('../models/Message');
const claudeService = require('../services/claudeService');
const auth = require('../middleware/auth');
const mongoose = require('mongoose');
const Conversation = require('../models/Conversation');

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
    const { type = 'text', title } = req.body;
    const conversation = new (require('../models/Conversation'))({
      userId: req.user._id,
      type,
      title: title || 'New Conversation'
    });
    await conversation.save();
    res.json({ success: true, id: conversation._id });
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
    await Conversation.deleteMany({ _id: { $in: conversationIds }, userId: req.user._id });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/chat/conversations/:id - Delete a conversation
router.delete('/conversations/:id', auth, async (req, res) => {
  console.log('DELETE /conversations/:id hit', req.params.id);
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid conversationId' });
    }
    await Message.deleteMany({ conversationId: id, userId: req.user._id });
    await Conversation.deleteOne({ _id: id, userId: req.user._id });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/chat/conversations - List all conversations for the user
router.get('/conversations', auth, async (req, res) => {
  try {
    const Conversation = require('../../models/Conversation');
    const Message = require('../../models/Message');
    // Get all conversations for the user
    const conversations = await Conversation.find({ userId: req.user._id }).lean();
    // For each conversation, get the last message
    const conversationIds = conversations.map(c => c._id);
    const lastMessages = await Message.aggregate([
      { $match: { conversationId: { $in: conversationIds }, userId: req.user._id } },
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: '$conversationId',
          lastMessage: { $first: '$content' },
          lastMessageTime: { $first: '$createdAt' }
        }
      }
    ]);
    // Map lastMessages by conversationId
    const lastMessageMap = {};
    lastMessages.forEach(m => {
      lastMessageMap[m._id.toString()] = m;
    });
    // Merge last message info into conversations
    const merged = conversations.map(conv => {
      const lm = lastMessageMap[conv._id.toString()] || {};
      return {
        ...conv,
        lastMessage: lm.lastMessage || null,
        lastMessageTime: lm.lastMessageTime || conv.updatedAt
      };
    });
    // Sort by lastMessageTime descending
    merged.sort((a, b) => new Date(b.lastMessageTime) - new Date(a.lastMessageTime));
    res.json({ success: true, conversations: merged });
  } catch (err) {
    console.error('Error in /api/chat/conversations:', err, err?.stack);
    res.status(500).json({ success: false, message: err.message });
  }
});

// Catch-all for debugging unmatched routes in chat router
router.use((req, res, next) => {
  console.log('chat.js catch-all:', req.method, req.originalUrl);
  next();
});

module.exports = router; 