import axios from 'axios';

export async function getSubscriptionStatus() {
  const token = localStorage.getItem('token') || sessionStorage.getItem('token');
  console.log('getSubscriptionStatus - Token:', token ? 'Present' : 'Missing');
  
  try {
    const response = await axios.get('/api/subscription/status', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    console.log('getSubscriptionStatus - Response:', response.data);
    return response.data;
  } catch (error) {
    console.error('getSubscriptionStatus - Error:', error.response?.data || error.message);
    throw error;
  }
}

export async function createCheckoutSession() {
  const token = localStorage.getItem('token') || sessionStorage.getItem('token');
  const response = await axios.post('/api/subscription/create-checkout-session', {
    successUrl: window.location.origin + '/subscribe',
    cancelUrl: window.location.origin + '/subscribe',
  }, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return response.data.url;
}

export async function createPortalSession() {
  const token = localStorage.getItem('token') || sessionStorage.getItem('token');
  const response = await axios.post('/api/subscription/create-portal-session', {}, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return response.data.url;
}
