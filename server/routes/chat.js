const express = require('express');
const router = express.Router();
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const claudeService = require('../services/claudeService');
const auth = require('../../middleware/auth');

// Initialize a new conversation with AI greeting
router.post('/conversations/init', auth, async (req, res) => {
  try {
    // Create new conversation
    const conversation = new Conversation({
      userId: req.user._id,
      createdAt: new Date()
    });
    await conversation.save();

    // Generate initial AI greeting
    const initialMessage = "Hello! I'm here to support you. How are you feeling today?";
    
    // Save the initial AI message
    const message = new Message({
      conversationId: conversation._id,
      content: initialMessage,
      sender: 'bot',
      timestamp: new Date()
    });
    await message.save();

    // Update conversation with message count
    conversation.messageCount = 1;
    conversation.lastMessage = initialMessage;
    await conversation.save();

    res.json({
      conversationId: conversation._id,
      initialMessage: initialMessage
    });
  } catch (error) {
    console.error('Error initializing conversation:', error);
    res.status(500).json({ message: 'Error initializing conversation' });
  }
});

// Get all conversations for a user
router.get('/conversations', auth, async (req, res) => {
  try {
    const conversations = await Conversation.find({ userId: req.user._id })
      .sort({ createdAt: -1 });
    const conversationsWithId = conversations.map(conv => ({
      ...conv.toObject(),
      id: conv._id
    }));
    res.json({ success: true, conversations: conversationsWithId });
  } catch (error) {
    console.error('Error fetching conversations:', error);
    res.status(500).json({ message: 'Error fetching conversations' });
  }
});

// Get messages for a specific conversation
router.get('/messages/:conversationId', auth, async (req, res) => {
  try {
    const messages = await Message.find({ conversationId: req.params.conversationId })
      .sort({ timestamp: 1 });
    res.json(messages);
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ message: 'Error fetching messages' });
  }
});

// Send a message
router.post('/send', auth, async (req, res) => {
  try {
    const { content, conversationId } = req.body;

    // Save user message
    const userMessage = new Message({
      conversationId,
      content,
      sender: 'user',
      timestamp: new Date()
    });
    await userMessage.save();

    // Generate AI response
    const aiResponse = await claudeService.generateResponse(content);

    // Save AI response
    const botMessage = new Message({
      conversationId,
      content: aiResponse,
      sender: 'bot',
      timestamp: new Date()
    });
    await botMessage.save();

    // Update conversation
    const conversation = await Conversation.findById(conversationId);
    conversation.messageCount += 2; // Increment by 2 for both messages
    conversation.lastMessage = aiResponse;
    await conversation.save();

    res.json({
      message: botMessage
    });
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ message: 'Error sending message' });
  }
});

// Bulk delete conversations
router.delete('/conversations/bulk-delete', auth, async (req, res) => {
  try {
    const { conversationIds } = req.body;
    if (!Array.isArray(conversationIds) || conversationIds.length === 0) {
      return res.status(400).json({ success: false, message: 'No conversation IDs provided' });
    }

    // Only delete conversations belonging to the current user
    const result = await Conversation.deleteMany({
      _id: { $in: conversationIds },
      userId: req.user._id
    });

    return res.json({ success: true, deletedCount: result.deletedCount });
  } catch (err) {
    console.error('Bulk delete error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Delete a single conversation
router.delete('/conversations/:conversationId', auth, async (req, res) => {
  console.log('Single delete route hit:', req.params.conversationId);
  try {
    const { conversationId } = req.params;
    // Only delete if it belongs to the current user
    const result = await Conversation.deleteOne({
      _id: conversationId,
      userId: req.user._id
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({ success: false, message: 'Conversation not found' });
    }

    return res.json({ success: true });
  } catch (err) {
    console.error('Delete error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router; 