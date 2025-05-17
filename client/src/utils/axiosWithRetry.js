import axios from 'axios';

const axiosWithRetry = async (config, retries = 3, delay = 1000) => {
  for (let i = 0; i < retries; i++) {
    try {
      return await axios(config);
    } catch (err) {
      if (i === retries - 1) throw err;
      await new Promise(res => setTimeout(res, delay));
    }
  }
};

// Also export a default axios instance with retry logic for convenience
const axiosInstance = axios.create();
axiosInstance.interceptors.response.use(
  response => response,
  async error => {
    const config = error.config;
    if (!config || config.__retryCount >= 2) {
      return Promise.reject(error);
    }
    config.__retryCount = (config.__retryCount || 0) + 1;
    await new Promise(res => setTimeout(res, 1000));
    return axiosInstance(config);
  }
);

export default axiosInstance;
export { axiosWithRetry }; 