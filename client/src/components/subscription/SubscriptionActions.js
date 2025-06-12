import React from 'react';
import { useSubscriptionStatus } from '../../hooks/useSubscriptionStatus';
import { createCheckoutSession, createPortalSession } from '../../services/subscription';

const SubscriptionActions = () => {
  const { status, loading } = useSubscriptionStatus();

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
      <button onClick={handlePortal}>
        Manage Subscription
      </button>
    );
  }

  return (
    <button onClick={handleCheckout}>
      Start Free Trial / Subscribe
    </button>
  );
};

export default SubscriptionActions; 