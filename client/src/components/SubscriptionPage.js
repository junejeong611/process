import React, { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useSubscription } from '../contexts/SubscriptionContext';
import SubscriptionStatusBanner from './subscription/SubscriptionStatusBanner';
import Navbar from './navigation/Navbar';
import './subscription/SubscriptionPage.css';

const SubscriptionPage = () => {
  const { loading, forceRefresh } = useSubscription();
  const location = useLocation();
  const refreshTriggered = useRef(false);

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    if (searchParams.has('session_id') && !refreshTriggered.current) {
      console.log('Checkout success detected, forcing subscription status refresh.');
      refreshTriggered.current = true;
      // Use a small timeout to give the webhook a moment to arrive
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
            <div className="subscription-loading">
              <div className="subscription-spinner"></div>
              <div className="subscription-loading-text">Loading subscription status...</div>
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
        <div className="subscription-container">
          <div className="subscription-header">
            <h1 className="subscription-title">Subscription Details</h1>
            <p className="subscription-subtitle">Manage your subscription and billing</p>
          </div>
          <SubscriptionStatusBanner />
        </div>
      </div>
    </div>
  );
};

export default SubscriptionPage; 