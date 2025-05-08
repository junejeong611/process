// server.js
// Express server entry point for the Emotional Support App backend
// Integrates MongoDB, Claude API, and ElevenLabs API

require('dotenv').config(); // Load environment variables from .env file
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const mongoose = require('mongoose');
const rateLimit = require('express-rate-limit');
const compression = require('compression'); // Add compression for better performance

// Import routes
const authRoutes = require('./routes/auth');
// const userRoutes = require('./routes/users');
const chatRoutes = require('./routes/chat');
const voiceRoutes = require('./routes/voice'); // For ElevenLabs integration

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 5000;

// Enable compression for all responses
app.use(compression());

// API rate limiting for security
const apiLimiter = rateLimit({
  windowMs: process.env.RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000, // Use env var if available
  max: process.env.RATE_LIMIT_MAX_REQUESTS || 100, // Use env var if available
  standardHeaders: true,
  message: 'Too many requests from this IP, please try again later.'
});

// Enhanced security headers
app.use(helmet({
  contentSecurityPolicy: process.env.NODE_ENV === 'production' ? undefined : false, // Disable CSP in development
}));

// Logger middleware - different formats for dev and production
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// CORS configuration with more options
const corsOptions = {
  origin: process.env.CLIENT_URL || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: true,
  maxAge: 86400 // Cache preflight request for 1 day
};
app.use(cors(corsOptions));

// Request parsing middleware
app.use(express.json({ limit: '2mb' })); // Parse JSON request bodies with size limit
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

// Apply rate limiting to API routes
app.use('/api/', apiLimiter);

// MongoDB connection with improved error handling and options
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/emotionalsupportapp';
const mongooseOptions = {
  // These options are no longer needed with Mongoose 6+ but including for clarity
  // autoIndex: process.env.NODE_ENV !== 'production', // Don't build indexes in production
};

mongoose.connect(MONGODB_URI, mongooseOptions)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => {
    console.error('MongoDB connection error:', err);
    // Exit process with failure in development
    if (process.env.NODE_ENV !== 'production') {
      process.exit(1);
    }
  });

// Check API keys on startup with more detailed messaging
const checkRequiredEnvVars = () => {
  const required = ['JWT_SECRET', 'CLAUDE_API_KEY', 'ELEVENLABS_API_KEY'];
  const missing = required.filter(varName => !process.env[varName]);
  
  if (missing.length > 0) {
    console.warn(`⚠️ Missing environment variables: ${missing.join(', ')}`);
    console.warn('Some functionality may not work as expected.');
    
    // More specific warnings
    if (!process.env.JWT_SECRET) {
      console.warn('JWT_SECRET is missing: Authentication will not work properly');
    }
    if (!process.env.CLAUDE_API_KEY) {
      console.warn('CLAUDE_API_KEY is missing: Text chat functionality will be unavailable');
    }
    if (!process.env.ELEVENLABS_API_KEY) {
      console.warn('ELEVENLABS_API_KEY is missing: Voice synthesis will be unavailable');
    }
  } else {
    console.log('✅ All required environment variables are set');
  }
};
checkRequiredEnvVars();

// API routes with version prefix for future-proofing
const API_PREFIX = '/api/v1';
app.use(`${API_PREFIX}/auth`, authRoutes);
app.use(`${API_PREFIX}/users`, userRoutes);
app.use(`${API_PREFIX}/chat`, chatRoutes);
app.use(`${API_PREFIX}/voice`, voiceRoutes);

// Maintain backward compatibility with original routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/voice', voiceRoutes);

// Health check route with enhanced diagnostics
app.get('/api/health', (req, res) => {
  const healthInfo = {
    status: 'Server is running',
    timestamp: new Date(),
    uptime: `${Math.floor(process.uptime())} seconds`,
    environment: process.env.NODE_ENV || 'development',
    mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    apis: {
      claude: !!process.env.CLAUDE_API_KEY ? 'configured' : 'missing',
      elevenLabs: !!process.env.ELEVENLABS_API_KEY ? 'configured' : 'missing'
    },
    memory: {
      rss: `${Math.round(process.memoryUsage().rss / 1024 / 1024)} MB`,
      heapTotal: `${Math.round(process.memoryUsage().heapTotal / 1024 / 1024)} MB`,
      heapUsed: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)} MB`
    }
  };
  res.json(healthInfo);
});

// 404 handler - must come before error handler
app.use((req, res, next) => {
  res.status(404).json({
    error: true,
    message: `Route not found: ${req.originalUrl}`
  });
});

// Error handling middleware with improved logging
app.use((err, req, res, next) => {
  // Generate request identifier for tracking errors
  const errorId = Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
  
  // Log error details
  console.error(`ERROR [${errorId}]:`, err.name || 'UnknownError');
  console.error(`[${errorId}] Path:`, req.method, req.originalUrl);
  console.error(`[${errorId}] Message:`, err.message);
  console.error(`[${errorId}] Stack:`, err.stack);
  
  // Send appropriate response to client
  res.status(err.status || 500).json({
    error: true,
    errorId: errorId, // Include for support reference
    message: process.env.NODE_ENV === 'production'
      ? 'Internal server error'
      : err.message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
  });
});

// Serve static assets in production
if (process.env.NODE_ENV === 'production') {
  // Set cache headers for static assets
  app.use(express.static(path.join(__dirname, 'client/build'), {
    maxAge: '1d' // Cache static assets for 1 day
  }));
  
  app.get('*', (req, res) => {
    res.sendFile(path.resolve(__dirname, 'client', 'build', 'index.html'));
  });
}

// Start the server
const server = app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`API URL: http://localhost:${PORT}${API_PREFIX}`);
});

// Graceful shutdown with timeout
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  
  // Set a timeout for forceful shutdown if graceful shutdown takes too long
  setTimeout(() => {
    console.error('Forceful shutdown initiated after timeout');
    process.exit(1);
  }, 30000); // 30 seconds timeout
  
  server.close(() => {
    console.log('Server closed');
    mongoose.connection.close(false, () => {
      console.log('MongoDB connection closed');
      process.exit(0);
    });
  });
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION:');
  console.error(err);
  
  // Gracefully shut down in development, stay running in production
  if (process.env.NODE_ENV !== 'production') {
    process.exit(1);
  }
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Promise Rejection:');
  console.error(err);
  // Don't crash the server in production
  if (process.env.NODE_ENV !== 'production') {
    process.exit(1);
  }
});