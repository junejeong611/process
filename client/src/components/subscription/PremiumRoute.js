import React from 'react';
import { useSubscription } from '../../contexts/SubscriptionContext';
import SubscriptionActions from './SubscriptionActions';

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

  return (
    <div className="subscription-status-banner inactive">
      <h3>This is a premium feature.</h3>
      <p>Start your free trial or subscribe to access this feature.</p>
      <div className="subscription-actions">
        <SubscriptionActions />
      </div>
    </div>
  );
};

export default PremiumRoute; 