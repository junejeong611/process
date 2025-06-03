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
  try {
    const user = req.user;
    res.json({
      trialStart: user.trialStart,
      trialEnd: user.trialEnd,
      subscriptionStatus: user.subscriptionStatus,
      stripeCustomerId: user.stripeCustomerId,
      stripeSubscriptionId: user.stripeSubscriptionId,
      currentPlan: user.currentPlan
    });
  } catch (error) {
    console.error('Subscription status error:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/webhooks/stripe
router.post('/webhooks/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
  const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  let event;
  try {
    event = verifyWebhookSignature(req, stripeWebhookSecret);
  } catch (err) {
    console.error('Stripe webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  try {
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object;
        const customerId = subscription.customer;
        const user = await User.findOne({ stripeCustomerId: customerId });
        if (user) {
          user.stripeSubscriptionId = subscription.id;
          user.subscriptionStatus = subscription.status;
          user.currentPlan = subscription.items.data[0]?.price?.id || null;
          user.trialEnd = subscription.trial_end ? new Date(subscription.trial_end * 1000) : null;
          await user.save();
        }
        break;
      }
      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        const customerId = subscription.customer;
        const user = await User.findOne({ stripeCustomerId: customerId });
        if (user) {
          user.subscriptionStatus = 'canceled';
          user.stripeSubscriptionId = null;
          user.currentPlan = null;
          await user.save();
        }
        break;
      }
      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        const customerId = invoice.customer;
        const user = await User.findOne({ stripeCustomerId: customerId });
        if (user) {
          user.subscriptionStatus = 'past_due';
          await user.save();
        }
        break;
      }
      // Add more event types as needed
      default:
        // Unhandled event type
        break;
    }
    res.json({ received: true });
  } catch (err) {
    console.error('Error handling Stripe webhook event:', err);
    res.status(500).send('Webhook handler error');
  }
});

module.exports = router; 