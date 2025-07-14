import React, { useEffect, useRef } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { useSubscription } from '../contexts/SubscriptionContext';
import SubscriptionStatusBanner from './subscription/SubscriptionStatusBanner';
import Navbar from './navigation/Navbar';
import SubscriptionActions from './subscription/SubscriptionActions';
import './subscription/SubscriptionPage.css';

const SubscriptionPage = () => {
  const { loading, forceRefresh } = useSubscription();
  const location = useLocation();
  const navigate = useNavigate();
  const refreshTriggered = useRef(false);

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    if (searchParams.has('session_id') && !refreshTriggered.current) {
      console.log('[SubscriptionPage] Checkout success detected, forcing subscription status refresh.');
      refreshTriggered.current = true;
      setTimeout(() => {
        forceRefresh();
      }, 500);
    }
  }, [location.search, forceRefresh]);

  if (loading && !refreshTriggered.current) {
    return (
      <div className="subscription-layout">
        <Navbar />
        <div className="subscription-main">
          <div className="subscription-container">
            <div className="app-loading">
              <span className="app-spinner app-spinner--large" aria-label="Loading" />
              <span>loading subscription status...</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="subscription-layout">
      <Navbar />
      <div className="subscription-main">
        <div style={{ width: '100%', maxWidth: 600, margin: '0 auto' }}>
          <div className="back-navigation" style={{ marginBottom: '2rem' }}>
            <Link to="/settings" className="back-link" aria-label="Back to settings">
              <span className="back-icon">&#8592;</span> Back to Settings
            </Link>
          </div>
          <div className="app-card app-card--padded settings-card" style={{ padding: '3rem 2.5rem' }}>
            <div className="subscription-header">
              <h1 className="subscription-title">subscription details</h1>
              <p className="subscription-subtitle">Manage your subscription and billing</p>
            </div>
            <SubscriptionStatusBanner />
            <div style={{ marginTop: '2rem' }}>
              <SubscriptionActions />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionPage; 