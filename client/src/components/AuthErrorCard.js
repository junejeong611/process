import React from 'react';
import Button from './Button';

const AuthErrorCard = ({ message = "You must be logged in to access this page." }) => (
  <div className="error-card error-card--auth" role="alert" aria-live="polite">
    <div className="error-card__content">
      <div className="error-card__icon" aria-hidden="true">🔐</div>
      <div className="error-card__text">
        <h3 className="error-card__title">login required</h3>
        <p className="error-card__message">{message}</p>
      </div>
    </div>
    <div className="error-card__actions">
      <Button variant="primary" onClick={() => window.location.href = '/login'}>
        Go to Login
      </Button>
    </div>
  </div>
);

export default AuthErrorCard; 