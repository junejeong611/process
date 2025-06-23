import React from 'react';
import { useSubscription } from '../../contexts/SubscriptionContext';
import { createCheckoutSession } from '../../services/subscription';

const PremiumRoute = ({ children }) => {
  const { status, loading } = useSubscription();

  if (loading) return (
    <div className="subscription-loading">
      <div className="subscription-spinner"></div>
      <div className="subscription-loading-text">checking subscription status...</div>
    </div>
  );

  const isPremium =
    status &&
    (status.subscriptionStatus === 'active' ||
      status.subscriptionStatus === 'trialing') &&
    status.subscriptionStatus !== 'inactive';

  if (isPremium) {
    return <>{children}</>;
  }

  const handleCheckout = async () => {
    const url = await createCheckoutSession();
    window.location.href = url;
  };

  return (
    <div className="subscription-status-banner inactive">
      <h3>This is a premium feature.</h3>
      <p>Start your free trial or subscribe to access this feature.</p>
      <div className="subscription-actions">
        <button className="subscription-button" onClick={handleCheckout}>
          Start Free Trial / Subscribe
        </button>
      </div>
    </div>
  );
};

export default PremiumRoute; 