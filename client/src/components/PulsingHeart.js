import React, { useRef, useImperativeHandle } from 'react';
import PropTypes from 'prop-types';
import './PulsingHeart.css';

/**
 * @typedef {'idle' | 'listening' | 'processing' | 'speaking' | 'error'} HeartState
 * @typedef PulsingHeartProps
 * @property {HeartState} state
 * @property {function} onClick
 * @property {number=} size
 * @property {string=} className
 * @property {boolean=} disabled
 */

/**
 * PulsingHeart React component
 * @param {PulsingHeartProps} props
 * @param {React.Ref} ref
 */
const PulsingHeart = React.forwardRef(({ 
  state = 'idle', 
  onClick, 
  size = 200, 
  className = '',
  disabled = false 
}, ref) => {
  const buttonRef = useRef(null);

  // Expose focus method for parent components
  useImperativeHandle(ref, () => ({
    focus: () => {
      buttonRef.current?.focus();
    }
  }));

  // Click handler with error handling
  const handleClick = (e) => {
    if (disabled) return;
    
    try {
      onClick && onClick(e);
    } catch (error) {
      console.error('Error in heart click handler:', error);
    }
  };

  // Keyboard accessibility
  const handleKeyDown = (e) => {
    if (disabled) return;
    
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      try {
        onClick && onClick(e);
      } catch (error) {
        console.error('Error in heart keyboard handler:', error);
      }
    }
  };

  // ARIA label based on state
  const ariaLabel = {
    idle: 'Start listening',
    listening: 'Stop listening',
    processing: 'Processing your message',
    speaking: 'AI is speaking',
    error: 'Error occurred, tap to try again',
  }[state] || 'Voice interaction';

  // Heart color based on state
  const heartColor = {
    idle: '#4A90E2',
    listening: '#6BA3F5',
    processing: '#4A90E2',
    speaking: '#4A90E2',
    error: '#FF6B6B'
  }[state] || '#4A90E2';

  // Determine if heart should be considered "active"
  const isActive = state === 'listening' || state === 'speaking';

  return (
    <div
      ref={buttonRef}
      className={`pulsing-heart-root ${state} ${disabled ? 'disabled' : ''} ${className}`}
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-label={disabled ? 'Voice interaction disabled' : ariaLabel}
      aria-pressed={isActive}
      aria-disabled={disabled}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      style={{ 
        width: size, 
        height: size,
        '--heart-size': `${size}px`
      }}
    >
      <svg
        className={`pulsing-heart-svg ${state}`}
        width={size}
        height={size}
        viewBox="0 0 200 220"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        focusable="false"
      >
        <defs>
          {/* Gradient for more sophisticated coloring */}
          <linearGradient id={`heartGradient-${state}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={heartColor} stopOpacity="0.9" />
            <stop offset="100%" stopColor={heartColor} stopOpacity="1" />
          </linearGradient>
          
          {/* Glow filter for enhanced visual feedback */}
          <filter id={`heartGlow-${state}`} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
            <feMerge> 
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        
        <path
          d="M100 170c0 0-60-40-60-85 0-25 20-45 45-45 15 0 28 8 35 20 7-12 20-20 35-20 25 0 45 20 45 45 0 45-60 85-60 85z"
          fill={`url(#heartGradient-${state})`}
          filter={state !== 'idle' ? `url(#heartGlow-${state})` : 'none'}
          className="heart-path"
        />
      </svg>
      
      {/* Screen reader only status text */}
      <span className="sr-only" aria-live="polite">
        {state === 'listening' && 'Listening for your voice'}
        {state === 'processing' && 'Processing your message'}
        {state === 'speaking' && 'AI is responding'}
        {state === 'error' && 'An error occurred'}
      </span>
    </div>
  );
});

PulsingHeart.displayName = 'PulsingHeart';

PulsingHeart.propTypes = {
  state: PropTypes.oneOf(['idle', 'listening', 'processing', 'speaking', 'error']).isRequired,
  onClick: PropTypes.func.isRequired,
  size: PropTypes.number,
  className: PropTypes.string,
  disabled: PropTypes.bool,
};

PulsingHeart.defaultProps = {
  size: 200,
  className: '',
  disabled: false,
};

export default PulsingHeart;