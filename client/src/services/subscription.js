import axios from 'axios';

export async function getSubscriptionStatus() {
  const token = localStorage.getItem('token') || sessionStorage.getItem('token');
  const response = await axios.get('/api/subscription/status', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return response.data;
}

export async function createCheckoutSession() {
  const token = localStorage.getItem('token') || sessionStorage.getItem('token');
  const response = await axios.post('/api/subscription/create-checkout-session', {}, {
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
