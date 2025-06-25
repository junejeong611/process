import React, { useEffect } from 'react';
import './App.css';
import VoiceErrorBoundary from './components/VoiceErrorBoundary';
import { VoiceProvider } from './contexts/VoiceContext';
import AppRoutes from './routes/AppRoutes';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { CsrfProvider } from './contexts/CsrfContext';
import axios from 'axios';

const AxiosInterceptor = ({ children }) => {
  const { logout } = useAuth();

  useEffect(() => {
    const interceptor = axios.interceptors.response.use(
      response => response,
      error => {
        if (error.response && error.response.status === 401) {
          logout();
        }
        return Promise.reject(error);
      }
    );

    return () => {
      axios.interceptors.response.eject(interceptor);
    };
  }, [logout]);

  return children;
};

function App() {
  return (
    <VoiceErrorBoundary>
      <AuthProvider>
        <CsrfProvider>
          <AxiosInterceptor>
            <VoiceProvider>
              <AppRoutes />
            </VoiceProvider>
          </AxiosInterceptor>
        </CsrfProvider>
      </AuthProvider>
    </VoiceErrorBoundary>
  );
}

export default App;
