const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const User = require('../models/User');
const {
  createCustomer,
  createCheckoutSession,
  createPortalSession,
  verifyWebhookSignature
} = require('../services/stripeService');

// POST /api/subscription/create-checkout-session
router.post('/create-checkout-session', auth, async (req, res) => {
  try {
    const user = req.user;
    // If user does not have a Stripe customer ID, create one
    let stripeCustomerId = user.stripeCustomerId;
    if (!stripeCustomerId) {
      const customer = await createCustomer(user.email, { userId: user._id.toString() });
      stripeCustomerId = customer.id;
      user.stripeCustomerId = stripeCustomerId;
      await user.save();
    }

    // Create Stripe Checkout session
    const session = await createCheckoutSession({
      customerId: stripeCustomerId,
      priceId: process.env.STRIPE_PRICE_ID,
      successUrl: req.body.successUrl || 'http://localhost:3000/subscription/success',
      cancelUrl: req.body.cancelUrl || 'http://localhost:3000/subscription/cancel'
    });

    res.json({ url: session.url });
  } catch (error) {
    console.error('Stripe checkout session error:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/subscription/create-portal-session
router.post('/create-portal-session', auth, async (req, res) => {
  try {
    const user = req.user;
    if (!user.stripeCustomerId) {
      return res.status(400).json({ error: 'No Stripe customer ID found for user.' });
    }
    const returnUrl = req.body.returnUrl || 'http://localhost:3000/subscription/manage';
    const session = await createPortalSession({
      customerId: user.stripeCustomerId,
      returnUrl
    });
    res.json({ url: session.url });
  } catch (error) {
    console.error('Stripe portal session error:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/subscription/status
router.get('/status', auth, async (req, res) => {
  // TODO: Implement logic to return current user's subscription status
  res.json({ message: 'Not implemented yet' });
});

// POST /api/webhooks/stripe
router.post('/webhooks/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
  // TODO: Implement logic to verify and handle Stripe webhook events
  res.json({ message: 'Not implemented yet' });
});

module.exports = router; 