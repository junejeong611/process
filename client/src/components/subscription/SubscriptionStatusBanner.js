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
      <div className="app-banner app-banner--warning subscription-status-banner canceled">
        <div className="app-banner__content">
          <h3 className="app-banner__title">Subscription Canceled</h3>
          <p className="app-banner__text">
            Your plan will not renew. Your premium access ends in <b>{daysLeft} day{daysLeft !== 1 ? 's' : ''}</b> on {formatDate(endDate)}.
          </p>
        </div>
        <div className="app-banner__actions">
          <button className="app-banner__button" onClick={handleSubscribe}>
            Reactivate Subscription
          </button>
        </div>
      </div>
    );
  }

  const isTrial = subscriptionStatus === 'trialing';

  // --- Trialing State ---
  if (isTrial && trialEnd) {
    const trialDaysLeft = Math.max(0, Math.ceil((new Date(trialEnd) - now) / (1000 * 60 * 60 * 24)));
    return (
      <div className="app-banner app-banner--trial subscription-status-banner trial">
        <div className="app-banner__content">
          <h3 className="app-banner__title">Free Trial Active</h3>
          <p className="app-banner__text">
            You have <b>{trialDaysLeft} day{trialDaysLeft !== 1 ? 's' : ''}</b> of your free trial remaining.
            <br />
            Your trial ends on {formatDate(trialEnd)}. After that, your paid subscription will begin.
          </p>
        </div>
        <div className="app-banner__actions">
          <button className="app-banner__button" onClick={handleManage}>
            Manage Subscription
          </button>
        </div>
      </div>
    );
  }

  // --- Active State ---
  if (subscriptionStatus === 'active' && currentPeriodEnd) {
    return (
      <div className="app-banner app-banner--success subscription-status-banner active">
        <div className="app-banner__content">
          <h3 className="app-banner__title">Subscription Active</h3>
          <p className="app-banner__text">Your plan is active and will automatically renew on <b>{formatDate(currentPeriodEnd)}</b>.</p>
        </div>
        <div className="app-banner__actions">
          <button className="app-banner__button" onClick={handleManage}>
            Manage Subscription
          </button>
        </div>
      </div>
    );
  }
  
  // --- Past Due State ---
  if (subscriptionStatus === 'past_due') {
    return (
      <div className="app-banner app-banner--error subscription-status-banner past-due">
        <div className="app-banner__content">
          <h3 className="app-banner__title">Payment Needed</h3>
          <p className="app-banner__text">Your last payment failed. Please update your payment method to restore access.</p>
        </div>
        <div className="app-banner__actions">
          <button className="app-banner__button" onClick={handleManage}>
            Update Payment Method
          </button>
        </div>
      </div>
    );
  }

  // --- Inactive or Default State ---
  return (
    <div className="app-banner app-banner--info subscription-status-banner inactive highlight-banner">
      <div className="app-banner__content">
        <h3 className="app-banner__title">Get Full Access</h3>
        <p className="app-banner__text">Unlock all premium features by starting your free 7-day trial today.</p>
      </div>
      <div className="app-banner__actions">
        <button className="app-banner__button" onClick={handleSubscribe}>
          Start Free Trial
        </button>
      </div>
    </div>
  );
};

export default SubscriptionStatusBanner; 