import React from 'react';
import { useSubscription } from '../../contexts/SubscriptionContext';
import { createCheckoutSession, createPortalSession } from '../../services/subscription';

const SubscriptionStatusBanner = () => {
  const { status, loading, error } = useSubscription();

  const handleManage = async () => {
    const url = await createPortalSession();
    window.location.href = url;
  };

  const handleSubscribe = async () => {
    const url = await createCheckoutSession();
    window.location.href = url;
  };

  if (loading) {
    return (
      <div className="subscription-status-banner loading">
        <div className="subscription-spinner"></div>
        <p>Loading subscription details...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="subscription-status-banner error">
        <h3>Something Went Wrong</h3>
        <p>We couldn't load your subscription details. Please try again later.</p>
      </div>
    );
  }

  if (!status) {
    // This can happen on initial load or if user is logged out
    return (
      <div className="subscription-status-banner loading">
        <div className="subscription-spinner"></div>
        <p>Verifying subscription...</p>
      </div>
    );
  }

  const {
    subscriptionStatus,
    trialEnd,
    currentPeriodEnd,
    cancelAtPeriodEnd,
  } = status;

  const formatDate = (dateString) => new Date(dateString).toLocaleDateString();
  const now = new Date();

  // --- Canceled State ---
  // This is the most specific state, so we check it first.
  // Applies to both trial and paid users who have canceled.
  if (cancelAtPeriodEnd) {
    const endDate = isTrial ? trialEnd : currentPeriodEnd;
    const daysLeft = Math.max(0, Math.ceil((new Date(endDate) - now) / (1000 * 60 * 60 * 24)));

    return (
      <div className="subscription-status-banner canceled">
        <h3>Subscription Canceled</h3>
        <p>
          Your plan will not renew. Your premium access ends in <b>{daysLeft} day{daysLeft !== 1 ? 's' : ''}</b> on {formatDate(endDate)}.
        </p>
        <button className="subscription-button warning" onClick={handleSubscribe}>
          Reactivate Subscription
        </button>
      </div>
    );
  }

  const isTrial = subscriptionStatus === 'trialing';

  // --- Trialing State ---
  if (isTrial && trialEnd) {
    const trialDaysLeft = Math.max(0, Math.ceil((new Date(trialEnd) - now) / (1000 * 60 * 60 * 24)));
    return (
      <div className="subscription-status-banner trial">
        <h3>Free Trial Active</h3>
        <p>
          You have <b>{trialDaysLeft} day{trialDaysLeft !== 1 ? 's' : ''}</b> of your free trial remaining.
          <br />
          Your trial ends on {formatDate(trialEnd)}. After that, your paid subscription will begin.
        </p>
        <button className="subscription-button" onClick={handleManage}>
          Manage Subscription
        </button>
      </div>
    );
  }

  // --- Active State ---
  if (subscriptionStatus === 'active' && currentPeriodEnd) {
    return (
      <div className="subscription-status-banner active">
        <h3>Subscription Active</h3>
        <p>Your plan is active and will automatically renew on <b>{formatDate(currentPeriodEnd)}</b>.</p>
        <button className="subscription-button success" onClick={handleManage}>
          Manage Subscription
        </button>
      </div>
    );
  }
  
  // --- Past Due State ---
  if (subscriptionStatus === 'past_due') {
    return (
      <div className="subscription-status-banner past-due">
        <h3>Payment Needed</h3>
        <p>Your last payment failed. Please update your payment method to restore access.</p>
        <button className="subscription-button warning" onClick={handleManage}>
          Update Payment Method
        </button>
      </div>
    );
  }

  // --- Inactive or Default State ---
  return (
    <div className="subscription-status-banner inactive">
      <h3>Get Full Access</h3>
      <p>Unlock all premium features by starting your free 7-day trial today.</p>
      <button className="subscription-button" onClick={handleSubscribe}>
        Start Free Trial
      </button>
    </div>
  );
};

export default SubscriptionStatusBanner; 