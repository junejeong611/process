import React from 'react';
import { getErrorIcon, getErrorTitle, getErrorVariantClass, smartLowercase } from '../utils/errorUtils';

/**
 * Standardized ErrorCard component for all error states.
 * Props:
 * - error: string (error message)
 * - errorCategory: { type, canRetry, severity } (from categorizeError)
 * - onRetry: function (optional)
 * - retryLabel: string (optional, default 'Try Again')
 * - style, className: for custom styling
 * - children: for extra content (optional)
 */
export default function ErrorCard({
  error,
  errorCategory = {},
  onRetry,
  retryLabel = 'Try Again',
  style = {},
  className = '',
  children,
}) {
  const variantClass = getErrorVariantClass(errorCategory.type);
  return (
    <div className={`error-card ${variantClass} ${className}`.trim()} role="alert" aria-live="polite" style={style}>
      <div className="error-card__content">
        <div className="error-card__icon" aria-hidden="true">{getErrorIcon(errorCategory)}</div>
        <div className="error-card__text">
          <h3 className="error-card__title">{smartLowercase(getErrorTitle(errorCategory.type))}</h3>
          <p className="error-card__message">{smartLowercase(error)}</p>
        </div>
      </div>
      {onRetry && errorCategory.canRetry && (
        <div className="error-card__actions">
          <button className="error-card__retry" onClick={onRetry} type="button">
            {smartLowercase(retryLabel)}
          </button>
        </div>
      )}
      {children}
    </div>
  );
} 