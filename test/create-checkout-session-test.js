const axios = require('axios');

const LOGIN_URL = 'http://localhost:5001/api/auth/login';
const CHECKOUT_URL = 'http://localhost:5001/api/subscription/create-checkout-session';

const EMAIL = 'nlgowda@gmail.com'; // Replace with your test user email
const PASSWORD = 'A1234567'; // Replace with your test user password

async function loginAndGetToken() {
  try {
    const response = await axios.post(LOGIN_URL, {
      email: EMAIL,
      password: PASSWORD
    });
    return response.data.token;
  } catch (error) {
    if (error.response) {
      console.error('Login error:', error.response.data);
    } else {
      console.error('Login error:', error.message);
    }
    throw new Error('Failed to log in');
  }
}

async function createCheckoutSession(jwtToken) {
  try {
    const response = await axios.post(
      CHECKOUT_URL,
      {},
      {
        headers: {
          Authorization: `Bearer ${jwtToken}`,
          'Content-Type': 'application/json'
        }
      }
    );
    console.log('Stripe Checkout URL:', response.data.url);
  } catch (error) {
    if (error.response) {
      console.error('Checkout session error:', error.response.data);
    } else {
      console.error('Checkout session error:', error.message);
    }
  }
}

(async () => {
  try {
    const token = await loginAndGetToken();
    await createCheckoutSession(token);
  } catch (err) {
    // Already logged above
  }
})();