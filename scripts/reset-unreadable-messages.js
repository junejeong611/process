require('dotenv').config();

const main = async () => {
  const mongoose = require('mongoose');
  const MONGODB_URI = process.env.MONGODB_URI;

  if (!MONGODB_URI || !process.env.ENCRYPTION_SECRET) {
    console.error('Error: MONGODB_URI and ENCRYPTION_SECRET must be set in your .env file.');
    process.exit(1);
  }

  await mongoose.connect(MONGODB_URI);
  console.log('Connected to MongoDB.');

  // Get all message IDs first (to avoid decryption errors on find)
  const Message = require('../models/Message');
  const messageIds = await Message.find({}, { _id: 1 }).lean();

  let deleteCount = 0;
  for (const { _id } of messageIds) {
    let message;
    try {
      message = await Message.findById(_id);
      // Try to access encrypted field
      void message.content;
    } catch (e) {
      // If message can't be loaded or decrypted, delete it
      try {
        await Message.deleteOne({ _id });
        deleteCount++;
        console.log(`Deleted message _id: ${_id} (could not be decrypted)`);
      } catch (err) {
        console.error(`Failed to delete message _id: ${_id}:`, err.message);
      }
    }
  }
  console.log(`\nDone. Deleted ${deleteCount} messages.`);
  await mongoose.disconnect();
  process.exit(0);
};

main(); 