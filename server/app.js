const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const passport = require('passport');
const authRoutes = require('./routes/auth');
const chatRoutes = require('./routes/chat');
const { configurePassport } = require('./middleware/auth');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(passport.initialize());

// Configure Passport
configurePassport();

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/chat', chatRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});

module.exports = app; 