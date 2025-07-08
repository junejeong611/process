const mongoose = require('mongoose');
const mongooseEncryption = require('mongoose-encryption');

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
    type: Map,
    of: Number
  },
  // This field will be used by MongoDB's TTL index to automatically delete documents
  deleteAfter: {
    type: Date,
    // The TTL index will be created on this field
    // Documents will be deleted when the current time is greater than the value of this field
    index: { expires: '1s' } 
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

// Set the deleteAfter field before saving a new message
messageSchema.pre('save', function(next) {
  if (this.isNew) {
    const retentionDays = parseInt(process.env.DATA_RETENTION_DAYS, 10) || 365;
    this.deleteAfter = new Date(Date.now() + retentionDays * 24 * 60 * 60 * 1000);
  }
  next();
});

const encKey = process.env.ENCRYPTION_SECRET;
console.log('ENCRYPTION_SECRET at Message.js model init:', encKey);
if (!encKey) {
  throw new Error('ENCRYPTION_SECRET environment variable is not set!');
}

messageSchema.plugin(mongooseEncryption, {
  secret: encKey,
  encryptedFields: ['content'],
  // Use either authenticated encryption or simple encryption
  // authenticated: true is stronger as it protects against tampering
  authenticated: true 
});

module.exports = mongoose.model('Message', messageSchema); 