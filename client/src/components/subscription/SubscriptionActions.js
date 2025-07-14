import React from 'react';
import { useSubscription } from '../../contexts/SubscriptionContext';
import { createCheckoutSession, createPortalSession } from '../../services/subscription';

const SubscriptionActions = () => {
  const { status, loading } = useSubscription();

  const handleCheckout = async () => {
    const url = await createCheckoutSession();
    window.location.href = url;
  };

  const handlePortal = async () => {
    const url = await createPortalSession();
    window.location.href = url;
  };

  if (loading || !status) return null;

  if (status.subscriptionStatus === 'active') {
    return (
      <button className="app-button app-button--success subscription-button" onClick={handlePortal}>
        Manage Subscription
      </button>
    );
  }

  return (
    <button className="app-button app-button--primary app-button--full-width subscription-button" onClick={handleCheckout}>
      Start Free Trial / Subscribe
    </button>
  );
};

export default SubscriptionActions; 