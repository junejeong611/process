# Conversation.js

## Purpose of the Conversation.js File:
This file creates a data model for conversations that:
- **Stores Communication**: Captures user and AI interactions in a structured format.
- **Organizes Content**: Groups messages into conversations for context maintenance.
- **Tracks Activity Status**: Monitors whether conversations are active or archived.
- **Supports Tagging**: Allows conversations to be tagged for better organization.
- **Manages Data Lifecycle**: Provides methods to update conversation status and message counts.
- **Provides Query Methods**: Makes it easy to retrieve conversations in useful ways.

## How it works:
- **Schema Definition**: Creates a MongoDB schema with fields for user reference, title, summary, last message timestamp, activity status, tags, and message count.
- **Indexes**: Defines strategic indexes for efficient querying, including indexes on `userId`, `lastMessageAt`, `isActive`, and `tags`.
- **Static Methods**: Provides methods to find conversations by user, get active conversations, and find conversations by tag.
- **Instance Methods**: Includes methods to update the last message timestamp, increment the message count, and archive conversations.
- **Virtuals**: Creates a virtual field for messages that can be populated with related message data.

## How to use (methods, example usage):

### Static Methods:
- **findByUser(userId)**: Retrieves all conversations for a specific user.
- **getActiveByUser(userId, limit)**: Retrieves active conversations for a user, limited by a specified number.
- **findByTag(userId, tag)**: Retrieves conversations for a user that match a specific tag.

### Instance Methods:
- **updateLastMessageTime()**: Updates the `lastMessageAt` field to the current time.
- **incrementMessageCount()**: Increments the `messageCount` field.
- **archive()**: Marks the conversation as inactive.

### Example Usage:
```javascript
// Find all conversations for a user
const conversations = await Conversation.findByUser(userId);

// Get active conversations for a user
const activeConversations = await Conversation.getActiveByUser(userId, 10);

// Find conversations by tag
const taggedConversations = await Conversation.findByTag(userId, 'important');

// Create a new conversation
const newConversation = new Conversation({
  userId: '60d21b4667d0d8992e610c86',
  title: 'New Conversation',
  summary: 'Initial conversation summary',
  tags: ['important']
});
await newConversation.save();

// Update last message time
await newConversation.updateLastMessageTime();

// Increment message count
await newConversation.incrementMessageCount();

// Archive a conversation
await newConversation.archive();
```

## Dependencies:
- **mongoose**: MongoDB object modeling tool.

## Schema Fields:
- **userId (ObjectId)**: Reference to the User who owns this conversation.
- **title (String)**: Title of the conversation, with a default of 'New Conversation'.
- **summary (String)**: A brief summary of the conversation.
- **lastMessageAt (Date)**: Timestamp of the last message in the conversation.
- **isActive (Boolean)**: Whether the conversation is active or archived.
- **tags (Array)**: Array of tags for categorizing the conversation.
- **messageCount (Number)**: Count of messages in the conversation.

## Performance Optimizations:
- Combined index on `userId` and `lastMessageAt` for efficient retrieval of conversations by user and sorting by last message time.
- Combined index on `userId`, `isActive`, and `lastMessageAt` for retrieving active conversations by user and sorting by last message time.
- Index on `tags` for efficient retrieval of conversations by tag.