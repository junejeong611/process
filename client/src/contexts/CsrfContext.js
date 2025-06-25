import React, { createContext, useState, useEffect, useContext } from 'react';
import axios from 'axios';

const CsrfContext = createContext({ csrfToken: null, isCsrfReady: false, refreshCsrfToken: () => {} });

export const CsrfProvider = ({ children }) => {
  const [csrfToken, setCsrfToken] = useState(null);
  const [isCsrfReady, setIsCsrfReady] = useState(false);

  const fetchCsrfToken = async (clear = false) => {
    if (clear) {
      setCsrfToken(null);
      setIsCsrfReady(false);
      localStorage.removeItem('csrfToken');
      return;
    }
    try {
      const { data } = await axios.get('/api/v1/csrf-token', { withCredentials: true });
      setCsrfToken(data.csrfToken);
      localStorage.setItem('csrfToken', data.csrfToken);
      axios.defaults.headers.post['X-CSRF-Token'] = data.csrfToken;
      axios.defaults.headers.put['X-CSRF-Token'] = data.csrfToken;
      axios.defaults.headers.delete['X-CSRF-Token'] = data.csrfToken;
      setIsCsrfReady(true);
    } catch (error) {
      console.error('Failed to fetch CSRF token:', error);
      setIsCsrfReady(true); // Unblock UI even on error
    }
  };

  useEffect(() => {
    fetchCsrfToken();
  }, []);

  const contextValue = { csrfToken, isCsrfReady, refreshCsrfToken: fetchCsrfToken };

  return (
    <CsrfContext.Provider value={contextValue}>
      {children}
    </CsrfContext.Provider>
  );
};

export const useCsrfToken = () => {
  return useContext(CsrfContext);
}; 