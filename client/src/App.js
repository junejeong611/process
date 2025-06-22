import React from 'react';
import VoiceErrorBoundary from './components/VoiceErrorBoundary';
import { VoiceProvider } from './contexts/VoiceContext';
import AppRoutes from './routes/AppRoutes';
import { AuthProvider } from './contexts/AuthContext';

function App() {
  return (
    <VoiceErrorBoundary>
      <AuthProvider>
        <VoiceProvider>
          <AppRoutes />
        </VoiceProvider>
      </AuthProvider>
    </VoiceErrorBoundary>
  );
}

export default App;
