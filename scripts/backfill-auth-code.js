// scripts/backfill-auth-code.js
// This script updates existing user documents to include an authentication code (_ac field)
// required by the mongoose-encryption plugin's `authenticated: true` option.
// This is necessary for existing data created before the option was enabled.

require('dotenv').config();
const mongoose = require('mongoose');
// We will require the User model *after* loading the encryption secret.
// const User = require('../models/User'); 
const getSecrets = require('../load');

const runMigration = async () => {
  try {
    console.log('🔐 Loading secrets from AWS Secrets Manager for database connection...');
    const secrets = await getSecrets('process-it/dev/secrets');
    process.env.MONGODB_URI = secrets.MONGODB_URI;
    process.env.ENCRYPTION_SECRET = secrets.ENCRYPTION_SECRET;
    
    if (!process.env.MONGODB_URI || !process.env.ENCRYPTION_SECRET) {
        throw new Error('Database URI and Encryption Secret must be loaded from secrets.');
    }

    // Now that the encryption secret is loaded, we can safely require the User model.
    const User = require('../models/User'); 

    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB.');

    const userCollection = mongoose.connection.db.collection('users');
    const usersToUpdate = await userCollection.find({ _ac: { $exists: false } }).toArray();

    if (usersToUpdate.length === 0) {
      console.log('✅ All user documents are already compliant. No migration needed.');
      return;
    }

    console.log(`Found ${usersToUpdate.length} user(s) missing an authentication code. Starting update...`);
    
    let successCount = 0;
    for (const rawUser of usersToUpdate) {
      try {
        // This is the key change:
        // Use `hydrate()` to create a Mongoose document from a raw object from the DB.
        // This correctly initializes the document's state without marking fields as modified.
        const user = User.hydrate(rawUser);

        // Now, `save()` will only run hooks for fields that are actually modified.
        // The `mongoose-encryption` hook will run (as it adds the `_ac` field),
        // but the `bcrypt` password hook will not, preventing the re-hashing.
        await user.save({ validateBeforeSave: false });
        
        console.log(`✅ Successfully updated user: ${user.email}`);
        successCount++;
      } catch (err) {
        console.error(`❌ Failed to update user with ID ${rawUser._id}:`, err.message);
      }
    }
    
    console.log(`\nMigration complete. ${successCount} out of ${usersToUpdate.length} users updated successfully.`);

  } catch (error) {
    console.error('An error occurred during the migration process:', error);
  } finally {
    if (mongoose.connection.readyState === 1) {
      await mongoose.disconnect();
      console.log('Disconnected from MongoDB.');
    }
  }
};

runMigration(); 