// Conversation Schema for Emotional Support App
// Includes user reference, title, timestamps, and activity status
// Example usage:
//   const conversations = await Conversation.findByUser(userId);

const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required'],
    index: true
  },
  title: {
    type: String,
    trim: true,
    default: 'New Conversation',
    maxlength: [100, 'Title cannot exceed 100 characters']
  },
  summary: {
    type: String,
    trim: true,
    maxlength: 200
  },
  lastMessageAt: {
    type: Date,
    default: Date.now
  },
  isActive: {
    type: Boolean,
    default: true
  },
  tags: [{
    type: String,
    trim: true
  }],
  messageCount: {
    type: Number,
    default: 0
  }
}, {
  timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' },
  collection: 'conversations',
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for efficient querying
conversationSchema.index({ userId: 1, lastMessageAt: -1 });
conversationSchema.index({ userId: 1, isActive: 1, lastMessageAt: -1 });
conversationSchema.index({ tags: 1 }); // For tag-based searching

// Set a default title if none provided
conversationSchema.pre('save', function(next) {
  if (!this.title || this.title.trim() === '') {
    this.title = `Conversation ${new Date(this.createdAt).toLocaleDateString()}`;
  }
  next();
});

// Static method to find all conversations by user
conversationSchema.statics.findByUser = function(userId) {
  return this.find({ userId }).sort({ lastMessageAt: -1 });
};

// Static method to get active conversations for a user
conversationSchema.statics.getActiveByUser = function(userId, limit = 10) {
  return this.find({ 
    userId: userId,
    isActive: true 
  })
  .sort({ lastMessageAt: -1 })
  .limit(limit);
};

// Static method to find conversations by tag
conversationSchema.statics.findByTag = function(userId, tag) {
  return this.find({
    userId: userId,
    tags: tag
  }).sort({ lastMessageAt: -1 });
};

// Instance method to update last message timestamp
conversationSchema.methods.updateLastMessageTime = function() {
  this.lastMessageAt = new Date();
  return this.save();
};

// Instance method to increment message count
conversationSchema.methods.incrementMessageCount = function() {
  this.messageCount = (this.messageCount || 0) + 1;
  return this.save();
};

// Mark conversation as inactive (archive)
conversationSchema.methods.archive = function() {
  this.isActive = false;
  return this.save();
};

// Create virtual for messages that can be populated
conversationSchema.virtual('messages', {
  ref: 'Message',
  localField: '_id',
  foreignField: 'conversationId'
});

// Create model from schema
const Conversation = mongoose.model('Conversation', conversationSchema);

module.exports = Conversation;