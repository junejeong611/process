import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSubscription } from '../contexts/SubscriptionContext';
import SubscriptionStatusBanner from './subscription/SubscriptionStatusBanner';
import TrialBanner from './subscription/TrialBanner';
import SubscriptionActions from './subscription/SubscriptionActions';
import Navbar from './navigation/Navbar';
import './subscription/SubscriptionPage.css';

const SubscriptionPage = () => {
  const { status, loading, setStatus } = useSubscription();
  const navigate = useNavigate();

  useEffect(() => {
    let interval;
    let timeout;
    if (status === 'inactive') {
      interval = setInterval(async () => {
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');
        const res = await fetch('/api/subscription/status', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (data.subscriptionStatus === 'trialing' || data.subscriptionStatus === 'active') {
          setStatus(data.subscriptionStatus);
          clearInterval(interval);
          clearTimeout(timeout);
          navigate('/options');
        }
      }, 2000);
      timeout = setTimeout(() => clearInterval(interval), 30000);
    }
    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [status, navigate, setStatus]);

  if (loading) {
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

  if (status === 'inactive') {
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
            <TrialBanner />
            <div className="subscription-actions">
              <SubscriptionActions />
            </div>
            <div className="subscription-waiting">
              Waiting for your subscription to activate...<br />
              (You may need to wait a few seconds after checkout.)
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
          <TrialBanner />
          <div className="subscription-actions">
            <SubscriptionActions />
          </div>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionPage; 