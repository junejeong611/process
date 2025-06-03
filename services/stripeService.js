const Stripe = require('stripe');
let stripeInstance = null;

// This function should be called after loading secrets from AWS
function initializeStripe(secretKey) {
  stripeInstance = new Stripe(secretKey, {
    apiVersion: '2022-11-15',
  });
}

// Create a Stripe customer
async function createCustomer(email, metadata = {}) {
  if (!stripeInstance) throw new Error('Stripe not initialized');
  return await stripeInstance.customers.create({ email, metadata });
}

// Create a Stripe Checkout session with 7-day free trial
async function createCheckoutSession({ customerId, priceId, successUrl, cancelUrl }) {
  if (!stripeInstance) throw new Error('Stripe not initialized');
  return await stripeInstance.checkout.sessions.create({
    mode: 'subscription',
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    subscription_data: {
      trial_period_days: 7
    },
    success_url: successUrl,
    cancel_url: cancelUrl
  });
}

// Create a Stripe Customer Portal session
async function createPortalSession({ customerId, returnUrl }) {
  if (!stripeInstance) throw new Error('Stripe not initialized');
  return await stripeInstance.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl
  });
}

// Verify and handle Stripe webhook events
function verifyWebhookSignature(request, stripeWebhookSecret) {
  const signature = request.headers['stripe-signature'];
  if (!stripeInstance) throw new Error('Stripe not initialized');
  return stripeInstance.webhooks.constructEvent(request.rawBody, signature, stripeWebhookSecret);
}

module.exports = {
  initializeStripe,
  createCustomer,
  createCheckoutSession,
  createPortalSession,
  verifyWebhookSignature
}; 