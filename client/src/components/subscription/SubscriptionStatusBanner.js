import React from 'react';
import { useSubscriptionStatus } from '../../hooks/useSubscriptionStatus';
import TrialBanner from './TrialBanner';
import PremiumRoute from './PremiumRoute';

const SubscriptionStatusBanner = () => {
  const { status, loading, error } = useSubscriptionStatus();

  if (loading) return <div>Loading subscription status...</div>;
  if (error) return <div>Error loading subscription status</div>;

  if (status.subscriptionStatus === 'active') {
    return <div>Your subscription is active!</div>;
  }
  if (status.subscriptionStatus === 'trial' || status.subscriptionStatus === 'trialing') {
    return (
      <div>
        You are on a free trial until {status.trialEnd ? new Date(status.trialEnd).toLocaleDateString() : 'unknown'}.
      </div>
    );
  }
  return <div>Your subscription is inactive. <a href='/subscribe'>Upgrade now</a></div>;
};

export default SubscriptionStatusBanner; 