import React from 'react';
import { useSubscription } from '../../contexts/SubscriptionContext';

const SubscriptionStatusBanner = () => {
  const { status, loading, error } = useSubscription();

  if (loading) return <div>Loading subscription status...</div>;
  if (error) return <div>Error loading subscription status</div>;

  const isActive = status.subscriptionStatus === 'active';
  const isTrial = status.subscriptionStatus === 'trialing';
  const isCanceled = status.subscriptionStatus === 'canceled';
  const isPastDue = status.subscriptionStatus === 'past_due';
  const hasStripeCustomer = !!status.stripeCustomerId;
  const hasTrialEnd = !!status.trialEnd;
  const now = new Date();

  // Calculate days left in trial
  let trialDaysLeft = null;
  if (isTrial && hasTrialEnd) {
    const end = new Date(status.trialEnd);
    trialDaysLeft = Math.max(0, Math.ceil((end - now) / (1000 * 60 * 60 * 24)));
  }

  // Calculate days left in current period (for canceled)
  let periodDaysLeft = null;
  if (isCanceled && status.currentPeriodEnd) {
    const end = new Date(status.currentPeriodEnd);
    periodDaysLeft = Math.max(0, Math.ceil((end - now) / (1000 * 60 * 60 * 24)));
  }

  // Cancellation banner
  if (isCanceled && status.cancelAtPeriodEnd && periodDaysLeft > 0) {
    return (
      <div style={{ background: '#fffbe6', color: '#ad6800', padding: 12, textAlign: 'center', border: '1px solid #ffe58f', borderRadius: 8 }}>
        Your subscription is canceled but you have access until <b>{new Date(status.currentPeriodEnd).toLocaleDateString()}</b> ({periodDaysLeft} day{periodDaysLeft !== 1 ? 's' : ''} left).
        <br />
        <button
          onClick={async () => {
            const { createCheckoutSession } = await import('../../services/subscription');
            const url = await createCheckoutSession();
            window.location.href = url;
          }}
          style={{ marginTop: 8 }}
        >
          Reactivate Subscription
        </button>
      </div>
    );
  }

  // Past due banner
  if (isPastDue) {
    return (
      <div style={{ background: '#fff1f0', color: '#cf1322', padding: 12, textAlign: 'center', border: '1px solid #ffa39e', borderRadius: 8 }}>
        Your payment failed. Please update your payment method to avoid losing access.
        <br />
        <button
          onClick={async () => {
            const { createPortalSession } = await import('../../services/subscription');
            const url = await createPortalSession();
            window.location.href = url;
          }}
          style={{ marginTop: 8 }}
        >
          Update Payment Method
        </button>
      </div>
    );
  }

  // Trial banner
  if (isTrial && hasStripeCustomer && hasTrialEnd) {
    return (
      <div style={{ background: '#e6f7ff', color: '#0050b3', padding: 12, textAlign: 'center', border: '1px solid #91d5ff', borderRadius: 8 }}>
        You are on a free trial. {trialDaysLeft > 0 ? (
          <>
            <b>{trialDaysLeft} day{trialDaysLeft !== 1 ? 's' : ''} left</b> (ends {new Date(status.trialEnd).toLocaleDateString()})
          </>
        ) : (
          <>Trial ended.</>
        )}
        <br />
        <button onClick={async () => {
          const { createPortalSession } = await import('../../services/subscription');
          const url = await createPortalSession();
          window.location.href = url;
        }} style={{ marginTop: 8 }}>
          Manage Subscription
        </button>
      </div>
    );
  }

  // Active subscription banner
  if (isActive && hasStripeCustomer && status.currentPeriodEnd) {
    return (
      <div style={{ background: '#f6ffed', color: '#389e0d', padding: 12, textAlign: 'center', border: '1px solid #b7eb8f', borderRadius: 8 }}>
        Your subscription is active. Next renewal: <b>{new Date(status.currentPeriodEnd).toLocaleDateString()}</b>
        <br />
        <button onClick={async () => {
          const { createPortalSession } = await import('../../services/subscription');
          const url = await createPortalSession();
          window.location.href = url;
        }} style={{ marginTop: 8 }}>
          Manage Subscription
        </button>
      </div>
    );
  }

  // Inactive or new user
  if (!status.subscriptionStatus || status.subscriptionStatus === 'inactive') {
    return (
      <div style={{ background: '#fffbe6', color: '#ad6800', padding: 12, textAlign: 'center', border: '1px solid #ffe58f', borderRadius: 8 }}>
        <h3>Welcome to Emotional Support Chat!</h3>
        <p>Start your free trial to access all premium features.</p>
        <button onClick={async () => {
          const { createCheckoutSession } = await import('../../services/subscription');
          const url = await createCheckoutSession();
          window.location.href = url;
        }} style={{ marginTop: 12, padding: '8px 16px', fontSize: '16px' }}>
          Start Free Trial
        </button>
      </div>
    );
  }
};

export default SubscriptionStatusBanner; 