import React from 'react';
import { useSubscription } from '../../contexts/SubscriptionContext';
import { createCheckoutSession, createPortalSession } from '../../services/subscription';
import ErrorCard from '../ErrorCard';

const SubscriptionStatusBanner = () => {
  const { status, loading, error } = useSubscription();
  // Check for authentication
  const token = localStorage.getItem('token') || sessionStorage.getItem('token');
  if (!token) return null;

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
        <p>loading subscription details...</p>
      </div>
    );
  }

  if (error) {
    return (
      <ErrorCard
        error={error || 'could not load your subscription details. please try again later.'}
        errorCategory={{ type: 'server', canRetry: true, severity: 'error' }}
      />
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
          <h3 className="app-banner__title">subscription canceled</h3>
          <p className="app-banner__text">
            your plan will not renew. your premium access ends in <b>{daysLeft} day{daysLeft !== 1 ? 's' : ''}</b> on {formatDate(endDate)}.
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
          <h3 className="app-banner__title">free trial active</h3>
          <p className="app-banner__text">
            you have <b>{trialDaysLeft} day{trialDaysLeft !== 1 ? 's' : ''}</b> of your free trial remaining.
            <br />
            your trial ends on {formatDate(trialEnd)}. after that, your paid subscription will begin.
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
          <h3 className="app-banner__title">subscription active</h3>
          <p className="app-banner__text">your plan is active and will automatically renew on <b>{formatDate(currentPeriodEnd)}</b>.</p>
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
          <h3 className="app-banner__title">payment needed</h3>
          <p className="app-banner__text">your last payment failed. please update your payment method to restore access.</p>
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
        <h3 className="app-banner__title">get full access</h3>
        <p className="app-banner__text">unlock all premium features by starting your free 7-day trial today.</p>
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