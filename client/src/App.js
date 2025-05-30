import React from 'react';
import VoiceErrorBoundary from './components/VoiceErrorBoundary';
import { VoiceProvider } from './contexts/VoiceContext';
import AppRoutes from './routes/AppRoutes';

function App() {
  return (
    <VoiceErrorBoundary>
      <VoiceProvider>
        <AppRoutes />
      </VoiceProvider>
    </VoiceErrorBoundary>
  );
}

export default App;
