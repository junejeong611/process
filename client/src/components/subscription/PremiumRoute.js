import React from 'react';
import { useSubscription } from '../../contexts/SubscriptionContext';
import { createCheckoutSession } from '../../services/subscription';
import { useNavigate } from 'react-router-dom';
import Icon from '../Icon';
import './SubscriptionPage.css';

const PremiumRoute = ({ children }) => {
  const { status, loading } = useSubscription();
  const navigate = useNavigate();

  if (loading) return (
    <div className="app-loading">
      <span className="app-spinner app-spinner--large" aria-label="Loading" />
      <span>checking subscription status...</span>
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

  const handleCheckout = async () => {
    const url = await createCheckoutSession();
    window.location.href = url;
  };

  return (
    <div className="main-content-wrapper">
      <div className="premium-page">
        <div className="app-banner app-banner--subscription app-banner--page-level" style={{ maxWidth: 520, width: '100%', textAlign: 'center', margin: '3rem auto 0 auto' }}>
          <div className="app-banner__content">
            <h3 className="app-banner__title">This is a premium feature</h3>
            <p className="app-banner__text">start your free trial or subscribe to access this feature</p>
          </div>
          <div className="app-banner__actions">
            <button className="app-button app-button--primary app-button--full-width subscription-button" onClick={handleCheckout}>
              start free trial / subscribe
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PremiumRoute; 