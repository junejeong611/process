import { useState } from 'react';
import axios from 'axios';

// Helper: Wait for backend to be ready
const waitForBackend = async (retries = 10, delay = 1000) => {
  for (let i = 0; i < retries; i++) {
    try {
      await axios.get('/api/health');
      return true;
    } catch (err) {
      await new Promise(res => setTimeout(res, delay));
    }
  }
  return false;
};

// Helper: Retry wrapper for axios requests
const axiosWithRetry = async (axiosCall, retries = 3, delay = 1000) => {
  for (let i = 0; i < retries; i++) {
    try {
      return await axiosCall();
    } catch (err) {
      if (i === retries - 1) throw err;
      await new Promise(res => setTimeout(res, delay));
    }
  }
};

// Helper: Token getter
const getToken = () => {
  return localStorage.getItem('token') || sessionStorage.getItem('token');
};

const useCreateConversation = () => {
  const [conversationId, setConversationId] = useState(null);
  const [initialMessage, setInitialMessage] = useState(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const createConversation = async () => {
    setIsLoading(true);
    setError('');

    // TEMP: Skip backend health check for local dev
    // const backendReady = await waitForBackend();
    // if (!backendReady) {
    //   setError('Unable to connect to the backend server.');
    //   setIsLoading(false);
    //   return;
    // }

    try {
      const token = getToken();
      if (!token) throw new Error('No authentication token found');

      // Guard: Ensure CSRF token is present before making the POST
      const csrfToken = localStorage.getItem('csrfToken');
      if (!csrfToken) {
        setError('CSRF token not ready. Please wait and try again.');
        setIsLoading(false);
        return null;
      }

      const response = await axiosWithRetry(() =>
        axios.post('/api/v1/chat/conversations', {
          type: 'text',
          wrappedConversationKey: 'dummy-key-for-testing' // TODO: Replace with real key logic
        }, {
          headers: { Authorization: `Bearer ${token}`, 'X-CSRF-Token': csrfToken },
          withCredentials: true
        })
      );

      const newConversationId = response.data._id;
      setConversationId(newConversationId);
      setInitialMessage({
        id: Date.now(),
        text: 'Hello! How can I help you today?',
        sender: 'bot',
        timestamp: new Date().toISOString(),
      });
      return response.data;
    } catch (err) {
      setError(err.response?.data?.message || err.message);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    createConversation,
    conversationId,
    initialMessage,
    error,
    isLoading,
  };
};

export default useCreateConversation;
