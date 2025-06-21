import React from 'react';
import { useSubscription } from '../../contexts/SubscriptionContext';

const SubscriptionStatusBanner = () => {
  const { status, loading, error } = useSubscription();

  if (loading) return (
    <div className="subscription-loading">
      <div className="subscription-spinner"></div>
      <div className="subscription-loading-text">Loading subscription status...</div>
    </div>
  );
  
  if (error) return (
    <div className="subscription-status-banner past-due">
      <h3>Error</h3>
      <p>Error loading subscription status</p>
    </div>
  );

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
      <div className="subscription-status-banner canceled">
        <h3>Subscription Canceled</h3>
        <p>
          Your subscription is canceled but you have access until <b>{new Date(status.currentPeriodEnd).toLocaleDateString()}</b> ({periodDaysLeft} day{periodDaysLeft !== 1 ? 's' : ''} left).
        </p>
        <button
          className="subscription-button warning"
          onClick={async () => {
            const { createCheckoutSession } = await import('../../services/subscription');
            const url = await createCheckoutSession();
            window.location.href = url;
          }}
        >
          Reactivate Subscription
        </button>
      </div>
    );
  }

  // Past due banner
  if (isPastDue) {
    return (
      <div className="subscription-status-banner past-due">
        <h3>Payment Failed</h3>
        <p>Your payment failed. Please update your payment method to avoid losing access.</p>
        <button
          className="subscription-button warning"
          onClick={async () => {
            const { createPortalSession } = await import('../../services/subscription');
            const url = await createPortalSession();
            window.location.href = url;
          }}
        >
          Update Payment Method
        </button>
      </div>
    );
  }

  // Trial banner
  if (isTrial && hasStripeCustomer && hasTrialEnd) {
    return (
      <div className="subscription-status-banner trial">
        <h3>Free Trial Active</h3>
        <p>
          You are on a free trial. {trialDaysLeft > 0 ? (
            <>
              <b>{trialDaysLeft} day{trialDaysLeft !== 1 ? 's' : ''} left</b> (ends {new Date(status.trialEnd).toLocaleDateString()})
            </>
          ) : (
            <>Trial ended.</>
          )}
        </p>
        <button 
          className="subscription-button"
          onClick={async () => {
            const { createPortalSession } = await import('../../services/subscription');
            const url = await createPortalSession();
            window.location.href = url;
          }}
        >
          Manage Subscription
        </button>
      </div>
    );
  }

  // Active subscription banner
  if (isActive && hasStripeCustomer && status.currentPeriodEnd) {
    return (
      <div className="subscription-status-banner active">
        <h3>Subscription Active</h3>
        <p>Your subscription is active. Next renewal: <b>{new Date(status.currentPeriodEnd).toLocaleDateString()}</b></p>
        <button 
          className="subscription-button success"
          onClick={async () => {
            const { createPortalSession } = await import('../../services/subscription');
            const url = await createPortalSession();
            window.location.href = url;
          }}
        >
          Manage Subscription
        </button>
      </div>
    );
  }

  // Inactive or new user
  if (!status.subscriptionStatus || status.subscriptionStatus === 'inactive') {
    return (
      <div className="subscription-status-banner inactive">
        <h3>Welcome to Emotional Support Chat!</h3>
        <p>Start your free trial to access all premium features.</p>
        <button 
          className="subscription-button"
          onClick={async () => {
            const { createCheckoutSession } = await import('../../services/subscription');
            const url = await createCheckoutSession();
            window.location.href = url;
          }}
        >
          Start Free Trial
        </button>
      </div>
    );
  }
};

export default SubscriptionStatusBanner; 