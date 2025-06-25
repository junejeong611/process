import axios from 'axios';

const CSRF_ERROR_MSG = 'CSRF token mismatch';

// Helper to detect CSRF error
function isCsrfError(error) {
  return (
    error.response &&
    error.response.status === 403 &&
    typeof error.response.data === 'object' &&
    (error.response.data.message?.includes('CSRF') || error.response.data.error?.includes('CSRF'))
  );
}

const axiosInstance = axios.create();

axiosInstance.interceptors.response.use(
  response => response,
  async error => {
    const config = error.config;
    if (!config) return Promise.reject(error);
    // Only retry once for CSRF errors
    if (!config.__csrfRetried && isCsrfError(error)) {
      try {
        // Fetch new CSRF token
        const { data } = await axios.get('/api/v1/csrf-token', { withCredentials: true });
        const newToken = data.csrfToken;
        // Update headers for this request
        config.headers = config.headers || {};
        config.headers['X-CSRF-Token'] = newToken;
        // Mark as retried
        config.__csrfRetried = true;
        // Also update axios defaults for future requests
        axiosInstance.defaults.headers.post['X-CSRF-Token'] = newToken;
        axiosInstance.defaults.headers.put['X-CSRF-Token'] = newToken;
        axiosInstance.defaults.headers.delete['X-CSRF-Token'] = newToken;
        return axiosInstance(config);
      } catch (fetchErr) {
        // If fetching CSRF token fails, treat as session expired
        return Promise.reject({ ...error, message: 'Session expired. Please log in again.' });
      }
    }
    // If already retried or not a CSRF error, reject
    if (isCsrfError(error)) {
      // After retry, still CSRF error: treat as session expired
      return Promise.reject({ ...error, message: 'Session expired. Please log in again.' });
    }
    return Promise.reject(error);
  }
);

export default axiosInstance; 