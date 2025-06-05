import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import './ForgotPassword.css';

// Email validation helper
const validateEmail = (email) => {
  if (!email.trim()) return 'email is required';
  if (!/^\S+@\S+\.\S+$/.test(email)) return 'please enter a valid email address';
  return '';
};

// Error categorization helper
const categorizeError = (error) => {
  const errorLower = error.toLowerCase();
  if (errorLower.includes('network') || errorLower.includes('connection') || errorLower.includes('fetch')) {
    return { type: 'network', canRetry: true };
  }
  if (errorLower.includes('not found') || errorLower.includes('invalid email')) {
    return { type: 'email', canRetry: false };
  }
  if (errorLower.includes('rate limit') || errorLower.includes('too many')) {
    return { type: 'rateLimit', canRetry: false };
  }
  return { type: 'unknown', canRetry: true };
};

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [errorCategory, setErrorCategory] = useState(null);
  const [success, setSuccess] = useState('');
  const [emailError, setEmailError] = useState('');
  const [retryCount, setRetryCount] = useState(0);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [countdown, setCountdown] = useState(0);

  const navigate = useNavigate();
  const formRef = useRef(null);
  const lastSubmitEventRef = useRef(null);

  // Online/offline status monitoring
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Countdown timer for rate limiting
  useEffect(() => {
    let timer;
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [countdown]);

  // Set page title and meta
  useEffect(() => {
    document.title = 'reset password - process';
    
    const meta = document.createElement('meta');
    meta.name = 'description';
    meta.content = 'reset your process account password. enter your email to receive a password reset link.';
    document.head.appendChild(meta);
    
    return () => { 
      const existingMeta = document.querySelector('meta[name="description"]');
      if (existingMeta) document.head.removeChild(existingMeta);
    };
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e) => {
      // Enter key to submit form
      if (e.key === 'Enter' && !isLoading && email && !success && countdown === 0) {
        e.preventDefault();
        handleSubmit(e);
      }
      
      // Escape key to clear errors
      if (e.key === 'Escape' && (error || success)) {
        setError('');
        setSuccess('');
        setErrorCategory(null);
      }
    };
    
    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [email, isLoading, error, success, countdown]);

  const handleEmailChange = (e) => {
    setEmail(e.target.value);
    if (emailError) setEmailError('');
    if (error) {
      setError('');
      setErrorCategory(null);
    }
    if (success) setSuccess('');
  };

  const handleRetry = (e) => {
    if (retryCount >= 3) {
      setError('maximum retry attempts reached. please try again later.');
      return;
    }
    
    setRetryCount(prev => prev + 1);
    setError('');
    setErrorCategory(null);
    handleSubmit(lastSubmitEventRef.current || e);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    lastSubmitEventRef.current = e;
    setError('');
    setSuccess('');
    setErrorCategory(null);

    // Check if offline
    if (!isOnline) {
      const offlineError = 'you appear to be offline. please check your connection and try again.';
      setError(offlineError);
      setErrorCategory({ type: 'network', canRetry: true });
      return;
    }

    // Check countdown
    if (countdown > 0) {
      setError(`please wait ${countdown} seconds before trying again.`);
      return;
    }

    // Client-side validation
    const emailErr = validateEmail(email);
    setEmailError(emailErr);
    
    if (emailErr) {
      setTimeout(() => {
        const emailField = formRef.current?.querySelector('#email');
        if (emailField) emailField.focus();
      }, 100);
      return;
    }

    setIsLoading(true);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      const data = await response.json();

      if (data.success) {
        setSuccess('if that email is registered, a password reset link has been sent.');
        setRetryCount(0);
        setCountdown(60); // 60 second cooldown
        setError(''); // Clear any existing errors
        
        // Clear form after successful submission
        setTimeout(() => {
          setEmail('');
        }, 2000);
      } else {
        const errorMsg = data.message || 'failed to send reset link. please try again.';
        const category = categorizeError(errorMsg);
        
        setError(errorMsg);
        setErrorCategory(category);

        // Set countdown for rate limiting
        if (category.type === 'rateLimit') {
          setCountdown(300); // 5 minute cooldown for rate limiting
        }
      }
    } catch (err) {
      console.error('Forgot password error:', err);
      let errorMessage;
      let category;

      if (err.name === 'AbortError') {
        errorMessage = 'request timed out. please check your connection and try again.';
        category = categorizeError('network timeout');
      } else if (err.message.includes('fetch')) {
        errorMessage = 'connection error. please check your internet and try again.';
        category = categorizeError('network connection');
      } else {
        errorMessage = 'an unexpected error occurred, try again';
        category = categorizeError('unknown error');
      }

      setError(errorMessage);
      setErrorCategory(category);
    } finally {
      setIsLoading(false);
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
            <Link to="/login" className="back-link" aria-label="back to login">
              <span className="back-icon">←</span>
              back to login
            </Link>
          </div>

          <header className="forgot-password-header">
            <div className="header-icon">🔐</div>
            <h1 id="forgot-password-heading" className="forgot-password-title">
              reset your password
            </h1>
            <p className="forgot-password-subtitle">
              enter your email and we'll send you a link to reset your password
            </p>
          </header>

          {/* Enhanced error display - CLEAN & SIMPLE */}
          {error && (
            <div className={`error-message ${errorCategory?.type || ''}`} role="alert">
              <div className="error-content">
                <div className="error-icon">
                  {errorCategory?.type === 'network' ? '⚡' : 
                   errorCategory?.type === 'email' ? '✉' : 
                   errorCategory?.type === 'rateLimit' ? '⏰' : '⚠'}
                </div>
                <div className="error-text">
                  {error}
                </div>
              </div>
              {errorCategory?.canRetry && retryCount < 3 && countdown === 0 && (
                <button 
                  className="retry-button"
                  onClick={handleRetry}
                  aria-label="retry password reset request"
                >
                  try again
                </button>
              )}
            </div>
          )}

          {/* Success message - ENHANCED */}
          {success && (
            <div className="success-message" role="status">
              <div className="success-content">
                <div className="success-icon">✓</div>
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
            <div className="offline-indicator" role="alert">
              <span className="offline-icon">📶</span>
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
              <label htmlFor="email" className="form-label">email address</label>
              <div className="input-wrapper">
                <input
                  id="email"
                  type="email"
                  className={`form-control ${emailError ? 'is-invalid' : ''} ${success ? 'is-valid' : ''}`}
                  value={email}
                  onChange={handleEmailChange}
                  required
                  aria-required="true"
                  aria-invalid={!!emailError}
                  aria-describedby={emailError ? 'email-error' : undefined}
                  placeholder="enter your email address"
                  disabled={isLoading || success}
                  autoComplete="email"
                  spellCheck="false"
                />
              </div>
              {emailError && (
                <div className="invalid-feedback" id="email-error" role="alert">
                  {emailError}
                </div>
              )}
            </div>

            <button
              type="submit"
              className={`reset-button ${isLoading ? 'loading' : ''} ${success ? 'success' : ''}`}
              disabled={isLoading || !email || success || countdown > 0}
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
                <span className="retry-count" aria-label={`attempt ${retryCount + 1}`}>
                  #{retryCount + 1}
                </span>
              )}
            </button>

            <div id="reset-status" className="visually-hidden" aria-live="polite">
              {isLoading ? 'sending password reset email, please wait' : ''}
              {success ? 'password reset email sent successfully' : ''}
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