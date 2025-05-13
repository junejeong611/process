require('dotenv').config();
const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI;
console.log("Attempting to connect to:", MONGODB_URI.replace(/:[^:]*@/, ':****@'));

mongoose.connect(MONGODB_URI)
  .then(() => {
    console.log('Successfully connected to MongoDB Atlas');
    mongoose.disconnect();
  })
  .catch(err => {
    console.error('MongoDB connection error:', err);
  }); 