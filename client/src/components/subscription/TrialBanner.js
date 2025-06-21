import React from 'react';
import { useSubscription } from '../../contexts/SubscriptionContext';

const TrialBanner = () => {
  const { status, loading } = useSubscription();

  if (loading || !status) return null;

  if (
    status.subscriptionStatus === 'trialing' &&
    status.trialEnd
  ) {
    const daysLeft = Math.ceil(
      (new Date(status.trialEnd) - new Date()) / (1000 * 60 * 60 * 24)
    );
    if (daysLeft <= 3) {
      return (
        <div className="trial-banner">
          Your free trial ends in {daysLeft} day{daysLeft !== 1 ? 's' : ''}!{' '}
          <a href="/subscribe">Upgrade now</a>
        </div>
      );
    }
  }
  return null;
};

export default TrialBanner; 