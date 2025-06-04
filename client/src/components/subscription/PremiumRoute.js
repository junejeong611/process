import React from 'react';
import { useSubscriptionStatus } from '../../hooks/useSubscriptionStatus';
import SubscriptionActions from './SubscriptionActions';

const PremiumRoute = ({ children }) => {
  const { status, loading } = useSubscriptionStatus();

  if (loading) return null;

  const isPremium =
    status &&
    (status.subscriptionStatus === 'active' ||
      status.subscriptionStatus === 'trial' ||
      status.subscriptionStatus === 'trialing');

  if (isPremium) {
    return <>{children}</>;
  }

  return (
    <div style={{ padding: 24, textAlign: 'center', background: '#fffbe6', border: '1px solid #ffe58f', borderRadius: 8 }}>
      <h3>This is a premium feature.</h3>
      <p>Start your free trial or subscribe to access this feature.</p>
      <SubscriptionActions />
    </div>
  );
};

export default PremiumRoute; 