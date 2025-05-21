const express = require('express');
const router = express.Router();
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const { generateResponse } = require('../services/ai');

// Initialize a new conversation with AI greeting
router.post('/conversations/init', async (req, res) => {
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
router.get('/conversations', async (req, res) => {
  try {
    const conversations = await Conversation.find({ userId: req.user._id })
      .sort({ createdAt: -1 });
    res.json(conversations);
  } catch (error) {
    console.error('Error fetching conversations:', error);
    res.status(500).json({ message: 'Error fetching conversations' });
  }
});

// Get messages for a specific conversation
router.get('/messages/:conversationId', async (req, res) => {
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
router.post('/send', async (req, res) => {
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
    const aiResponse = await generateResponse(content);

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

module.exports = router; 