const axios = require('axios');

const API_URL = 'http://localhost:5001/api/subscription/create-checkout-session';
const JWT_TOKEN = 'YOUR_JWT_TOKEN_HERE'; // <-- Replace with your real token

async function createCheckoutSession() {
  try {
    const response = await axios.post(
      API_URL,
      {
        // Optionally, you can specify custom success/cancel URLs:
        // successUrl: 'http://localhost:3000/subscription/success',
        // cancelUrl: 'http://localhost:3000/subscription/cancel'
      },
      {
        headers: {
          Authorization: `Bearer ${JWT_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );
    console.log('Stripe Checkout URL:', response.data.url);
  } catch (error) {
    if (error.response) {
      console.error('Error:', error.response.data);
    } else {
      console.error('Error:', error.message);
    }
  }
}

createCheckoutSession();