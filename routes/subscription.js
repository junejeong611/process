const express = require('express');
const router = express.Router();
const authenticateToken = require('../middleware/auth');
const User = require('../models/User');
const {
  createCustomer,
  createCheckoutSession,
  createPortalSession
} = require('../services/stripeService');

// GET /api/subscription/status
router.get('/status', authenticateToken, async (req, res) => {
  console.log('📊 Fetching subscription status for user:', req.user.userId);
  try {
    const user = await User.findById(req.user.userId);
    if (!user) {
      console.error('❌ User not found');
      return res.status(404).json({ error: 'User not found' });
    }

    console.log('Current subscription status:', {
      status: user.subscriptionStatus,
      stripeCustomerId: user.stripeCustomerId,
      stripeSubscriptionId: user.stripeSubscriptionId,
      currentPlan: user.currentPlan,
      trialEnd: user.trialEnd,
      currentPeriodEnd: user.currentPeriodEnd
    });

    res.json({
      subscriptionStatus: user.subscriptionStatus,
      stripeCustomerId: user.stripeCustomerId,
      stripeSubscriptionId: user.stripeSubscriptionId,
      currentPlan: user.currentPlan,
      trialEnd: user.trialEnd,
      currentPeriodEnd: user.currentPeriodEnd,
      cancelAtPeriodEnd: user.cancelAtPeriodEnd
    });
  } catch (error) {
    console.error('❌ Error fetching subscription status:', error);
    res.status(500).json({ error: 'Error fetching subscription status' });
  }
});

// POST /api/subscription/create-checkout-session
router.post('/create-checkout-session', authenticateToken, async (req, res) => {
  console.log('🔑 Creating Stripe Checkout session for user:', req.user.userId);
  try {
    const user = await User.findById(req.user.userId);
    if (!user) {
      console.error('❌ User not found');
      return res.status(404).json({ error: 'User not found' });
    }

    // Create or get Stripe customer
    let customerId = user.stripeCustomerId;
    if (!customerId) {
      console.log('Creating new Stripe customer for user:', user.email);
      const customer = await createCustomer(user.email, {
        userId: user.userId
      });
      customerId = customer.id;
      user.stripeCustomerId = customerId;
      await user.save();
      console.log('✅ New Stripe customer created:', customerId);
    }

    const { successUrl, cancelUrl } = req.body;
    console.log('Using URLs:', { successUrl, cancelUrl });

    const session = await createCheckoutSession({
      customerId,
      priceId: process.env.STRIPE_PRICE_ID,
      successUrl: `${successUrl}?session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl
    });

    console.log('✅ Checkout session created successfully');
    res.json({ url: session.url });
  } catch (error) {
    console.error('❌ Error creating checkout session:', error);
    res.status(500).json({ error: 'Error creating checkout session' });
  }
});

// POST /api/subscription/create-portal-session
router.post('/create-portal-session', authenticateToken, async (req, res) => {
  console.log('🔑 Creating Stripe Customer Portal session for user:', req.user.userId);
  try {
    const user = await User.findById(req.user.userId);
    if (!user || !user.stripeCustomerId) {
      console.error('❌ User or Stripe customer ID not found');
      return res.status(400).json({ error: 'No subscription found' });
    }

    const session = await createPortalSession({
      customerId: user.stripeCustomerId,
      returnUrl: req.body.returnUrl
    });

    console.log('✅ Portal session created successfully');
    res.json({ url: session.url });
  } catch (error) {
    console.error('❌ Error creating portal session:', error);
    res.status(500).json({ error: 'Error creating portal session' });
  }
});

module.exports = router; 