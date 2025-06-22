// scripts/force-password-reset.js
// This script addresses the issue of double-hashed passwords by:
// 1. Finding all users with a password set.
// 2. Nullifying their password field.
// 3. Setting a `passwordResetRequired` flag to true.
// This allows for a controlled password reset flow for affected users.

require('dotenv').config();
const mongoose = require('mongoose');
const getSecrets = require('../load');

const runReset = async () => {
  let User;
  try {
    console.log('🔐 Loading secrets for database connection...');
    const secrets = await getSecrets('process-it/dev/secrets');
    process.env.MONGODB_URI = secrets.MONGODB_URI;
    process.env.ENCRYPTION_SECRET = secrets.ENCRYPTION_SECRET;
    
    if (!process.env.MONGODB_URI || !process.env.ENCRYPTION_SECRET) {
        throw new Error('Database URI and Encryption Secret must be loaded.');
    }

    User = require('../models/User'); 

    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB.');
    
    // Find all users that have a password currently set.
    const usersToReset = await User.find({ password: { $ne: null } });

    if (usersToReset.length === 0) {
      console.log('✅ No users found with passwords to reset.');
      return;
    }

    console.log(`Found ${usersToReset.length} user(s) with passwords. Preparing to enforce reset...`);
    
    const bulkOps = usersToReset.map(user => ({
      updateOne: {
        filter: { _id: user._id },
        update: {
          $set: {
            password: null, // Nullify the corrupted password
            passwordResetRequired: true,
            // Also clear any MFA settings that might interfere with re-login
            mfa_enabled: false,
            mfa_secret: null,
            mfa_setup_completed: false,
            backup_codes: [],
          },
        },
      },
    }));

    if (bulkOps.length > 0) {
      const result = await User.bulkWrite(bulkOps);
      console.log(`\n✅ Successfully prepared ${result.modifiedCount} users for password reset.`);
    } else {
      console.log('No operations to perform.');
    }

  } catch (error) {
    console.error('An error occurred during the password reset process:', error);
  } finally {
    if (mongoose.connection.readyState === 1) {
      await mongoose.disconnect();
      console.log('Disconnected from MongoDB.');
    }
  }
};

runReset(); 