// direct-test.js
const mongoose = require('mongoose');

// Print version information
console.log('Mongoose version:', mongoose.version);
console.log('MongoDB driver version:', require('mongodb/package.json').version);
console.log('Node.js version:', process.version);

// Direct connection string - avoid .env file for now
const MONGODB_URI = 'mongodb+srv://junejeong611:WF5skAEID95ZLub6@cluster0.6ocuckm.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';

console.log('Attempting to connect directly...');

mongoose.connect(MONGODB_URI)
  .then(() => {
    console.log('Success! Connected to MongoDB Atlas');
    mongoose.disconnect();
  })
  .catch(err => {
    console.error('Connection error:', err.message);
    // Print more details about the error
    if (err.code) {
      console.error('Error code:', err.code);
      console.error('Error codeName:', err.codeName);
    }
  });