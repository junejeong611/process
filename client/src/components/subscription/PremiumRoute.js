import React from 'react';
import { useSubscription } from '../../contexts/SubscriptionContext';
import SubscriptionActions from './SubscriptionActions';

const PremiumRoute = ({ children }) => {
  const { status, loading } = useSubscription();

  if (loading) return (
    <div style={{ padding: 24, textAlign: 'center' }}>
      <div className="spinner" style={{ margin: '32px auto', width: 40, height: 40, border: '4px solid #eee', borderTop: '4px solid #3a5a8c', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
      <div style={{ marginTop: 16, color: '#888' }}>checking subscription status...</div>
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
    <div style={{ padding: 24, textAlign: 'center', background: '#fffbe6', border: '1px solid #ffe58f', borderRadius: 8 }}>
      <h3>This is a premium feature.</h3>
      <p>Start your free trial or subscribe to access this feature.</p>
      <SubscriptionActions />
    </div>
  );
};

export default PremiumRoute; 