import React from 'react';
import PropTypes from 'prop-types';

const Button = ({
  children,
  variant = 'primary',
  size = 'default',
  fullWidth = false,
  loading = false,
  disabled = false,
  onClick,
  type = 'button',
  className = '',
  ...props
}) => {
  const baseClass = 'app-button';
  const variantClass = `app-button--${variant}`;
  const sizeClass = size !== 'default' ? `app-button--${size}` : '';
  const fullWidthClass = fullWidth ? 'app-button--full-width' : '';
  const loadingClass = loading ? 'app-button--loading' : '';
  
  const buttonClasses = [
    baseClass,
    variantClass,
    sizeClass,
    fullWidthClass,
    loadingClass,
    className
  ].filter(Boolean).join(' ');

  return (
    <button
      type={type}
      className={buttonClasses}
      onClick={onClick}
      disabled={disabled || loading}
      {...props}
    >
      {children}
    </button>
  );
};

Button.propTypes = {
  children: PropTypes.node.isRequired,
  variant: PropTypes.oneOf([
    'primary', 'secondary', 'tertiary', 'success', 'warning', 'danger',
    'gentle', 'supportive', 'calming'
  ]),
  size: PropTypes.oneOf(['small', 'default', 'large']),
  fullWidth: PropTypes.bool,
  loading: PropTypes.bool,
  disabled: PropTypes.bool,
  onClick: PropTypes.func,
  type: PropTypes.oneOf(['button', 'submit', 'reset']),
  className: PropTypes.string,
};

export default Button; 