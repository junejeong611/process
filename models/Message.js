// Message Schema for Emotional Support App
// Includes validation, references, and flexible metadata
// Example usage:
//   const messages = await Message.find({ conversationId });

const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  content: {
    type: String,
    required: [true, 'Message content cannot be empty'],
    minlength: [1, 'Message cannot be empty'],
    maxlength: [2000, 'Message exceeds maximum length of 2000 characters'],
    trim: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true
  },
  conversationId: {
    type: mongoose.Schema.Types.ObjectId,
    required: [true, 'Conversation ID is required'],
    index: true,
    ref: 'Conversation'
  },
  sender: {
    type: String,
    enum: ['user', 'ai'],
    required: true
  },
  messageType: {
    type: String,
    enum: ['text', 'suggestion', 'exercise', 'mood', 'resource'],
    default: 'text'
  },
  isRead: {
    type: Boolean,
    default: function() { return this.sender === 'ai'; }
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed
  },
  // Optional TTL field for message expiration
  expiresAt: {
    type: Date,
    default: function() {
      // Default to 90 days from creation
      const date = new Date();
      date.setDate(date.getDate() + 90);
      return date;
    }
  }
}, {
  timestamps: { createdAt: 'timestamp', updatedAt: false },
  collection: 'messages'
});

// Indexes for efficient querying
messageSchema.index({ conversationId: 1, timestamp: -1 });
messageSchema.index({ userId: 1, timestamp: -1 });
messageSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL index

// Find messages by conversation with optional limit
messageSchema.statics.findByConversation = function(conversationId, limit = 50) {
  return this.find({ conversationId })
    .sort({ timestamp: 1 })
    .limit(limit);
};

// Get recent messages for a user
messageSchema.statics.getRecentByUser = function(userId, limit = 10) {
  return this.find({ userId })
    .sort({ timestamp: -1 })
    .limit(limit)
    .populate('conversationId', 'title');
};

// Get unread messages count for a user
messageSchema.statics.getUnreadCount = function(userId) {
  return this.countDocuments({ 
    userId, 
    sender: 'ai',
    isRead: false 
  });
};

// Instance method to mark message as read
messageSchema.methods.markAsRead = function() {
  this.isRead = true;
  return this.save();
};

// Create model from schema
const Message = mongoose.model('Message', messageSchema);

module.exports = Message;