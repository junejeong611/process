require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/emotionalsupportapp';

async function testMongoDBSetup() {
  console.log('--- MongoDB Setup Test ---');
  let testUserId = null;
  try {
    // 1. Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('1. Connected to MongoDB');

    // 2. Create a test user
    const testEmail = `testuser_${Date.now()}@example.com`;
    const testUser = new User({
      email: testEmail,
      password: 'Test1234', // Meets schema requirements
      name: 'Test User',
      firstName: 'Test',
      lastName: 'User'
    });
    await testUser.save();
    testUserId = testUser._id;
    console.log('2. Test user created:', testEmail);

    // 3. Retrieve the test user
    const foundUser = await User.findByEmail(testEmail);
    if (foundUser && foundUser.email === testEmail) {
      console.log('3. Test user retrieved successfully');
    } else {
      throw new Error('Test user could not be retrieved');
    }

    // 4. Delete the test user
    await User.deleteOne({ _id: testUserId });
    const deletedUser = await User.findById(testUserId);
    if (!deletedUser) {
      console.log('4. Test user deleted successfully');
    } else {
      throw new Error('Test user could not be deleted');
    }

    console.log('--- All steps completed successfully! ---');
    process.exit(0);
  } catch (err) {
    console.error('Test failed:', err.message);
    if (testUserId) {
      // Attempt cleanup if possible
      try {
        await User.deleteOne({ _id: testUserId });
      } catch (cleanupErr) {
        console.error('Cleanup failed:', cleanupErr.message);
      }
    }
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

testMongoDBSetup(); 