# Stripe Setup Guide for Local Development

This guide will help you set up Stripe webhooks locally so that subscription features work properly in your development environment.

## Prerequisites

- Node.js and npm installed
- A Stripe account (free at [stripe.com](https://stripe.com))
- Your backend server running on `localhost:5001`

## Step 1: Install Stripe CLI

### macOS
```bash
brew install stripe/stripe-cli/stripe
```

### Windows
Download from [Stripe CLI Releases](https://github.com/stripe/stripe-cli/releases) or use:
```bash
choco install stripe
```

### Linux
```bash
curl -fsSL https://stripe.com/install.sh | bash
```

## Step 2: Log In to Stripe

```bash
stripe login
```

This will open your browser to authenticate with your Stripe account. Follow the prompts to complete the login.

## Step 3: Start Your Backend Server

Make sure your backend server is running:

```bash
# In your project root directory
npm start
# or
node server.js
```

Your server should be running on `http://localhost:5001`

## Step 4: Forward Stripe Webhooks

In a **new terminal window**, run:

```bash
stripe listen --forward-to localhost:5001/api/webhooks/stripe
```

You should see output like:
```
> Ready! Your webhook signing secret is whsec_xxxxxxxxxxxxxxxxxxxxx
```

**Keep this terminal window open** - it needs to stay running to forward webhooks.

## Step 5: Test the Setup

### Option A: Use the Website
1. Open your frontend application (usually `http://localhost:3000`)
2. Try to subscribe to a plan
3. Complete the Stripe checkout
4. Check your backend logs to see if webhooks are being received

### Option B: Trigger Test Events
In another terminal, you can trigger test events:

```bash
# Test a successful subscription
stripe trigger checkout.session.completed

# Test a payment success
stripe trigger payment_intent.succeeded

# Test a subscription update
stripe trigger customer.subscription.updated
```

## Step 6: Verify Everything Works

### Check Backend Logs
Look for webhook events in your backend console:
```
Received webhook: checkout.session.completed
Processing subscription update...
```

### Check Database
Your user's subscription status should update in the database after a successful checkout.

### Check Frontend
The subscription status should update in your frontend application.

## Troubleshooting

### Webhooks Not Being Received
1. **Check the webhook endpoint URL** - make sure it matches your backend route
2. **Verify your server is running** on the correct port
3. **Check firewall settings** - make sure port 5001 is accessible
4. **Restart the Stripe listener** if needed

### Stripe CLI Not Working
1. **Re-authenticate**: `stripe login`
2. **Check installation**: `stripe --version`
3. **Update CLI**: `brew upgrade stripe` (macOS) or download latest release

### Subscription Status Not Updating
1. **Check webhook secret** - make sure it matches in your backend
2. **Verify webhook events** - check Stripe Dashboard > Webhooks
3. **Check database connection** - ensure your backend can write to the database

## Environment Variables

Make sure these are set in your `.env` file:
```
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_... (from stripe listen output)
```

## Common Commands

```bash
# Start webhook forwarding
stripe listen --forward-to localhost:5001/api/webhooks/stripe

# View all webhook events
stripe events list

# Trigger specific events
stripe trigger checkout.session.completed
stripe trigger customer.subscription.created
stripe trigger customer.subscription.updated

# View logs
stripe logs tail

# Get help
stripe --help
```

## Production vs Development

- **Development**: Use `stripe listen` to forward webhooks to localhost
- **Production**: Configure webhooks in Stripe Dashboard to point to your production URL

## Support

If you're still having issues:
1. Check the [Stripe CLI documentation](https://stripe.com/docs/stripe-cli)
2. Verify your webhook endpoint is working: `curl -X POST http://localhost:5001/api/webhooks/stripe`
3. Check your backend logs for any error messages

---

**Remember**: Keep the `stripe listen` terminal window open while testing subscription features! 


For credit card info Pls use 4242424242424242 with any date, secuirty number and zipcode