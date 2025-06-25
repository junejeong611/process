import axios from 'axios';

export async function getSubscriptionStatus() {
  const token = localStorage.getItem('token') || sessionStorage.getItem('token');
  console.log('getSubscriptionStatus - Token:', token ? 'Present' : 'Missing');
  
  try {
    const response = await axios.get('/api/v1/subscription/status', {
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
  const successUrl = window.location.origin + '/subscribe';
  const cancelUrl = window.location.origin + '/subscribe';
  
  console.log('Creating checkout session with URLs:', { successUrl, cancelUrl });
  
  const response = await axios.post('/api/v1/subscription/create-checkout-session', {
    successUrl,
    cancelUrl
  }, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return response.data.url;
}

export async function createPortalSession() {
  const token = localStorage.getItem('token') || sessionStorage.getItem('token');
  const returnUrl = window.location.origin + '/subscribe';
  const response = await axios.post('/api/v1/subscription/create-portal-session', {
    returnUrl,
  }, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return response.data.url;
}
