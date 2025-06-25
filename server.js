// server.js
// Express server entry point for the Emotional Support App backend
// Integrates MongoDB, Claude API, and ElevenLabs API

require('dotenv').config(); // Load environment variables from .env file

// Import the new secrets loader first
const { loadSecrets } = require('./services/secretsManager');

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const mongoose = require('mongoose');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const lusca = require('lusca');
const { apiLimiter } = require('./middleware/rateLimiter');
const { loadKeys } = require('./services/keyService');


// --- Main application startup logic ---
async function startApp() {
  try {
    // Load secrets from AWS Secrets Manager at the very beginning
    await loadSecrets();
    console.log('DEBUG: ENCRYPTION_SECRET loaded:', process.env.ENCRYPTION_SECRET ? 'yes' : 'no');

    // Now that secrets are loaded, we can require all other modules
    const stripeService = require('./services/stripeService');
    const authRoutes = require('./routes/auth');
    const chatRoutes = require('./routes/chat');
    const voiceRoutes = require('./routes/voice');
    const insightsRoutes = require('./routes/insights');
    const voiceRecordRoute = require('./routes/record');
    const subscriptionRoutes = require('./routes/subscription');
    const stripeWebhook = require('./routes/stripeWebhook');
    const adminRoutes = require('./routes/admin');
    const session = require('express-session');
    const auth = require('./middleware/auth');
    const requireAdmin = require('./middleware/admin');
    
    // Load server encryption keys
    loadKeys();

    // Initialize Express app
    const app = express();
    app.set('trust proxy', 1);
    const PORT = process.env.PORT || 5001;

    // Top-level debug middleware
    app.use((req, res, next) => {
      console.log('[DEBUG] Top-level:', req.method, req.originalUrl);
      next();
    });

    // --- Start of Express middleware setup ---
    // Set essential security headers first
    app.use(helmet()); 
    
    // Enable CORS with credentials
    const corsOptions = {
      origin: process.env.CLIENT_URL || 'http://localhost:3000',
      credentials: true
    };
    app.use(cors(corsOptions));

    // Then, set up remaining middleware
    app.use(compression());
    app.use(cookieParser(process.env.COOKIE_SECRET));

    app.use(session({
      secret: process.env.COOKIE_SECRET,
      resave: false,
      saveUninitialized: true,
      cookie: { 
        secure: false,
        httpOnly: true,
        sameSite: 'lax'
      }
    }));

    // Parse JSON and urlencoded bodies BEFORE routes that need req.body
    app.use(express.json({ limit: '2mb' }));
    app.use(express.urlencoded({ extended: true, limit: '2mb' }));

    // --- API Routes that should NOT have CSRF protection ---
    const API_PREFIX = '/api/v1';
    app.use(`${API_PREFIX}/auth`, authRoutes);

    // Lusca must come after session and cookieParser, but AFTER auth routes
    app.use(lusca({
      csrf: {
        angular: false,
        methods: ['POST', 'PUT', 'DELETE', 'PATCH'] // Only require CSRF for these methods
      },
      xframe: 'SAMEORIGIN',
      hsts: { maxAge: 31536000 },
      xssProtection: true,
      nosniff: true,
      referrerPolicy: 'same-origin'
    }));

    // Now req.csrfToken is available!
    app.get('/api/v1/csrf-token', (req, res) => {
      res.json({ csrfToken: req.csrfToken() });
    });

    app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

    app.use('/api/webhooks/stripe', stripeWebhook);
    
    // Apply rate limiting AFTER static assets and essential routes
    app.use('/api/', apiLimiter);

    // --- MongoDB Connection ---
    let serverReady = false;
    const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/emotionalsupportapp';
    mongoose.connect(MONGODB_URI)
      .then(() => {
        serverReady = true; // Set ready status after DB connection
      })
      .catch(err => console.error('MongoDB connection error:', err.message));

    
    // --- API Routes ---
    app.use('/api/admin', auth, requireAdmin, adminRoutes);
    app.use(`${API_PREFIX}/chat`, chatRoutes);
    app.use(`${API_PREFIX}/voice`, voiceRoutes);
    app.use(`${API_PREFIX}/insights`, insightsRoutes);
    app.use(`${API_PREFIX}/voicerecord`, voiceRecordRoute);
    app.use(`${API_PREFIX}/subscription`, subscriptionRoutes);
    
    // --- Health Checks ---
    app.get('/api/health', (req, res) => {
        if (serverReady && mongoose.connection.readyState === 1) {
            res.status(200).json({ status: 'ok', database: 'connected' });
        } else {
            res.status(503).json({ status: 'starting', database: 'connecting' });
        }
    });

    // --- 404 and Error Handlers ---
    // Debug unmatched routes
    app.use((req, res, next) => {
        console.log('[DEBUG] Unmatched route:', req.method, req.originalUrl);
        next();
    });
    // Handle 404 - must be after all other routes
    app.use((req, res, next) => {
        res.status(404).json({ message: "Sorry, that route doesn't exist." });
    });

    // Final error handler
    app.use((err, req, res, next) => {
        console.error("Global error handler:", err.stack);
        res.status(500).json({ message: "Something went wrong on our end." });
    });

    // --- Server Listen ---
    const server = app.listen(PORT, () => {
    });

    // --- Graceful Shutdown ---
    process.on('SIGTERM', () => {
        server.close(() => {
            mongoose.connection.close(false).then(() => {
                process.exit(0);
            });
        });
    });

  } catch (err) {
    console.error('❌ FATAL: Failed to start application:', err.message);
    process.exit(1);
  }
}

// Start the application
startApp();