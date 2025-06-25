const express = require('express');
const router = express.Router();
const streamingMetricsService = require('../services/streamingMetricsService');
const requireAdmin = require('../middleware/admin');
const auth = require('../middleware/auth');

// Apply auth and admin middleware to all routes in this file
router.use(auth);
router.use(requireAdmin);

// This route is for the frontend to check if the user is an admin.
// The requireAdmin middleware will have already run, so if the request
// gets to this handler, the user is an admin.
router.get('/check-access', (req, res) => {
  res.status(200).json({ isAdmin: true });
});

// Endpoint to get the dashboard metrics
router.get('/metrics', (req, res) => {
    try {
        const summary = streamingMetricsService.getDashboardSummary();
        res.status(200).json(summary);
    } catch (error) {
        console.error('Failed to get dashboard metrics:', error);
        res.status(500).json({ error: 'Failed to retrieve metrics' });
    }
});

// Main dashboard overview
router.get('/dashboard', (req, res) => {
    res.json({ message: 'Welcome to the admin performance dashboard.' });
});

// Detailed streaming analytics
router.get('/streaming-metrics', (req, res) => {
    res.json({ message: 'Streaming metrics will be displayed here.' });
});

// API health status
router.get('/api-health', (req, res) => {
    res.json({ message: 'API health status will be displayed here.' });
});

// Aggregate user experience data
router.get('/user-analytics', (req, res) => {
    res.json({ message: 'User analytics will be displayed here.' });
});

// System logs
router.get('/system-logs', (req, res) => {
    res.json({ message: 'System logs will be displayed here.' });
});

module.exports = router; 