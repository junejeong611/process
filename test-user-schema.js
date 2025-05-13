require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/emotionalsupportapp';

async function runUserSchemaTests() {
  console.log('--- User Schema & DB Utility Test ---');
  let testUserId = null;
  let testEmail = `testuser_${Date.now()}@example.com`;
  try {
    // 1. Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // 2. Test: Create a user with valid data
    const testUser = new User({
      email: testEmail,
      password: 'Test1234',
      name: 'Test User',
      firstName: 'Test',
      lastName: 'User'
    });
    await testUser.save();
    testUserId = testUser._id;
    console.log('User created:', testEmail);

    // 3. Test: Password is hashed
    if (testUser.password === 'Test1234') {
      throw new Error('Password was not hashed');
    } else {
      console.log('Password hashing: OK');
    }

    // 4. Test: comparePassword instance method
    const isMatch = await testUser.comparePassword('Test1234');
    if (!isMatch) throw new Error('comparePassword failed');
    console.log('comparePassword: OK');

    // 5. Test: Static method findByEmail
    const foundUser = await User.findByEmail(testEmail);
    if (!foundUser || foundUser.email !== testEmail) {
      throw new Error('findByEmail failed');
    }
    console.log('findByEmail: OK');

    // 6. Test: Virtual fullName
    if (foundUser.fullName !== 'Test User') {
      throw new Error('fullName virtual failed');
    }
    console.log('fullName virtual: OK');

    // 7. Test: Update lastLogin
    await foundUser.updateLoginTimestamp();
    if (!foundUser.lastLogin) throw new Error('updateLoginTimestamp failed');
    console.log('updateLoginTimestamp: OK');

    // 8. Test: Duplicate email error
    let duplicateError = false;
    try {
      const dupUser = new User({
        email: testEmail,
        password: 'Test1234',
        name: 'Dup User'
      });
      await dupUser.save();
    } catch (err) {
      duplicateError = true;
      console.log('Duplicate email error: OK');
    }
    if (!duplicateError) throw new Error('Duplicate email not detected');

    // 9. Test: Validation error (invalid email)
    let validationError = false;
    try {
      const badUser = new User({
        email: 'notanemail',
        password: 'Test1234',
        name: 'Bad User'
      });
      await badUser.save();
    } catch (err) {
      validationError = true;
      console.log('Validation error (invalid email): OK');
    }
    if (!validationError) throw new Error('Validation error not detected');

    // 10. Test: Delete user
    await User.deleteOne({ _id: testUserId });
    const deletedUser = await User.findById(testUserId);
    if (!deletedUser) {
      console.log('User deletion: OK');
    } else {
      throw new Error('User deletion failed');
    }

    console.log('--- All User schema/database utility tests passed! ---');
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
    console.log('Disconnected from MongoDB');
  }
}

runUserSchemaTests(); 