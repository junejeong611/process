Message.js
Purpose of the Message.js File:
This file creates a data model for chat messages that:
    Stores Communication: Captures both user and AI messages in conversations
    Organizes Content: Groups messages into conversations for context maintenance
    Tracks Message Status: Monitors whether messages have been read
    Supports Different Message Types: Handles various message formats beyond simple text
    Manages Data Lifecycle: Automatically expires old messages after a defined period
    Provides Query Methods: Makes it easy to retrieve messages in useful ways

How it works:
    Schema Definition: Creates a MongoDB schema with fields for message content, user and conversation references, sender type, message type, read status, and metadata
    Message Categorization: Supports different message types (text, suggestion, exercise, mood, resource) for varied application features
    Read Status Tracking: Automatically marks AI messages as read by default and provides methods to update read status
    Data Lifecycle Management: Implements automatic message expiration after 90 days using MongoDB's TTL index
    Query Optimization: Defines strategic indexes to ensure efficient retrieval of messages
    Conversation Organization: Groups messages by conversation ID for context maintenance

How to use (methods, example usage):
Static Methods:
    findByConversation(conversationId, limit) - Retrieves messages from a specific conversation
    getRecentByUser(userId, limit) - Gets the most recent messages for a user
    getUnreadCount(userId) - Counts unread AI messages for a user

Instance Methods:
markAsRead() - Marks a message as read

Example Usage:
// Get messages from a conversation
const messages = await Message.findByConversation('60d21b4667d0d8992e610c85', 20);

// Get recent messages for a user
const recentMessages = await Message.getRecentByUser('60d21b4667d0d8992e610c86', 5);

// Check unread message count
const unreadCount = await Message.getUnreadCount('60d21b4667d0d8992e610c86');

// Create a new message
const newMessage = new Message({
  content: 'Hello, how are you feeling today?',
  userId: '60d21b4667d0d8992e610c86',
  conversationId: '60d21b4667d0d8992e610c85',
  sender: 'ai',
  messageType: 'text'
});
await newMessage.save();

// Mark a message as read
const message = await Message.findById('60d21b4667d0d8992e610c87');
await message.markAsRead();

Dependencies:
    mongoose - MongoDB object modeling tool

Schema Fields:
    content (String): Required message text (1-2000 characters)
    userId (ObjectId): Reference to the User who owns this message
    conversationId (ObjectId): Required reference to the Conversation this message belongs to
    sender (String): Either 'user' or 'ai'
    messageType (String): Type of message ('text', 'suggestion', 'exercise', 'mood', 'resource')
    isRead (Boolean): Whether the message has been read
    metadata (Mixed): Flexible field for additional data
    expiresAt (Date): When the message should be automatically deleted (default: 90 days)
    timestamp: Automatic creation timestamp

Performance Optimizations:
Combined index on conversationId and timestamp for efficient conversation retrieval
Combined index on userId and timestamp for quick access to a user's messages
TTL index on expiresAt field for automatic cleanup of old messages
