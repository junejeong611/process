require('dotenv').config();
const Stripe = require('stripe');

let stripeInstance = null;

function getStripeInstance() {
  if (!stripeInstance) {
    if (!process.env.STRIPE_SECRET_KEY) {
      console.error('❌ STRIPE_SECRET_KEY is missing from environment variables');
      throw new Error('STRIPE_SECRET_KEY is required but not set');
    }
    stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2022-11-15',
    });
    console.log('✅ Stripe instance initialized successfully');
  }
  return stripeInstance;
}

// Create a Stripe customer
async function createCustomer(email, metadata = {}) {
  return await getStripeInstance().customers.create({ email, metadata });
}

// Create a Stripe Checkout session with 7-day free trial
async function createCheckoutSession({ customerId, priceId, successUrl, cancelUrl }) {
  return await getStripeInstance().checkout.sessions.create({
    mode: 'subscription',
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    subscription_data: {
      trial_period_days: 7
    },
    payment_method_collection: 'always',
    success_url: successUrl,
    cancel_url: cancelUrl
  });
}

// Create a Stripe Customer Portal session
async function createPortalSession({ customerId, returnUrl }) {
  return await getStripeInstance().billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl
  });
}

// Verify and handle Stripe webhook events
function verifyWebhookSignature(rawBody, signature, stripeWebhookSecret) {
  if (!rawBody) throw new Error('No webhook payload was provided');
  if (!signature) throw new Error('No Stripe signature was provided');
  if (!stripeWebhookSecret) throw new Error('No webhook secret was provided');
  return getStripeInstance().webhooks.constructEvent(rawBody, signature, stripeWebhookSecret);
}

module.exports = {
  getStripeInstance,
  createCustomer,
  createCheckoutSession,
  createPortalSession,
  verifyWebhookSignature
}; 