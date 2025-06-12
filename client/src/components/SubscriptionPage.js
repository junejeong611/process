import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSubscriptionStatus } from '../hooks/useSubscriptionStatus';
import SubscriptionStatusBanner from './subscription/SubscriptionStatusBanner';
import TrialBanner from './subscription/TrialBanner';
import SubscriptionActions from './subscription/SubscriptionActions';
import Navbar from './navigation/Navbar';

const SubscriptionPage = () => {
  const { status, loading } = useSubscriptionStatus();
  const navigate = useNavigate();

  useEffect(() => {
    let interval;
    let timeout;
    if (status?.subscriptionStatus === 'inactive') {
      interval = setInterval(async () => {
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');
        const res = await fetch('/api/subscription/status', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (data.subscriptionStatus === 'trialing' || data.subscriptionStatus === 'active') {
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
  }, [status, navigate]);

  if (loading) return <div>Loading subscription status...</div>;

  if (status?.subscriptionStatus === 'inactive') {
    return (
      <div>
        <Navbar />
        <div style={{ padding: 24, maxWidth: 600, margin: '0 auto' }}>
          <h1>Subscription Details</h1>
          <SubscriptionStatusBanner />
          <TrialBanner />
          <div style={{ marginTop: 24 }}>
            <SubscriptionActions />
          </div>
          <div style={{ marginTop: 32, textAlign: 'center', color: '#ad6800' }}>
            Waiting for your subscription to activate...<br />
            (You may need to wait a few seconds after checkout.)
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Navbar />
    <div style={{ padding: 24, maxWidth: 600, margin: '0 auto' }}>
      <h1>Subscription Details</h1>
        <SubscriptionStatusBanner />
        <TrialBanner />
        <div style={{ marginTop: 24 }}>
          <SubscriptionActions />
      </div>
      </div>
    </div>
  );
};

export default SubscriptionPage; 