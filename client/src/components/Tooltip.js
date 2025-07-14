import React, { useState, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';

/**
 * Unified Tooltip Component
 * Uses standardized app-tooltip classes from index.css
 * 
 * @param {Object} props
 * @param {ReactNode} props.children - Element that triggers the tooltip
 * @param {string} props.content - Tooltip text content
 * @param {string} props.position - Tooltip position: 'top', 'bottom', 'left', 'right'
 * @param {string} props.variant - Tooltip variant: 'dark', 'light', 'error', 'success'
 * @param {boolean} props.disabled - Whether tooltip is disabled
 * @param {number} props.delay - Delay before showing tooltip (ms)
 * @param {string} props.className - Additional CSS classes
 */
const Tooltip = ({
  children,
  content,
  position = 'top',
  variant = 'dark',
  disabled = false,
  delay = 300,
  className = '',
  ...props
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [shouldShow, setShouldShow] = useState(false);
  const timeoutRef = useRef(null);
  const tooltipRef = useRef(null);

  // Clear timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // Handle show with delay
  const handleShow = () => {
    if (disabled || !content) return;
    
    setShouldShow(true);
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    timeoutRef.current = setTimeout(() => {
      setIsVisible(true);
    }, delay);
  };

  // Handle hide immediately
  const handleHide = () => {
    setShouldShow(false);
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIsVisible(false);
  };

  // Handle focus events for accessibility
  const handleFocus = () => {
    handleShow();
  };

  const handleBlur = () => {
    handleHide();
  };

  // Handle keyboard events
  const handleKeyDown = (event) => {
    if (event.key === 'Escape') {
      handleHide();
    }
  };

  const tooltipClasses = [
    'app-tooltip',
    position && `app-tooltip--${position}`,
    variant !== 'dark' && `app-tooltip--${variant}`,
    className
  ].filter(Boolean).join(' ');

  // Don't render tooltip if no content or disabled
  if (!content || disabled) {
    return children;
  }

  return (
    <div 
      className={tooltipClasses}
      onMouseEnter={handleShow}
      onMouseLeave={handleHide}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      {...props}
    >
      {children}
      {(isVisible || shouldShow) && (
        <div 
          ref={tooltipRef}
          className="app-tooltip__content"
          role="tooltip"
          aria-hidden={!isVisible}
          style={{
            opacity: isVisible ? 1 : 0,
            pointerEvents: isVisible ? 'auto' : 'none'
          }}
        >
          {content}
        </div>
      )}
    </div>
  );
};

Tooltip.propTypes = {
  children: PropTypes.node.isRequired,
  content: PropTypes.string.isRequired,
  position: PropTypes.oneOf(['top', 'bottom', 'left', 'right']),
  variant: PropTypes.oneOf(['dark', 'light', 'error', 'success']),
  disabled: PropTypes.bool,
  delay: PropTypes.number,
  className: PropTypes.string
};

export default Tooltip; 