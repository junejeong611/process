const axios = require('axios');

const LOGIN_URL = 'http://localhost:5001/api/auth/login';
const PORTAL_URL = 'http://localhost:5001/api/subscription/create-portal-session';

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

async function createPortalSession(jwtToken) {
  try {
    const response = await axios.post(
      PORTAL_URL,
      {
        // Optionally, you can specify a custom returnUrl:
        // returnUrl: 'http://localhost:3000/subscription/manage'
      },
      {
        headers: {
          Authorization: `Bearer ${jwtToken}`,
          'Content-Type': 'application/json'
        }
      }
    );
    console.log('Stripe Portal URL:', response.data.url);
  } catch (error) {
    if (error.response) {
      console.error('Portal session error:', error.response.data);
    } else {
      console.error('Portal session error:', error.message);
    }
  }
}

(async () => {
  try {
    const token = await loginAndGetToken();
    await createPortalSession(token);
  } catch (err) {
    // Already logged above
  }
})();