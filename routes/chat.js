const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const crypto = require('crypto');
const Anthropic = require('@anthropic-ai/sdk');
const Message = require('../models/Message');
const Conversation = require('../models/Conversation');
const auth = require('../middleware/auth');
const claudeService = require('../services/claudeService');
const { userLimiter, aiCallLimiter } = require('../middleware/rateLimiter');
const { logEvent } = require('../services/auditLogService');
const keyService = require('../services/keyService');
const axios = require('axios');
const { ElevenLabsClient, play } = require('@elevenlabs/elevenlabs-js');
require("dotenv").config();


// Initialize Claude API client
const anthropic = new Anthropic({
  apiKey: process.env.CLAUDE_API_KEY
});

// Apply user-level rate limiting to all chat routes
router.use(userLimiter);

// @route   POST /api/chat/conversations
// @desc    Create a new conversation
// @access  Private
router.post('/conversations', auth, async (req, res) => {
  try {
    const { wrappedConversationKey, title } = req.body;

    if (!wrappedConversationKey) {
      return res.status(400).json({ error: 'wrappedConversationKey is required.' });
    }

    const conversation = new Conversation({
      userId: req.user._id,
      title: title || 'New Conversation',
      wrappedConversationKey: wrappedConversationKey,
    });
    await conversation.save();

    // AI's first message
    const aiFirstMessage = "I'm here, ready when you are";

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

    logEvent(req.user._id, 'CREATE_CONVERSATION', 'SUCCESS', { 
      ipAddress: req.ip, 
      targetId: conversation._id, 
      targetType: 'Conversation' 
    });

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
      .sort({ updatedAt: -1 })
      .limit(20); // Limit to 20 for testing

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
      
    logEvent(req.user._id, 'VIEW_CONVERSATION', 'SUCCESS', {
      ipAddress: req.ip,
      targetId: req.params.conversationId,
      targetType: 'Conversation'
    });

    res.json(messages);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Helper to get triggers from Claude
async function getTriggersFromClaude(text) {
  const prompt = `\nExtract the emotional triggers from the following message. \nReturn ONLY a JSON array of trigger keywords (e.g., [\"perfectionism\", \"fear of failure\"]).\n\nMessage: \"${text}\"\n`;
  const aiResponse = await claudeService.sendMessage(prompt);
  try {
    const triggers = JSON.parse(aiResponse.content);
    if (Array.isArray(triggers)) return triggers;
  } catch (e) {}
  return [];
}

// Helper to get emotions from Claude
async function getEmotionsFromClaude(text) {
  const prompt = `\nAnalyze the following message and rate the intensity of each emotion (anger, sadness, fear, shame, disgust) on a scale from 0 (not present) to 10 (very strong).\nReturn ONLY a JSON object like {\"anger\": 0, \"sadness\": 0, \"fear\": 0, \"shame\": 0, \"disgust\": 0}.\n\nMessage: \"${text}\"\n`;
  console.log('Claude prompt:', prompt);
  const aiResponse = await claudeService.sendMessage(prompt);
  console.log('Claude response:', aiResponse.content);
  try {
    const emotions = JSON.parse(aiResponse.content);
    // Validate structure
    const keys = ['anger', 'sadness', 'fear', 'shame', 'disgust'];
    if (keys.every(k => typeof emotions[k] === 'number')) return emotions;
  } catch (e) {}
  // Default if parsing fails
  return { anger: 0, sadness: 0, fear: 0, shame: 0, disgust: 0 };
}

// @route   POST /api/chat/send
// @desc    Send a message, get Claude reply, store both
// @access  Private
router.post('/send', 
  auth, 
  aiCallLimiter, 
  [
    body('encryptedContent', 'encryptedContent cannot be empty').not().isEmpty(),
    body('encryptedConversationKey', 'encryptedConversationKey is required').not().isEmpty(),
    body('conversationId', 'Invalid conversation ID').isMongoId(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { encryptedContent, encryptedConversationKey, conversationId } = req.body;
      
      // Verify conversation exists and belongs to user
      const conversation = await Conversation.findOne({
        _id: conversationId,
        userId: req.user._id
      });

      if (!conversation) {
        return res.status(404).json({ error: 'Conversation not found' });
      }

      // --- Decryption for AI Processing ---
      let conversationKey;
      let decryptedContent;
      try {
        // 1. Decrypt the conversation key with the server's private key
        const serverPrivateKey = keyService.getPrivateKey();
        const conversationKeyBuffer = crypto.privateDecrypt(
          {
            key: serverPrivateKey,
            padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
            oaepHash: 'sha256',
          },
          Buffer.from(encryptedConversationKey, 'base64')
        );
        conversationKey = conversationKeyBuffer;

        // 2. Decrypt the message content with the decrypted conversation key (AES-256-GCM)
        const contentBuffer = Buffer.from(encryptedContent, 'base64');
        const iv = contentBuffer.slice(0, 12);
        const authTag = contentBuffer.slice(12, 28);
        const encrypted = contentBuffer.slice(28);
        
        const decipher = crypto.createDecipheriv('aes-256-gcm', conversationKey, iv);
        decipher.setAuthTag(authTag);
        decryptedContent = Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');

      } catch (decryptionError) {
        console.error('Decryption failed:', decryptionError);
        logEvent(req.user._id, 'DECRYPTION_FAILED', 'FAILURE', { ipAddress: req.ip, targetId: conversationId });
        return res.status(500).json({ error: 'Failed to decrypt message for processing.' });
      }
      // --- End Decryption ---

      // Extract triggers from user's message using Claude
      const triggers = await getTriggersFromClaude(decryptedContent);
      // Extract emotions from user's message using Claude
      const emotions = await getEmotionsFromClaude(decryptedContent);

      // Save user message (content remains encrypted with the at-rest key)
      const userMessage = new Message({
        userId: req.user._id,
        content: decryptedContent, // mongoose-encryption will re-encrypt this at rest
        sender: 'user',
        conversationId,
        triggers,
        emotions
      });
    
      await userMessage.save();

      // Get Claude's response using the decrypted content
      const claudeResponse = await claudeService.sendMessage(decryptedContent);

      // Save assistant's response (content will be encrypted at rest)
      const assistantMessage = new Message({
        userId: req.user._id,
        content: claudeResponse.content,
        sender: 'ai',
        conversationId
      });
      await assistantMessage.save();

      // Clear sensitive data from memory as soon as possible
      conversationKey.fill(0);
      decryptedContent = null;

      // Update conversation's last message timestamp and increment message count
      conversation.lastMessageTime = new Date();
      conversation.messageCount = (conversation.messageCount || 0) + 2; // Increment by 2 for both user and AI messages
      await conversation.save();
      
      logEvent(req.user._id, 'SEND_MESSAGE', 'SUCCESS', {
        ipAddress: req.ip,
        targetId: conversation._id,
        targetType: 'Conversation',
        details: { messageId: userMessage._id }
      });

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
router.post('/elevenlabs', auth, aiCallLimiter, async (req, res) => {
  try {
    const elevenlabs = new ElevenLabsClient({ apiKey: process.env.ELEVENLABS_API_KEY });
    const { text } = req.body;

    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }

    const voiceId = 'cgSgspJ2msm6clMCkdW9'; // Replace with your actual voice ID

    console.log(text)

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

// @route   POST /api/chat/conversations/bulk-delete
// @desc    Bulk delete conversations for the authenticated user
// @access  Private
router.post('/conversations/bulk-delete', auth, async (req, res) => {
  try {
    const { conversationIds } = req.body; // expects an array of IDs
    if (!Array.isArray(conversationIds) || conversationIds.length === 0) {
      return res.status(400).json({ error: 'No conversation IDs provided' });
    }

    // Ensure all conversations belong to the user
    const conversations = await Conversation.find({
      _id: { $in: conversationIds },
      userId: req.user._id
    });

    if (conversations.length !== conversationIds.length) {
      logEvent(req.user._id, 'DELETE_CONVERSATION', 'FAILURE', {
        ipAddress: req.ip,
        details: { reason: 'Attempt to delete unauthorized conversations', conversationIds }
      });
      return res.status(403).json({ error: 'You can only delete your own conversations' });
    }

    // Delete associated messages first
    await Message.deleteMany({ conversationId: { $in: conversationIds } });
    
    // Then delete the conversations
    await Conversation.deleteMany({ _id: { $in: conversationIds } });

    conversationIds.forEach(id => {
      logEvent(req.user._id, 'DELETE_CONVERSATION', 'SUCCESS', {
        ipAddress: req.ip,
        targetId: id,
        targetType: 'Conversation'
      });
    });

    res.json({
      success: true,
      message: `${conversationIds.length} conversations deleted successfully`
    });
  } catch (error) {
    console.error('Error deleting conversations:', error);
    logEvent(req.user._id, 'DELETE_CONVERSATION', 'FAILURE', {
      ipAddress: req.ip,
      details: { error: error.message, conversationIds: req.body.conversationIds }
    });
    res.status(500).json({ success: false, message: 'Failed to delete conversations' });
  }
});



module.exports = router;