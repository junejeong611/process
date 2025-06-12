const Stripe = require('stripe');

// Debug environment variables
console.log('Environment variables check:');
console.log('STRIPE_SECRET_KEY exists:', !!process.env.STRIPE_SECRET_KEY);
console.log('STRIPE_PUBLISHABLE_KEY exists:', !!process.env.STRIPE_PUBLISHABLE_KEY);
console.log('STRIPE_WEBHOOK_SECRET exists:', !!process.env.STRIPE_WEBHOOK_SECRET);
console.log('STRIPE_PRICE_ID exists:', !!process.env.STRIPE_PRICE_ID);
console.log('CLIENT_URL exists:', !!process.env.CLIENT_URL);

// Initialize Stripe with the secret key from environment variables
let stripeInstance;
try {
  if (!process.env.STRIPE_SECRET_KEY) {
    console.error('❌ STRIPE_SECRET_KEY is missing from environment variables');
    throw new Error('STRIPE_SECRET_KEY is required but not set');
  }
  
  stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2022-11-15',
  });
  console.log('✅ Stripe instance initialized successfully');
} catch (error) {
  console.error('❌ Failed to initialize Stripe:', error.message);
  throw error;
}

// Create a Stripe customer
async function createCustomer(email, metadata = {}) {
  return await stripeInstance.customers.create({ email, metadata });
}

// Create a Stripe Checkout session with 7-day free trial
async function createCheckoutSession({ customerId, priceId, successUrl, cancelUrl }) {
  return await stripeInstance.checkout.sessions.create({
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
  return await stripeInstance.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl
  });
}

// Verify and handle Stripe webhook events
function verifyWebhookSignature(rawBody, signature, stripeWebhookSecret) {
  if (!rawBody) throw new Error('No webhook payload was provided');
  if (!signature) throw new Error('No Stripe signature was provided');
  if (!stripeWebhookSecret) throw new Error('No webhook secret was provided');
  
  return stripeInstance.webhooks.constructEvent(rawBody, signature, stripeWebhookSecret);
}

module.exports = stripeInstance; 