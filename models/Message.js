// Message Schema for Emotional Support App
// Includes validation, references, and flexible metadata
// Example usage:
//   const messages = await Message.find({ conversationId });

const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  content: {
    type: String,
    required: true
  },
  sender: {
    type: String,
    enum: ['user', 'ai'],
    required: true
  },
  conversationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Conversation',
    required: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Message', messageSchema);