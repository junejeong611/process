import React from 'react';
import { useSubscription } from '../../contexts/SubscriptionContext';
import SubscriptionActions from './SubscriptionActions';
import { useAuth } from '../../contexts/AuthContext';

const PremiumRoute = ({ children }) => {
  const { status, loading } = useSubscription();
  const { isAdmin } = useAuth();

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

  if (isPremium || isAdmin) {
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