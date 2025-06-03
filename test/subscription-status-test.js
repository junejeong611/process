const axios = require('axios');

const LOGIN_URL = 'http://localhost:5001/api/auth/login';
const STATUS_URL = 'http://localhost:5001/api/subscription/status';

const EMAIL = 'testuser@example.com'; // Replace with your test user email
const PASSWORD = 'TestPass123'; // Replace with your test user password

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

async function getSubscriptionStatus(jwtToken) {
  try {
    const response = await axios.get(
      STATUS_URL,
      {
        headers: {
          Authorization: `Bearer ${jwtToken}`,
          'Content-Type': 'application/json'
        }
      }
    );
    console.log('Subscription Status:', response.data);
  } catch (error) {
    if (error.response) {
      console.error('Status error:', error.response.data);
    } else {
      console.error('Status error:', error.message);
    }
  }
}

(async () => {
  try {
    const token = await loginAndGetToken();
    await getSubscriptionStatus(token);
  } catch (err) {
    // Already logged above
  }
})();
