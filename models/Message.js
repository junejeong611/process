const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  conversationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Conversation',
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  content: {
    type: String,
    required: true
  },
  sender: {
    type: String,
    enum: ['user', 'ai', 'bot'],
    required: true
  },
  triggers: [{
    type: String
  }],
  emotions: {
    anger: { type: Number, default: 0 },
    sadness: { type: Number, default: 0 },
    fear: { type: Number, default: 0 },
    shame: { type: Number, default: 0 },
    disgust: { type: Number, default: 0 }
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Message', messageSchema); 