import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import './ForgotPassword.css';

// Enhanced email validation with comprehensive checks
const validateEmail = (email) => {
  if (!email.trim()) return 'email is required';
  
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  
  if (!emailRegex.test(email)) {
    return 'please enter a valid email address';
  }
  
  if (email.length > 254) {
    return 'email address is too long';
  }
  
  return '';
};

// Enhanced error categorization with better handling
const categorizeError = (error) => {
  const errorLower = error.toLowerCase();
  
  // Network errors
  if (errorLower.includes('network') || errorLower.includes('connection') || 
      errorLower.includes('fetch') || errorLower.includes('timeout')) {
    return { type: 'network', canRetry: true, severity: 'warning' };
  }
  
  // Email/validation errors
  if (errorLower.includes('not found') || errorLower.includes('invalid email') ||
      errorLower.includes('user not found')) {
    return { type: 'email', canRetry: false, severity: 'info' };
  }
  
  // Rate limiting
  if (errorLower.includes('rate limit') || errorLower.includes('too many') ||
      errorLower.includes('throttle')) {
    return { type: 'rateLimit', canRetry: false, severity: 'warning' };
  }
  
  // Server errors
  if (errorLower.includes('server') || errorLower.includes('500') ||
      errorLower.includes('503')) {
    return { type: 'server', canRetry: true, severity: 'error' };
  }
  
  return { type: 'unknown', canRetry: true, severity: 'error' };
};

// Custom debounce hook for real-time validation
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

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [errorCategory, setErrorCategory] = useState(null);
  const [errorCategory, setErrorCategory] = useState(null);
  const [success, setSuccess] = useState('');
  const [emailError, setEmailError] = useState('');
  const [retryCount, setRetryCount] = useState(0);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [countdown, setCountdown] = useState(0);
  const [submitAttempts, setSubmitAttempts] = useState(0);
  const [lastSubmitTime, setLastSubmitTime] = useState(null);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [emailTouched, setEmailTouched] = useState(false);

  const navigate = useNavigate();
  const formRef = useRef(null);
  const emailInputRef = useRef(null);
  const lastSubmitEventRef = useRef(null);
  const controllerRef = useRef(null);

  // Debounced email for real-time validation
  const debouncedEmail = useDebounce(email, 500);

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

  // Enhanced countdown timer with better UX
  useEffect(() => {
    let timer;
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    } else if (countdown === 0 && error && errorCategory?.type === 'rateLimit') {
      // Clear rate limit error when countdown reaches 0
      setError('');
      setErrorCategory(null);
    }
    return () => clearTimeout(timer);
  }, [countdown, error, errorCategory]);

  // Enhanced page setup with better SEO and meta tags
  useEffect(() => {
    document.title = 'Reset Password - Process';
    
    // Remove existing meta tags
    const existingMetas = document.querySelectorAll('meta[name="description"], meta[name="keywords"]');
    existingMetas.forEach(meta => meta.remove());
    
    // Add new meta tags
    const meta = document.createElement('meta');
    meta.name = 'description';
    meta.content = 'Reset your Process account password securely. Enter your email to receive a password reset link.';
    document.head.appendChild(meta);
    
    const keywords = document.createElement('meta');
    keywords.name = 'keywords';
    keywords.content = 'password reset, forgot password, account recovery, process';
    document.head.appendChild(keywords);
    
    return () => {
      const metas = document.querySelectorAll('meta[name="description"], meta[name="keywords"]');
      metas.forEach(meta => meta.remove());
    };
  }, []);

  // Real-time email validation
  useEffect(() => {
    if (debouncedEmail && debouncedEmail.trim()) {
      const validationError = validateEmail(debouncedEmail);
      if (validationError !== emailError) {
        setEmailError(validationError);
      }
    } else if (emailError && !debouncedEmail.trim()) {
      setEmailError('');
    }
  }, [debouncedEmail, emailError]);

  // Enhanced keyboard shortcuts with better accessibility
  useEffect(() => {
    const handleKeyPress = (e) => {
      // Enter key to submit form
      if (e.key === 'Enter' && !isLoading && email && !success && countdown === 0) {
        e.preventDefault();
        handleSubmit(e);
      }
      
      // Escape key to clear errors and focus email input
      if (e.key === 'Escape') {
        if (error || success) {
          setError('');
          setSuccess('');
          setErrorCategory(null);
          emailInputRef.current?.focus();
        }
      }
    };
    
    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [email, isLoading, error, success, countdown]);

  // Cleanup function to abort requests on unmount
  useEffect(() => {
    return () => {
      if (controllerRef.current) {
        controllerRef.current.abort();
      }
    };
  }, []);

  // Memoized form validation
  const isFormValid = useMemo(() => {
    return email.trim() && !emailError && !isLoading && !success && countdown === 0;
  }, [email, emailError, isLoading, success, countdown]);

  const handleEmailChange = useCallback((e) => {
    const newEmail = e.target.value;
    setEmail(newEmail);
    
    // Clear errors when user starts typing
    if (emailError) setEmailError('');
    if (error) {
      setError('');
      setErrorCategory(null);
    }
    if (success) setSuccess('');
  }, [emailError, error, success]);

  const handleEmailBlur = () => setEmailTouched(true);

  const handleRetry = useCallback((e) => {
    if (retryCount >= 3) {
      setError('maximum retry attempts reached. please try again later.');
      setErrorCategory({ type: 'rateLimit', canRetry: false, severity: 'error' });
      setCountdown(300); // 5 minute cooldown
      return;
    }
    
    setRetryCount(prev => prev + 1);
    setError('');
    setErrorCategory(null);
    handleSubmit(lastSubmitEventRef.current || e);
  }, [retryCount]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setHasSubmitted(true);
    lastSubmitEventRef.current = e;
    
    // Check for rapid successive submissions
    const now = Date.now();
    if (lastSubmitTime && now - lastSubmitTime < 2000) {
      setError('please wait a moment before trying again.');
      return;
    }
    setLastSubmitTime(now);

    // Reset states
    setError('');
    setSuccess('');
    setErrorCategory(null);

    // Check if offline
    if (!isOnline) {
      const offlineError = 'you appear to be offline. please check your connection and try again.';
      setError(offlineError);
      setErrorCategory({ type: 'network', canRetry: true, severity: 'warning' });
      return;
    }

    // Check countdown
    if (countdown > 0) {
      setError(`please wait ${formatCountdown(countdown)} before trying again.`);
      return;
    }

    // Client-side validation
    const emailErr = validateEmail(email);
    setEmailError(emailErr);
    
    if (emailErr) {
      setTimeout(() => {
        emailInputRef.current?.focus();
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

      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        },
        body: JSON.stringify({ 
          email: email.trim().toLowerCase(),
          timestamp: Date.now(),
          attempts: submitAttempts
        }),
        signal: controllerRef.current.signal
      });

      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();


      if (data.success) {
        setSuccess('if that email is registered, a password reset link has been sent.');
        setRetryCount(0);
        setCountdown(60); // 60 second cooldown
        setError(''); 
        
        // Clear form after successful submission
        setTimeout(() => {
          setEmail('');
          setEmailError('');
        }, 2000);

        // Analytics tracking (if available)
        if (typeof window.gtag !== 'undefined') {
          window.gtag('event', 'password_reset_requested', {
            'event_category': 'auth',
            'event_label': 'forgot_password'
          });
        }
      } else {
        const errorMsg = data.message || 'failed to send reset link. please try again.';
        const category = categorizeError(errorMsg);
        
        setError(errorMsg);
        setErrorCategory(category);

        // Set countdown for rate limiting
        if (category.type === 'rateLimit') {
          setCountdown(300); // 5 minute cooldown for rate limiting
        } else if (category.type === 'server') {
          setCountdown(30); // 30 second cooldown for server errors
        }
      }
    } catch (err) {
      console.error('Forgot password error:', err);
      let errorMessage;
      let category;

      if (err.name === 'AbortError') {
        errorMessage = 'request timed out. please check your connection and try again.';
        category = categorizeError('network timeout');
      } else if (err.message.includes('fetch') || err.message.includes('Failed to fetch')) {
        errorMessage = 'connection error. please check your internet and try again.';
        category = categorizeError('network connection');
      } else if (err.message.includes('HTTP 429')) {
        errorMessage = 'too many attempts. please wait before trying again.';
        category = categorizeError('rate limit');
        setCountdown(300);
      } else if (err.message.includes('HTTP 5')) {
        errorMessage = 'server error. please try again in a moment.';
        category = categorizeError('server error');
        setCountdown(30);
      } else {
        errorMessage = 'an unexpected error occurred. please try again.';
        category = categorizeError('unknown error');
      }

      setError(errorMessage);
      setErrorCategory(category);
    } finally {
      setIsLoading(false);
      controllerRef.current = null;
    }
  };

  const formatCountdown = useCallback((seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}:${secs.toString().padStart(2, '0')}` : `${secs}s`;
  }, []);

  // Get appropriate error icon based on category
  const getErrorIcon = (category) => {
    switch (category?.type) {
      case 'network': return '⚡';
      case 'email': return '✉';
      case 'rateLimit': return '⏰';
      case 'server': return '🔧';
      default: return '⚠';
    }
  };

  const formatCountdown = useCallback((seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}:${secs.toString().padStart(2, '0')}` : `${secs}s`;
  }, []);

  // Get appropriate error icon based on category
  const getErrorIcon = (category) => {
    switch (category?.type) {
      case 'network': return '⚡';
      case 'email': return '✉';
      case 'rateLimit': return '⏰';
      case 'server': return '🔧';
      default: return '⚠';
    }
  };

  const formatCountdown = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}:${secs.toString().padStart(2, '0')}` : `${secs}s`;
  };

  return (
    <div className="forgot-password-container" role="main">
      <div className="forgot-password-content">
        <div 
          className={`forgot-password-card ${isLoading ? 'is-loading' : ''} ${success ? 'success' : ''}`}
          tabIndex={0}
          aria-labelledby="forgot-password-heading"
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

          <header className="forgot-password-header">
            <div className="header-icon" role="img" aria-label="lock icon">🔐</div>
            <h1 id="forgot-password-heading" className="forgot-password-title">
              reset your password
            </h1>
            <p className="forgot-password-subtitle">
              enter your email and we'll send you a link to reset your password
            </p>
          </header>

          {/* Enhanced error display */}
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
                  {error}
                </div>
              </div>
              {errorCategory?.canRetry && retryCount < 3 && countdown === 0 && (
                <button 
                  className="retry-button"
                  onClick={handleRetry}
                  aria-label={`retry password reset request (attempt ${retryCount + 2})`}
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
                  <div className="success-title">email sent!</div>
                  {success}
                </div>
              </div>
              <div className="success-actions">
                <Link to="/login" className="return-login-button">
                  ← return to login
                </Link>
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
            className="forgot-password-form"
            noValidate
            autoComplete="on"
          >
            <div className="form-group">
              <label htmlFor="email" className="form-label">
                email address
              </label>
              <div className="input-wrapper">
                <input
                  ref={emailInputRef}
                  id="email"
                  type="email"
                  className={`form-control ${(emailError && (hasSubmitted || emailTouched)) ? 'is-invalid' : ''} ${success ? 'is-valid' : ''}`}
                  value={email}
                  onChange={handleEmailChange}
                  onBlur={handleEmailBlur}
                  required
                  aria-required="true"
                  aria-invalid={!!emailError}
                  aria-describedby={emailError ? 'email-error' : 'email-help'}
                  placeholder="enter your email address"
                  disabled={isLoading || success}
                  autoComplete="email"
                  spellCheck="false"
                  maxLength="254"
                />
              </div>
              {emailError && (
                <div className="invalid-feedback" id="email-error" role="alert">
                  {emailError}
                </div>
              )}
              <div id="email-help" className="visually-hidden">
                enter the email address associated with your account
              </div>
            </div>

            <button
              type="submit"
              className={`reset-button ${isLoading ? 'loading' : ''} ${success ? 'success' : ''}`}
              disabled={!isFormValid}
              aria-busy={isLoading}
              aria-describedby="reset-status"
            >
              <span className="button-text">
                {success ? 'email sent!' : 
                 isLoading ? 'sending...' : 
                 countdown > 0 ? `wait ${formatCountdown(countdown)}` :
                 'send reset link'}
              </span>
              {retryCount > 0 && !isLoading && (
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
              {isLoading ? 'sending password reset email, please wait' : ''}
              {success ? 'password reset email sent successfully' : ''}
              {error ? `error: ${error}` : ''}
            </div>
          </form>

          <footer className="forgot-password-footer">
            <p>remember your password? <Link to="/login">sign in</Link></p>
            <p>don't have an account? <Link to="/register">sign up</Link></p>
            <p className="support-text">
              having trouble? <Link to="/contact" className="support-link">contact our support team</Link>
            </p>
          </footer>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
export default ForgotPassword;