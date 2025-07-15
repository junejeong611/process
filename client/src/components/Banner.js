import React from 'react';
import './Banner.css';

/**
 * Banner component for global notifications and confirmations.
 * Props:
 * - variant: 'success' | 'info' | 'warning' | 'error' | 'trial' | 'subscription' | ...
 * - title: string (optional)
 * - message: string (required)
 * - icon: string (emoji or icon, optional)
 * - actions: React node (optional)
 * - onDismiss: function (optional, for dismissible banners)
 * - className: string (optional)
 */
const defaultIcons = {
  success: '✅',
  info: 'ℹ️',
  warning: '⚠️',
  error: '❌',
  trial: '🎯',
  subscription: '💎',
  loading: '⏳',
};

export default function Banner({
  variant = 'info',
  title = '',
  message,
  icon,
  actions,
  onDismiss,
  className = '',
  ...props
}) {
  const bannerClass = `app-banner app-banner--${variant} ${className}`.trim();
  return (
    <div className={bannerClass} role="alert" aria-live="polite" {...props}>
      {icon !== null && (
        <div className="app-banner__icon" aria-hidden="true">
          {icon || defaultIcons[variant] || 'ℹ️'}
        </div>
      )}
      <div className="app-banner__content">
        {title && <div className="app-banner__title">{title}</div>}
        <div className="app-banner__text">{message}</div>
      </div>
      {actions && <div className="app-banner__actions">{actions}</div>}
      {onDismiss && (
        <button className="app-banner__dismiss" onClick={onDismiss} aria-label="Dismiss banner">×</button>
      )}
    </div>
  );
} 