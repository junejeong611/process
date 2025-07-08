// scripts/reset-unreadable-users.js
// Resets encrypted fields for users whose data cannot be decrypted with the current ENCRYPTION_SECRET.

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

  // Get all user IDs first (to avoid decryption errors on find)
  const User = require('../models/User');
  const userIds = await User.find({}, { _id: 1 }).lean();

  let resetCount = 0;
  let deleteCount = 0;
  for (const { _id } of userIds) {
    let user;
    try {
      user = await User.findById(_id);
      // Try to access encrypted fields
      void user.name;
      void user.firstName;
      void user.lastName;
    } catch (e) {
      if (user) {
        // If user loaded but fields fail, reset fields
        user.name = '';
        user.firstName = '';
        user.lastName = '';
        try {
          await user.save();
          resetCount++;
          console.log(`Reset encrypted fields for user _id: ${user._id}, email: ${user.email}`);
        } catch (err) {
          console.error(`Failed to reset user _id: ${user._id}:`, err.message);
        }
      } else {
        // If user couldn't be loaded at all, delete the user
        try {
          await User.deleteOne({ _id });
          deleteCount++;
          console.log(`Deleted user _id: ${_id} (could not be decrypted at all)`);
        } catch (err) {
          console.error(`Failed to delete user _id: ${_id}:`, err.message);
        }
      }
    }
  }
  console.log(`\nDone. Reset ${resetCount} users, deleted ${deleteCount} users.`);
  await mongoose.disconnect();
  process.exit(0);
};

main(); 