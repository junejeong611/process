import React, { useEffect, useRef } from 'react';
import PropTypes from 'prop-types';

/**
 * Unified Modal Component
 * Uses standardized app-modal classes from index.css
 * 
 * @param {Object} props
 * @param {boolean} props.open - Whether the modal is open
 * @param {function} props.onClose - Callback when modal should close
 * @param {string} props.title - Modal title
 * @param {ReactNode} props.children - Modal content
 * @param {string} props.size - Modal size: 'small', 'medium', 'large', 'fullscreen'
 * @param {string} props.variant - Modal variant: 'default', 'dialog', 'drawer', 'gentle'
 * @param {boolean} props.closeOnOverlayClick - Whether clicking overlay closes modal
 * @param {ReactNode} props.footer - Footer content (buttons, actions)
 * @param {string} props.className - Additional CSS classes
 */
const Modal = ({
  open,
  onClose,
  title,
  children,
  size = 'medium',
  variant = 'default',
  closeOnOverlayClick = true,
  footer,
  className = '',
  ...props
}) => {
  const modalRef = useRef(null);
  const previousFocusRef = useRef(null);

  // Focus management for accessibility
  useEffect(() => {
    if (open) {
      // Store previous focus
      previousFocusRef.current = document.activeElement;
      
      // Focus modal after animation
      const timer = setTimeout(() => {
        if (modalRef.current) {
          const closeButton = modalRef.current.querySelector('.app-modal__close');
          const firstFocusable = modalRef.current.querySelector('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
          (closeButton || firstFocusable || modalRef.current).focus();
        }
      }, 150);

      return () => clearTimeout(timer);
    } else {
      // Restore previous focus when modal closes
      if (previousFocusRef.current) {
        previousFocusRef.current.focus();
      }
    }
  }, [open]);

  // Keyboard event handling
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose?.();
      }

      // Trap focus within modal
      if (event.key === 'Tab') {
        const modal = modalRef.current;
        if (!modal) return;

        const focusableElements = modal.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (event.shiftKey) {
          if (document.activeElement === firstElement) {
            event.preventDefault();
            lastElement.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            event.preventDefault();
            firstElement.focus();
          }
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = '';
      };
    }
  }, [open]);

  if (!open) return null;

  const handleOverlayClick = (event) => {
    if (closeOnOverlayClick && event.target === event.currentTarget) {
      onClose?.();
    }
  };

  const modalClasses = [
    'app-modal',
    size && `app-modal--${size}`,
    variant !== 'default' && `app-modal--${variant}`,
    className
  ].filter(Boolean).join(' ');

  return (
    <div 
      className="app-modal-overlay" 
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? "modal-title" : undefined}
      {...props}
    >
      <div 
        ref={modalRef}
        className={modalClasses}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        {title && (
          <div className="app-modal__header">
            <h2 id="modal-title" className="app-modal__title">
              {title}
            </h2>
            <button
              className="app-modal__close"
              onClick={onClose}
              aria-label="Close modal"
              type="button"
            >
              ×
            </button>
          </div>
        )}

        {/* Body */}
        <div className="app-modal__body">
          {typeof children === 'string' ? (
            <p className="app-modal__text">{children}</p>
          ) : (
            children
          )}
        </div>

        {/* Footer */}
        {footer && (
          <div className="app-modal__footer">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

Modal.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  title: PropTypes.string,
  children: PropTypes.node.isRequired,
  size: PropTypes.oneOf(['small', 'medium', 'large', 'fullscreen']),
  variant: PropTypes.oneOf(['default', 'dialog', 'drawer', 'gentle']),
  closeOnOverlayClick: PropTypes.bool,
  footer: PropTypes.node,
  className: PropTypes.string
};

export default Modal; 