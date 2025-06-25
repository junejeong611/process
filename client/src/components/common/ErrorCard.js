import React from 'react';
import './ErrorCard.css';

const getErrorIcon = (category) => {
  switch (category?.type) {
    case 'auth': return '🔐';
    case 'account': return '👤';
    case 'network': return '⚡';
    case 'rateLimit': return '⏰';
    case 'server': return '🔧';
    case 'validation': return '📝';
    case 'token': return '🔗';
    default: return '⚠';
  }
};

const getErrorTitle = (category) => {
    switch (category?.type) {
        case 'auth': return 'Login Failed';
        case 'account': return 'Account Issue';
        case 'network': return 'Connection Problem';
        case 'rateLimit': return 'Too Many Attempts';
        case 'server': return 'Server Error';
        case 'validation': return 'Validation Error';
        case 'token': return 'Invalid Link/Token';
        default: return 'An Error Occurred';
    }
}

const ErrorCard = ({ error, errorCategory, onRetry, retryCount }) => {
  if (!error) {
    return null;
  }

  return (
    <div
      className={`error-message ${errorCategory?.type || 'unknown'}`}
      role="alert"
      aria-live="polite"
    >
      <div className="error-content">
        <div className="error-icon" aria-hidden="true">
          {getErrorIcon(errorCategory)}
        </div>
        <div className="error-text">
          <div className="error-title">{getErrorTitle(errorCategory)}</div>
          {error}
        </div>
      </div>
      {errorCategory?.canRetry && onRetry && retryCount < 3 && (
        <button
          className="retry-button"
          onClick={onRetry}
          aria-label={`Retry action (attempt ${retryCount + 2})`}
          type="button"
        >
          Try Again
        </button>
      )}
    </div>
  );
};

export default ErrorCard; 