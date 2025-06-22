// scripts/encrypt-existing-data.js
// One-time script to encrypt existing data in the database after enabling encryption.

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const Message = require('../models/Message');

const MONGODB_URI = process.env.MONGODB_URI;
const ENCRYPTION_SECRET = process.env.ENCRYPTION_SECRET;

if (!MONGODB_URI || !ENCRYPTION_SECRET) {
  console.error('Error: MONGODB_URI and ENCRYPTION_SECRET must be set in your .env file.');
  process.exit(1);
}

const encryptData = async () => {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('MongoDB connected.');

    // --- Encrypt User Data ---
    console.log('\nStarting user data encryption...');
    // Find users where 'name' is still a string (i.e., not an encrypted object)
    const unencryptedUsers = await User.find({ 'name._ct': { $exists: false }, name: { $ne: null } });
    
    if (unencryptedUsers.length === 0) {
      console.log('No unencrypted users found. Skipping.');
    } else {
      console.log(`Found ${unencryptedUsers.length} user(s) to encrypt.`);
      let userCount = 0;
      for (const user of unencryptedUsers) {
        // Re-saving the document will trigger the pre-save hook from mongoose-encryption
        await user.save();
        userCount++;
        process.stdout.write(`Encrypted ${userCount}/${unencryptedUsers.length} users\r`);
      }
      console.log(`\nSuccessfully encrypted ${userCount} users.`);
    }

    // --- Encrypt Message Data ---
    console.log('\nStarting message data encryption...');
    // Find messages where 'content' is still a string
    const unencryptedMessages = await Message.find({ 'content._ct': { $exists: false } });

    if (unencryptedMessages.length === 0) {
      console.log('No unencrypted messages found. Skipping.');
    } else {
      console.log(`Found ${unencryptedMessages.length} message(s) to encrypt.`);
      let messageCount = 0;
      for (const message of unencryptedMessages) {
        await message.save();
        messageCount++;
        process.stdout.write(`Encrypted ${messageCount}/${unencryptedMessages.length} messages\r`);
      }
      console.log(`\nSuccessfully encrypted ${messageCount} messages.`);
    }

    console.log('\nData migration completed successfully!');

  } catch (error) {
    console.error('\nAn error occurred during the encryption script:', error);
  } finally {
    await mongoose.disconnect();
    console.log('MongoDB disconnected.');
    process.exit(0);
  }
};

encryptData(); 