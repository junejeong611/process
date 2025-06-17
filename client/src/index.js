import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import BackendConnectionCheck from './components/BackendConnectionCheck';
import { BrowserRouter } from 'react-router-dom';
import './components/history/ChatHistoryPage.css';
import { SubscriptionProvider } from './contexts/SubscriptionContext';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <BrowserRouter>
      <BackendConnectionCheck>
        <SubscriptionProvider>
          <App />
        </SubscriptionProvider>
      </BackendConnectionCheck>
    </BrowserRouter>
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
