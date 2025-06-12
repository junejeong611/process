const express = require('express');
const router = express.Router();
const { verifyWebhookSignature } = require('../services/stripeService');
const User = require('../models/User');

// Important: This route must use express.raw() to get the raw body
router.post('/', express.raw({ type: 'application/json' }), async (req, res) => {
  console.log('🔔 Webhook received!');
  console.log('Headers:', req.headers);
  console.log('Raw body length:', req.body ? req.body.length : 0);
  
  const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  console.log('Webhook secret exists:', !!stripeWebhookSecret);
  
  let event;
  try {
    console.log('Attempting to verify webhook signature...');
    // Pass the raw body buffer directly to verifyWebhookSignature
    event = verifyWebhookSignature(req.body, req.headers['stripe-signature'], stripeWebhookSecret);
    console.log('✅ Webhook signature verified successfully');
  } catch (err) {
    console.error('❌ Stripe webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  console.log('📦 Received Stripe webhook event:', event.type);
  console.log('Event data:', JSON.stringify(event.data.object, null, 2));

  try {
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object;
        const customerId = subscription.customer;
        console.log('🔄 Handling subscription event for customer:', customerId);
        console.log('Subscription status:', subscription.status);
        
        const user = await User.findOne({ stripeCustomerId: customerId });
        if (user) {
          console.log('👤 Found user:', user.email);
          console.log('Updating subscription status to:', subscription.status);
          
          user.stripeSubscriptionId = subscription.id;
          user.subscriptionStatus = subscription.status;
          user.currentPlan = subscription.items.data[0]?.price?.id || null;
          user.subscriptionRenewal = subscription.current_period_end ? new Date(subscription.current_period_end * 1000) : null;
          user.currentPeriodStart = subscription.current_period_start ? new Date(subscription.current_period_start * 1000) : null;
          user.currentPeriodEnd = subscription.current_period_end ? new Date(subscription.current_period_end * 1000) : null;
          user.cancelAtPeriodEnd = typeof subscription.cancel_at_period_end === 'boolean' ? subscription.cancel_at_period_end : false;
          
          if (subscription.trial_start) {
            user.trialStart = new Date(subscription.trial_start * 1000);
          }
          if (subscription.trial_end) {
            user.trialEnd = new Date(subscription.trial_end * 1000);
          }
          
          await user.save();
          console.log('✅ User subscription updated successfully');
        } else {
          console.error('❌ No user found for Stripe customer:', customerId);
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
      default:
        // Unhandled event type
        break;
    }
    res.json({ received: true });
  } catch (err) {
    console.error('❌ Error handling Stripe webhook event:', err);
    res.status(500).send('Webhook handler error');
  }
});

module.exports = router; 