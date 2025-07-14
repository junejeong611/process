import React from 'react';
import PropTypes from 'prop-types';

/**
 * Standardized Icon Component
 * Consolidates all SVG icons used throughout the application
 * 
 * @param {Object} props
 * @param {string} props.name - Icon name
 * @param {number} props.size - Icon size in pixels
 * @param {string} props.color - Icon color (CSS color value)
 * @param {string} props.className - Additional CSS classes
 * @param {Object} props.style - Inline styles
 */

// Icon definitions - consolidated from various components
const icons = {
  // Navigation icons
  home: (
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  ),
  dashboard: (
    <>
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <polyline points="9,22 9,12 15,12 15,22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </>
  ),
  history: (
    <>
      <path d="M3 3v5h5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M3.05 13A9 9 0 1 0 6 5.3L3 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M12 7v5l4 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </>
  ),
  insights: (
    <>
      <rect x="3" y="13" width="3" height="6" rx="1" fill="currentColor"/>
      <rect x="9" y="9" width="3" height="10" rx="1" fill="currentColor"/>
      <rect x="15" y="5" width="3" height="14" rx="1" fill="currentColor"/>
    </>
  ),
  settings: (
    <path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  ),

  // Action icons
  mic: (
    <>
      <rect x="9" y="3" width="6" height="10" rx="3" fill="currentColor" stroke="currentColor" strokeWidth="0.5"/>
      <path d="M6 11v1a6 6 0 0 0 12 0v-1M12 18v3M9 21h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
    </>
  ),
  micActive: (
    <>
      <rect x="9" y="3" width="6" height="10" rx="3" fill="#ffffff" stroke="#ffffff" strokeWidth="0.5"/>
      <path d="M6 11v1a6 6 0 0 0 12 0v-1M12 18v3M9 21h6" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
    </>
  ),
  chat: (
    <path d="M20 2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h4l4 4 4-4h4c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z" fill="currentColor"/>
  ),
  voice: (
    <path d="M12 3a4 4 0 0 1 4 4v5a4 4 0 0 1-8 0V7a4 4 0 0 1 4-4zm6 9a1 1 0 1 1 2 0 8 8 0 0 1-16 0 1 1 0 1 1 2 0 6 6 0 0 0 12 0z" fill="currentColor"/>
  ),

  // UI icons
  chevronRight: (
    <path d="M8 5l8 7-8 7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
  ),
  chevronLeft: (
    <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  ),
  chevronDown: (
    <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  ),
  close: (
    <path d="M6 6l12 12M6 18L18 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
  ),
  back: '←',
  external: '↗',

  // Status icons
  heart: (
    <path d="M24 41s-13-8.35-13-17.5C11 15.57 15.57 11 21 11c2.54 0 4.99 1.19 6.5 3.09C29.99 12.19 32.44 11 35 11c5.43 0 10 4.57 10 12.5C47 32.65 34 41 24 41z" fill="white"/>
  ),
  user: (
    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" fill="currentColor"/>
  ),

  // Feedback icons
  success: '✅',
  error: '❌',
  warning: '⚠️',
  info: 'ℹ️',
  loading: '⏳',

  // Additional UI icons
  hamburger: (
    <path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
  ),
  logout: (
    <path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.59L17 17l5-5-5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z" fill="currentColor"/>
  ),
  refresh: (
    <>
      <path stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M1 4v6h6M23 20v-6h-6"/>
      <path stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"/>
    </>
  ),
  send: (
    <path d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  ),
  keyboard: (
    <path d="M13 17h8l-8-8V1H9v8l-8 8h8v6h4v-6z" fill="currentColor"/>
  ),

  // Mental health specific icons
  breathe: (
    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="none" opacity="0.6"/>
  ),
  mindfulness: (
    <>
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" fill="none"/>
      <circle cx="12" cy="12" r="7" stroke="currentColor" strokeWidth="1" fill="none" opacity="0.5"/>
      <circle cx="12" cy="12" r="11" stroke="currentColor" strokeWidth="1" fill="none" opacity="0.3"/>
    </>
  ),

  // Premium indicators
  premium: (
    <>
      <circle cx="12" cy="12" r="10" fill="var(--warning-orange, #ef6c00)"/>
      <path d="M8 12l2 2 4-4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </>
  ),

  // Toggle states
  toggleExpanded: (
    <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  ),
  toggleCollapsed: (
    <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  )
};

const Icon = ({ 
  name, 
  size = 20, 
  color = 'currentColor', 
  className = '',
  style = {},
  ...props 
}) => {
  const iconContent = icons[name];

  if (!iconContent) {
    console.warn(`Icon "${name}" not found. Available icons:`, Object.keys(icons).join(', '));
    return null;
  }

  const iconClasses = [
    'app-icon',
    className
  ].filter(Boolean).join(' ');

  const iconStyle = {
    color,
    ...style
  };

  // Handle text-based icons (emojis, symbols)
  if (typeof iconContent === 'string') {
    return (
      <span 
        className={iconClasses}
        style={{ 
          fontSize: `${size}px`,
          lineHeight: 1,
          ...iconStyle 
        }}
        aria-hidden="true"
        {...props}
      >
        {iconContent}
      </span>
    );
  }

  // Handle SVG icons
  return (
    <svg
      className={iconClasses}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      style={iconStyle}
      aria-hidden="true"
      focusable="false"
      role="img"
      {...props}
    >
      {iconContent}
    </svg>
  );
};

Icon.propTypes = {
  name: PropTypes.oneOf(Object.keys(icons)).isRequired,
  size: PropTypes.number,
  color: PropTypes.string,
  className: PropTypes.string,
  style: PropTypes.object
};

// Export available icon names for reference
export const iconNames = Object.keys(icons);

export default Icon; 