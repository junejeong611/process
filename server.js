// server.js
// Express server entry point for the Emotional Support App backend
// Integrates MongoDB, Claude API, and ElevenLabs API

console.log('UNIQUE LOG: If you see this, the code is up to date!');
console.log('server.js loaded');

require('dotenv').config(); // Load environment variables from .env file
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const mongoose = require('mongoose');
const rateLimit = require('express-rate-limit');
const compression = require('compression'); // Add compression for better performance
const getSecrets = require('./load');

// Import routes
const authRoutes = require('./routes/auth');
const chatRoutes = require('./routes/chat');
const voiceRoutes = require('./routes/voice');
const insightsRoutes = require('./routes/insights');
const voiceRecordRoute = require('./routes/record');
const subscriptionRoutes = require('./routes/subscription');
const stripeWebhook = require('./routes/stripeWebhook');

//collect secrets from secrets manager
(async () => {
  try {
    // Load secrets from AWS Secrets Manager
    console.log('🔐 Loading secrets from AWS Secrets Manager...');
    const secrets = await getSecrets('process-it/dev/secrets');
    console.log('✅ Secrets loaded successfully');
    console.log('Loaded secrets:', secrets);

    // Set them as environment variables
    console.log(secrets);
    process.env.MONGODB_URI = secrets.MONGODB_URI;
    process.env.ELEVENLABS_API_KEY = secrets.ELEVENLABS_API_KEY;
    process.env.CLAUDE_API_KEY = secrets.CLAUDE_API_KEY;
    process.env.JWT_SECRET = secrets.JWT_SECRET;
    process.env.COOKIE_SECRET = secrets.COOKIE_SECRET;
    process.env.EMAIL_USER = secrets.EMAIL_USER;
    process.env.EMAIL_PASS = secrets.EMAIL_PASS;
    process.env.EMAIL_FROM = secrets.EMAIL_FROM;
    process.env.CLIENT_URL = secrets.CLIENT_URL;
    process.env.STRIPE_WEBHOOK_SECRET = secrets.STRIPE_WEBHOOK_SECRET;
    process.env.STRIPE_PRODUCT_ID = secrets.STRIPE_PRODUCT_ID;
    process.env.STRIPE_SECRET_KEY = secrets.STRIPE_SECRET_KEY;
    process.env.STRIPE_PUBLISHABLE_KEY = secrets.STRIPE_PUBLISHABLE_KEY;
    process.env.STRIPE_PRICE_ID = secrets.STRIPE_PRICE_ID;
    process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON = secrets.GOOGLE_APPLICATION_CREDENTIALS_JSON;
    console.log('✅ Stripe secrets set successfully');

    // Debug logs for Stripe secrets
    console.log('Stripe Secret Key:', process.env.STRIPE_SECRET_KEY);
    console.log('Stripe Publishable Key:', process.env.STRIPE_PUBLISHABLE_KEY);
    console.log('Stripe Webhook Secret:', process.env.STRIPE_WEBHOOK_SECRET);
    console.log('Stripe Price ID:', process.env.STRIPE_PRICE_ID);

    // Initialize Stripe after secrets are loaded
    console.log('🔄 Initializing Stripe service...');
    const stripeService = require('./services/stripeService');
    console.log('✅ Stripe service initialized');

    // Start server after secrets are loaded
    startServer();
  } catch (err) {
    console.error('❌ Failed to load secrets:', err.message);
    process.exit(1);
  }
})();

function startServer() {
  // Initialize Express app
  const app = express();
  app.set('trust proxy', 1); // trust first proxy for correct rate limiting behind proxy
  const PORT = process.env.PORT || 5001;

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

  // For webhooks, mount the raw route directly BEFORE body parsers
  app.use('/api/webhooks/stripe', stripeWebhook);

  // Request parsing middleware
  app.use(express.json({ limit: '2mb' })); // Parse JSON request bodies with size limit
  app.use(express.urlencoded({ extended: true, limit: '2mb' }));

  // Apply rate limiting to API routes
  app.use('/api/', apiLimiter);

  // MongoDB connection with improved error handling and options
  const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/emotionalsupportapp';
  const mongooseOptions = {
    // These options are no longer needed with Mongoose 6+ but including for clarity
    serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
  };

  mongoose.connect(MONGODB_URI, mongooseOptions)
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => {
      console.error('MongoDB connection error:', err.message);
      console.log('Server will continue running, but database features will not work');
      // Don't exit in production or development
      // Just continue running with limited functionality
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
  console.log('Registering chat routes');
  app.use(`${API_PREFIX}/chat`, chatRoutes);
  app.use(`${API_PREFIX}/voice`, voiceRoutes);
  app.use(`${API_PREFIX}/insights`, insightsRoutes);
  app.use(`${API_PREFIX}/voicerecord`, voiceRecordRoute);
  app.use(`${API_PREFIX}/subscription`, subscriptionRoutes);
  app.use('/api/users', require('./routes/users'));

  // Maintain backward compatibility with original routes
  app.use('/api/auth', authRoutes);
  app.use('/api/chat', chatRoutes);
  app.use('/api/voice', voiceRoutes);
  app.use('/api/insights', insightsRoutes);

  app.use('/api/subscription', subscriptionRoutes);

  let serverReady = false;

  // Basic health check that works even during initialization
  app.get('/api/health/basic', (req, res) => {
    res.status(200).json({
      status: 'starting',
      ready: serverReady
    });
  });

  // Full health check - only returns 200 when fully ready
  app.get('/api/health', (req, res) => {
    console.log('Health check called. serverReady:', serverReady);
    try {
    if (serverReady) {
      res.status(200).json({ status: 'ok' });
    } else {
      res.status(503).json({ status: 'starting' });
      }
    } catch (err) {
      console.error('Health check error:', err);
      res.status(500).json({ status: 'error', error: err.message });
    }
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
  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on 0.0.0.0:${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`API URL: http://localhost:${PORT}${API_PREFIX}`);
  });

  // Set serverReady = true only after database connection and server start
  mongoose.connection.on('connected', () => {
    serverReady = true;
    console.log('serverReady set to true');
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
      mongoose.connection.close(false)
        .then(() => {
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

}