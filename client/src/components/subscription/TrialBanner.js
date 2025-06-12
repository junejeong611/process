import React from 'react';
import { useSubscriptionStatus } from '../../hooks/useSubscriptionStatus';

const TrialBanner = () => {
  const { status, loading } = useSubscriptionStatus();

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
        <div style={{ background: '#fffbe6', color: '#ad6800', padding: 12, textAlign: 'center' }}>
          Your free trial ends in {daysLeft} day{daysLeft !== 1 ? 's' : ''}!{' '}
          <a href="/subscribe">Upgrade now</a>
        </div>
      );
    }
  }
  return null;
};

export default TrialBanner; 