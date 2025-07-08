const express = require('express');
const router = express.Router();
const { verifyWebhookSignature } = require('../services/stripeService');

// Stripe webhook handler
router.post('/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
  const User = require('../models/User');
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;

  try {
    event = verifyWebhookSignature(req.body, sig, webhookSecret);
  } catch (err) {
    console.error('❌ Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  console.log('📥 Processing Stripe webhook event:', event.type);

  try {
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        const subscription = event.data.object;
        const customerId = subscription.customer;
        
        // Find user by Stripe customer ID
        const user = await User.findOne({ stripeCustomerId: customerId });
        if (!user) {
          console.error('❌ User not found for customer:', customerId);
          return res.status(404).json({ error: 'User not found' });
        }

        // Update user's subscription status
        user.subscriptionStatus = subscription.status;
        user.stripeSubscriptionId = subscription.id;
        user.currentPlan = subscription.items.data[0].price.nickname || 'default';
        user.currentPeriodStart = new Date(subscription.current_period_start * 1000);
        user.currentPeriodEnd = new Date(subscription.current_period_end * 1000);
        user.cancelAtPeriodEnd = subscription.cancel_at_period_end;

        if (subscription.trial_end) {
          user.trialEnd = new Date(subscription.trial_end * 1000);
        }

        await user.save();
        console.log('✅ Updated subscription status for user:', user.email);
        break;

      case 'customer.subscription.deleted':
        const deletedSubscription = event.data.object;
        const deletedUser = await User.findOne({ stripeCustomerId: deletedSubscription.customer });
        
        if (deletedUser) {
          deletedUser.subscriptionStatus = 'canceled';
          deletedUser.stripeSubscriptionId = null;
          deletedUser.currentPlan = null;
          deletedUser.currentPeriodStart = null;
          deletedUser.currentPeriodEnd = null;
          deletedUser.cancelAtPeriodEnd = false;
          await deletedUser.save();
          console.log('✅ Updated subscription status to canceled for user:', deletedUser.email);
        }
        break;
    }

    res.json({ received: true });
  } catch (error) {
    console.error('❌ Error processing webhook:', error);
    res.status(500).json({ error: 'Error processing webhook' });
  }
});

module.exports = router; 