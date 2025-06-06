/* global gtag */
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import './ResetPassword.css';
import { toast } from 'react-toastify';

// Enhanced password strength calculation
const passwordStrength = (password) => {
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  
  // Bonus for variety
  const uniqueChars = new Set(password).size;
  if (uniqueChars >= 8) score++;
  
  return Math.min(score, 4);
};

const strengthLabels = ['too weak', 'weak', 'fair', 'good', 'strong'];
const strengthColors = ['#e57373', '#ff9800', '#ffc107', '#4caf50', '#2e7d32'];

// Enhanced validation functions
const validatePassword = (password) => {
  if (!password) return 'password is required';
  if (password.length < 8) return 'password must be at least 8 characters long';
  if (password.length > 128) return 'password is too long';
  if (!/[A-Z]/.test(password)) return 'password must contain at least one uppercase letter';
  if (!/[a-z]/.test(password)) return 'password must contain at least one lowercase letter';
  if (!/[0-9]/.test(password)) return 'password must contain at least one number';
  if (!/[^A-Za-z0-9]/.test(password)) return 'password must contain at least one special character';
  
  // Check for common weak patterns
  if (/(.)\1{2,}/.test(password)) return 'password cannot contain repeated characters';
  if (/123|abc|qwe/i.test(password)) return 'password cannot contain common sequences';
  
  return '';
};

const validateConfirmPassword = (confirmPassword, password) => {
  if (!confirmPassword) return 'please confirm your password';
  if (confirmPassword !== password) return 'passwords do not match';
  return '';
};

// Enhanced error categorization - consistent with Login/Register
const categorizeError = (error, statusCode = null) => {
  const errorLower = error.toLowerCase();
  
  // Token errors
  if (errorLower.includes('token') || errorLower.includes('expired') ||
      errorLower.includes('invalid') || errorLower.includes('link') ||
      statusCode === 401 || statusCode === 403) {
    return { type: 'token', canRetry: false, severity: 'error' };
  }
  
  // Password validation errors
  if (errorLower.includes('password') && errorLower.includes('requirements') ||
      errorLower.includes('validation') || statusCode === 400) {
    return { type: 'validation', canRetry: true, severity: 'warning' };
  }
  
  // Network errors
  if (errorLower.includes('network') || errorLower.includes('connection') || 
      errorLower.includes('fetch') || errorLower.includes('timeout') ||
      errorLower.includes('failed to fetch')) {
    return { type: 'network', canRetry: true, severity: 'warning' };
  }
  
  // Rate limiting
  if (errorLower.includes('rate limit') || errorLower.includes('too many') ||
      errorLower.includes('throttle') || statusCode === 429) {
    return { type: 'rateLimit', canRetry: false, severity: 'warning' };
  }
  
  // Server errors
  if (errorLower.includes('server') || errorLower.includes('500') ||
      errorLower.includes('503') || (statusCode >= 500 && statusCode < 600)) {
    return { type: 'server', canRetry: true, severity: 'error' };
  }
  
  return { type: 'unknown', canRetry: true, severity: 'error' };
};

// Custom debounce hook
const useDebounce = (value, delay) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
};

const ResetPassword = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [errorCategory, setErrorCategory] = useState(null);
  const [success, setSuccess] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [countdown, setCountdown] = useState(0);
  const [submitAttempts, setSubmitAttempts] = useState(0);
  const [lastSubmitTime, setLastSubmitTime] = useState(null);
  const [tokenValid, setTokenValid] = useState(true);

  const formRef = useRef(null);
  const passwordInputRef = useRef(null);
  const confirmPasswordInputRef = useRef(null);
  const controllerRef = useRef(null);

  // Debounced values for real-time validation
  const debouncedPassword = useDebounce(password, 300);
  const debouncedConfirmPassword = useDebounce(confirmPassword, 300);

  // Enhanced online/offline monitoring
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      if (error && errorCategory?.type === 'network') {
        setError('');
        setErrorCategory(null);
      }
    };
    
    const handleOffline = () => {
      setIsOnline(false);
      setError('you appear to be offline. please check your connection.');
      setErrorCategory({ type: 'network', canRetry: true, severity: 'warning' });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [error, errorCategory]);

  // Countdown timer for rate limiting
  useEffect(() => {
    let timer;
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    } else if (countdown === 0 && error && errorCategory?.type === 'rateLimit') {
      setError('');
      setErrorCategory(null);
    }
    return () => clearTimeout(timer);
  }, [countdown, error, errorCategory]);

  // Enhanced page setup with better SEO
  useEffect(() => {
    document.title = 'Reset Password - Process';
    
    // Remove existing meta tags
    const existingMetas = document.querySelectorAll('meta[name="description"], meta[name="keywords"]');
    existingMetas.forEach(meta => meta.remove());
    
    // Add new meta tags
    const meta = document.createElement('meta');
    meta.name = 'description';
    meta.content = 'Reset your Process account password securely. Enter your new password to regain access to your account.';
    document.head.appendChild(meta);
    
    const keywords = document.createElement('meta');
    keywords.name = 'keywords';
    keywords.content = 'password reset, new password, account recovery, process';
    document.head.appendChild(keywords);
    
    return () => {
      const metas = document.querySelectorAll('meta[name="description"], meta[name="keywords"]');
      metas.forEach(meta => meta.remove());
    };
  }, []);

  // Validate token on component mount
  useEffect(() => {
    if (!token) {
      setError('invalid reset link. please request a new password reset.');
      setErrorCategory({ type: 'token', canRetry: false, severity: 'error' });
      setTokenValid(false);
      return;
    }

    // Basic token format validation
    if (token.length < 20) {
      setError('invalid reset token format. please request a new password reset.');
      setErrorCategory({ type: 'token', canRetry: false, severity: 'error' });
      setTokenValid(false);
    }
  }, [token]);

  // Real-time validation
  useEffect(() => {
    if (debouncedPassword) {
      const validationError = validatePassword(debouncedPassword);
      if (validationError !== passwordError) {
        setPasswordError(validationError);
      }
    } else if (passwordError && !debouncedPassword) {
      setPasswordError('');
    }
  }, [debouncedPassword, passwordError]);

  useEffect(() => {
    if (debouncedConfirmPassword) {
      const validationError = validateConfirmPassword(debouncedConfirmPassword, password);
      if (validationError !== confirmPasswordError) {
        setConfirmPasswordError(validationError);
      }
    } else if (confirmPasswordError && !debouncedConfirmPassword) {
      setConfirmPasswordError('');
    }
  }, [debouncedConfirmPassword, password, confirmPasswordError]);

  // Enhanced keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e) => {
      // Enter key to submit form
      if (e.key === 'Enter' && !isLoading && !resetSuccess && countdown === 0) {
        e.preventDefault();
        handleSubmit(e);
      }
      
      // Escape key to clear errors
      if (e.key === 'Escape') {
        if (error) {
          setError('');
          setErrorCategory(null);
          passwordInputRef.current?.focus();
        }
      }
    };
    
    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [isLoading, resetSuccess, countdown, error]);

  // Cleanup function
  useEffect(() => {
    return () => {
      if (controllerRef.current) {
        controllerRef.current.abort();
      }
    };
  }, []);

  // Memoized form validation
  const isFormValid = useMemo(() => {
    return password && confirmPassword && !passwordError && !confirmPasswordError && 
           !isLoading && !resetSuccess && countdown === 0 && tokenValid;
  }, [password, confirmPassword, passwordError, confirmPasswordError, isLoading, resetSuccess, countdown, tokenValid]);

  const handlePasswordChange = useCallback((e) => {
    const newPassword = e.target.value;
    setPassword(newPassword);
    if (passwordError) setPasswordError('');
    if (error) {
      setError('');
      setErrorCategory(null);
    }
  }, [passwordError, error]);

  const handleConfirmPasswordChange = useCallback((e) => {
    const newConfirmPassword = e.target.value;
    setConfirmPassword(newConfirmPassword);
    if (confirmPasswordError) setConfirmPasswordError('');
    if (error) {
      setError('');
      setErrorCategory(null);
    }
  }, [confirmPasswordError, error]);

  const togglePasswordVisibility = useCallback(() => {
    setShowPassword(!showPassword);
  }, [showPassword]);

  const toggleConfirmPasswordVisibility = useCallback(() => {
    setShowConfirmPassword(!showConfirmPassword);
  }, [showConfirmPassword]);

  const handleRetry = useCallback((e) => {
    if (retryCount >= 3) {
      setError('maximum retry attempts reached. please request a new reset link.');
      setErrorCategory({ type: 'rateLimit', canRetry: false, severity: 'error' });
      setCountdown(300);
      return;
    }
    
    setRetryCount(prev => prev + 1);
    setError('');
    setErrorCategory(null);
    handleSubmit(e);
  }, [retryCount]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Check for rapid successive submissions
    const now = Date.now();
    if (lastSubmitTime && now - lastSubmitTime < 2000) {
      setError('please wait a moment before trying again.');
      return;
    }
    setLastSubmitTime(now);

    // Reset states
    setError('');
    setErrorCategory(null);
    setSuccess('');

    // Check if offline
    if (!isOnline) {
      setError('you appear to be offline. please check your connection and try again.');
      setErrorCategory({ type: 'network', canRetry: true, severity: 'warning' });
      return;
    }

    // Check countdown
    if (countdown > 0) {
      setError(`please wait ${formatCountdown(countdown)} before trying again.`);
      return;
    }

    // Client-side validation
    const passwordErr = validatePassword(password);
    const confirmPasswordErr = validateConfirmPassword(confirmPassword, password);
    
    setPasswordError(passwordErr);
    setConfirmPasswordError(confirmPasswordErr);

    if (passwordErr || confirmPasswordErr) {
      setTimeout(() => {
        if (passwordErr) {
          passwordInputRef.current?.focus();
        } else if (confirmPasswordErr) {
          confirmPasswordInputRef.current?.focus();
        }
      }, 100);
      return;
    }

    setIsLoading(true);
    setSubmitAttempts(prev => prev + 1);

    try {
      // Abort previous request if still pending
      if (controllerRef.current) {
        controllerRef.current.abort();
      }

      controllerRef.current = new AbortController();
      const timeoutId = setTimeout(() => controllerRef.current.abort(), 30000);

      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        },
        body: JSON.stringify({ 
          token, 
          password,
          timestamp: Date.now(),
          attempts: submitAttempts
        }),
        signal: controllerRef.current.signal
      });
      
      clearTimeout(timeoutId);

      // Parse response data first to get better error information
      let data;
      try {
        data = await response.json();
      } catch (parseError) {
        console.error('Failed to parse response JSON:', parseError);
        throw new Error(`HTTP ${response.status}: Failed to parse server response`);
      }

      if (!response.ok) {
        // Use the server's error message if available, otherwise use status text
        const errorMessage = data?.message || `HTTP ${response.status}: ${response.statusText}`;
        throw new Error(errorMessage, { cause: { statusCode: response.status, data } });
      }
      
      if (data.success) {
        setResetSuccess(true);
        setSuccess('password has been reset successfully! redirecting to login...');
        setRetryCount(0);
        
        toast.success('Password reset successful!');
        
        // Analytics tracking
        if (typeof gtag !== 'undefined') {
          gtag('event', 'password_reset_completed', {
            'event_category': 'auth',
            'event_label': 'success'
          });
        }
        
        // Add a slight delay for the success animation
        setTimeout(() => {
          navigate('/login', { 
            state: { message: 'Password reset successful! Please log in with your new password.' }
          });
        }, 2500);
      } else {
        // Handle server-side reset failures
        const errorMessage = data.message || 'failed to reset password. please try again.';
        const category = categorizeError(errorMessage, response.status);
        
        setError(errorMessage);
        setErrorCategory(category);

        // Set countdown for rate limiting
        if (category.type === 'rateLimit') {
          setCountdown(300);
        } else if (category.type === 'token') {
          setTokenValid(false);
        } else if (category.type === 'server') {
          setCountdown(30);
        }
        
        toast.error(errorMessage);
      }
    } catch (err) {
      console.error('Reset password error:', err);
      let errorMessage;
      let category;
      let statusCode = null;

      // Extract status code if available
      if (err.cause?.statusCode) {
        statusCode = err.cause.statusCode;
      }

      if (err.name === 'AbortError') {
        errorMessage = 'request timed out. please check your connection and try again.';
        category = categorizeError('network timeout');
      } else if (err.message.includes('Failed to fetch') || err.message.includes('NetworkError')) {
        errorMessage = 'connection error. please check your internet and try again.';
        category = categorizeError('network connection');
      } else if (err.message.includes('HTTP 401') || statusCode === 401) {
        errorMessage = 'invalid or expired reset token. please request a new password reset.';
        category = categorizeError('token expired', 401);
        setTokenValid(false);
      } else if (err.message.includes('HTTP 403') || statusCode === 403) {
        errorMessage = 'reset token is no longer valid. please request a new password reset.';
        category = categorizeError('token invalid', 403);
        setTokenValid(false);
      } else if (err.message.includes('HTTP 429') || statusCode === 429) {
        errorMessage = 'too many reset attempts. please wait before trying again.';
        category = categorizeError('rate limit', 429);
        setCountdown(300);
      } else if (err.message.includes('HTTP 5') || (statusCode >= 500 && statusCode < 600)) {
        errorMessage = 'server error. please try again in a moment.';
        category = categorizeError('server error', statusCode);
        setCountdown(30);
      } else if (statusCode === 400) {
        errorMessage = 'invalid password reset data. please check your input and try again.';
        category = categorizeError('validation error', 400);
      } else {
        // Check if the error message itself contains token-related keywords
        const errorLower = err.message.toLowerCase();
        if (errorLower.includes('token') || errorLower.includes('expired') || 
            errorLower.includes('invalid')) {
          errorMessage = err.message;
          category = categorizeError(err.message, statusCode);
          setTokenValid(false);
        } else {
          errorMessage = 'connection error. please check your internet and try again.';
          category = categorizeError('unknown error');
        }
      }

      setError(errorMessage);
      setErrorCategory(category);
    } finally {
      if (!resetSuccess) setIsLoading(false);
      controllerRef.current = null;
    }
  };

  const formatCountdown = useCallback((seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}:${secs.toString().padStart(2, '0')}` : `${secs}s`;
  }, []);

  const getPasswordStrengthWidth = useCallback(() => {
    if (!password) return 0;
    return Math.max((passwordStrength(password) / 4) * 100, 25);
  }, [password]);

  // Get appropriate error icon based on category - consistent with Login/Register
  const getErrorIcon = (category) => {
    switch (category?.type) {
      case 'token': return '🔗';
      case 'validation': return '📝';
      case 'network': return '⚡';
      case 'rateLimit': return '⏰';
      case 'server': return '🔧';
      default: return '⚠';
    }
  };

  return (
    <div className="reset-password-container" role="main">
      <div className="reset-password-content">
        <div 
          className={`reset-password-card ${isLoading ? 'is-loading' : ''} ${resetSuccess ? 'success' : ''}`}
          tabIndex={0}
          aria-labelledby="reset-password-heading"
        >
          {/* Back button */}
          <div className="back-navigation">
            <Link 
              to="/login" 
              className="back-link" 
              aria-label="back to login"
              tabIndex={0}
            >
              <span className="back-icon">←</span>
              back to login
            </Link>
          </div>

          <header className="reset-password-header">
            <div className="header-icon" role="img" aria-label="key icon">🔑</div>
            <h1 id="reset-password-heading" className="reset-password-title">
              reset your password
            </h1>
            <p className="reset-password-subtitle">
              enter your new password to regain access to your account
            </p>
          </header>

          {/* Enhanced error display - consistent with Login/Register */}
          {error && (
            <div 
              className={`error-message ${errorCategory?.type || ''}`} 
              role="alert"
              aria-live="polite"
            >
              <div className="error-content">
                <div className="error-icon" aria-hidden="true">
                  {getErrorIcon(errorCategory)}
                </div>
                <div className="error-text">
                  {errorCategory?.type === 'token' && (
                    <div className="error-title">invalid reset link</div>
                  )}
                  {errorCategory?.type === 'validation' && (
                    <div className="error-title">validation error</div>
                  )}
                  {errorCategory?.type === 'network' && (
                    <div className="error-title">connection problem</div>
                  )}
                  {errorCategory?.type === 'rateLimit' && (
                    <div className="error-title">too many attempts</div>
                  )}
                  {errorCategory?.type === 'server' && (
                    <div className="error-title">server error</div>
                  )}
                  {error}
                </div>
              </div>
              {errorCategory?.canRetry && retryCount < 3 && countdown === 0 && tokenValid && (
                <button 
                  className="retry-button"
                  onClick={handleRetry}
                  aria-label={`retry password reset (attempt ${retryCount + 2})`}
                  type="button"
                >
                  try again
                </button>
              )}
            </div>
          )}

          {/* Enhanced success message */}
          {success && (
            <div className="success-message" role="status" aria-live="polite">
              <div className="success-content">
                <div className="success-icon" aria-hidden="true">✓</div>
                <div className="success-text">
                  <div className="success-title">password reset!</div>
                  {success}
                </div>
              </div>
            </div>
          )}

          {/* Offline indicator */}
          {!isOnline && (
            <div className="offline-indicator" role="alert" aria-live="assertive">
              <span className="offline-icon" aria-hidden="true">📶</span>
              you're currently offline
            </div>
          )}

          <form 
            ref={formRef}
            onSubmit={handleSubmit} 
            className="reset-password-form" 
            noValidate
            autoComplete="on"
          >
            {/* New Password Field */}
            <div className="form-group">
              <label htmlFor="password" className="form-label">new password</label>
              <div className="input-wrapper">
                <input
                  ref={passwordInputRef}
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  className={`form-control ${passwordError ? 'is-invalid' : ''}`}
                  value={password}
                  onChange={handlePasswordChange}
                  required
                  aria-required="true"
                  aria-invalid={!!passwordError}
                  aria-describedby={passwordError ? 'password-error' : 'password-help'}
                  placeholder="new password"
                  disabled={isLoading || resetSuccess || !tokenValid}
                  autoComplete="new-password"
                  maxLength="128"
                />
                <button
                  type="button"
                  className="toggle-password"
                  onClick={togglePasswordVisibility}
                  aria-label={showPassword ? 'hide password' : 'show password'}
                  tabIndex="0"
                  disabled={isLoading || resetSuccess || !tokenValid}
                >
                  {showPassword ? 'hide' : 'show'}
                </button>
              </div>
              {passwordError && (
                <div className="invalid-feedback" id="password-error" role="alert">
                  {passwordError}
                </div>
              )}
              <div id="password-help" className="visually-hidden">
                password must be at least 8 characters with uppercase, lowercase, number, and special character
              </div>
              
              {/* Enhanced Password Strength Indicator */}
              {password && (
                <div className="password-strength" aria-live="polite">
                  <div 
                    className="strength-bar" 
                    style={{ 
                      width: `${getPasswordStrengthWidth()}%`, 
                      background: strengthColors[passwordStrength(password)] 
                    }}
                    role="progressbar"
                    aria-valuenow={passwordStrength(password)}
                    aria-valuemin="0"
                    aria-valuemax="4"
                    aria-label="password strength"
                  ></div>
                  <span 
                    className="strength-label" 
                    style={{ color: strengthColors[passwordStrength(password)] }}
                  >
                    {strengthLabels[passwordStrength(password)]}
                  </span>
                </div>
              )}
            </div>

            {/* Confirm Password Field */}
            <div className="form-group">
              <label htmlFor="confirmPassword" className="form-label">confirm new password</label>
              <div className="input-wrapper">
                <input
                  ref={confirmPasswordInputRef}
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  className={`form-control ${confirmPasswordError ? 'is-invalid' : ''} ${confirmPassword && !confirmPasswordError ? 'is-valid' : ''}`}
                  value={confirmPassword}
                  onChange={handleConfirmPasswordChange}
                  required
                  aria-required="true"
                  aria-invalid={!!confirmPasswordError}
                  aria-describedby={confirmPasswordError ? 'confirmPassword-error' : 'confirmPassword-help'}
                  placeholder="confirm new password"
                  disabled={isLoading || resetSuccess || !tokenValid}
                  autoComplete="new-password"
                  maxLength="128"
                />
                <button
                  type="button"
                  className="toggle-password"
                  onClick={toggleConfirmPasswordVisibility}
                  aria-label={showConfirmPassword ? 'hide password' : 'show password'}
                  tabIndex="0"
                  disabled={isLoading || resetSuccess || !tokenValid}
                >
                  {showConfirmPassword ? 'hide' : 'show'}
                </button>
              </div>
              {confirmPasswordError && (
                <div className="invalid-feedback" id="confirmPassword-error" role="alert">
                  {confirmPasswordError}
                </div>
              )}
              <div id="confirmPassword-help" className="visually-hidden">
                re-enter your new password to confirm
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className={`reset-button ${isLoading ? 'loading' : ''} ${resetSuccess ? 'success' : ''}`}
              disabled={!isFormValid}
              aria-busy={isLoading}
              aria-describedby="reset-status"
            >
              <span className="button-text">
                {resetSuccess ? 'success!' : 
                 isLoading ? 'resetting password...' : 
                 countdown > 0 ? `wait ${formatCountdown(countdown)}` :
                 'reset password'}
              </span>
              {retryCount > 0 && !isLoading && !resetSuccess && (
                <span 
                  className="retry-count" 
                  aria-label={`attempt ${retryCount + 1}`}
                  aria-hidden="true"
                >
                  #{retryCount + 1}
                </span>
              )}
            </button>

            <div id="reset-status" className="visually-hidden" aria-live="polite">
              {isLoading ? 'resetting password, please wait' : ''}
              {resetSuccess ? 'password reset successful, redirecting to login' : ''}
              {error ? `error: ${error}` : ''}
            </div>
          </form>

          <footer className="reset-password-footer">
            <p>remember your password? <Link to="/login">sign in</Link></p>
            <p>need help? <Link to="/forgot-password">request new reset link</Link></p>
            <p className="support-text">we're here to help whenever you need us.</p>
          </footer>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;