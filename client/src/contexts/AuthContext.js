import React, { createContext, useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { useCsrfToken } from './CsrfContext';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(() => localStorage.getItem('token') || sessionStorage.getItem('token'));
  const [user, setUser] = useState(null); // Will be populated on login
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const { refreshCsrfToken } = useCsrfToken();

  useEffect(() => {
    const storedToken = localStorage.getItem('token') || sessionStorage.getItem('token');
    if (storedToken) {
      setToken(storedToken);
      axios.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
      checkAdminStatus(storedToken).finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (newToken, userData, rememberMe) => {
    if (rememberMe) {
      localStorage.setItem('token', newToken);
    } else {
      sessionStorage.setItem('token', newToken);
    }
    setToken(newToken);
    setUser(userData);
    axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
    checkAdminStatus(newToken);
    await refreshCsrfToken(); // Always fetch a new CSRF token after login
  };

  const logout = () => {
    localStorage.removeItem('token');
    sessionStorage.removeItem('token');
    setToken(null);
    setUser(null);
    setIsAdmin(false);
    delete axios.defaults.headers.common['Authorization'];
    refreshCsrfToken(true); // Clear CSRF token on logout
  };
  
  const checkAdminStatus = async (authToken) => {
    if (!authToken) {
        setIsAdmin(false);
        return;
    }
    try {
      const response = await axios.get('/api/admin/check-access', {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      if (response.status === 200 && response.data.isAdmin) {
        setIsAdmin(true);
      } else {
        setIsAdmin(false);
      }
    } catch (error) {
      setIsAdmin(false);
      if (error.response?.status !== 403 && error.response?.status !== 401) {
        console.error('Error checking admin status:', error);
      }
    }
  };

  const authContextValue = {
    token,
    user,
    isAdmin,
    loading,
    login,
    logout,
    isAuthenticated: !!token
  };

  return (
    <AuthContext.Provider value={authContextValue}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  return useContext(AuthContext);
}; 