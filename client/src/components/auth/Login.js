/* global gtag */
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import './Login.css';
import { toast } from 'react-toastify';

// Enhanced form validation helper functions
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

const validatePassword = (password) => {
  if (!password) return 'password is required';
  if (password.length < 8) return 'password must be at least 8 characters';
  if (password.length > 128) return 'password is too long';
  return '';
};

// Enhanced error categorization
const categorizeError = (error) => {
  const errorLower = error.toLowerCase();
  
  // Authentication errors
  if (errorLower.includes('invalid email') || errorLower.includes('invalid password') ||
      errorLower.includes('incorrect') || errorLower.includes('wrong')) {
    return { type: 'auth', canRetry: true, severity: 'warning' };
  }
  
  // Account issues
  if (errorLower.includes('locked') || errorLower.includes('suspended') ||
      errorLower.includes('disabled')) {
    return { type: 'account', canRetry: false, severity: 'error' };
  }
  
  // Network errors
  if (errorLower.includes('network') || errorLower.includes('connection') || 
      errorLower.includes('fetch') || errorLower.includes('timeout')) {
    return { type: 'network', canRetry: true, severity: 'warning' };
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

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [errorCategory, setErrorCategory] = useState(null);
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginSuccess, setLoginSuccess] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [countdown, setCountdown] = useState(0);
  const [submitAttempts, setSubmitAttempts] = useState(0);
  const [lastSubmitTime, setLastSubmitTime] = useState(null);
  const [emailBlurred, setEmailBlurred] = useState(false);

  const navigate = useNavigate();
  const formRef = useRef(null);
  const emailInputRef = useRef(null);
  const passwordInputRef = useRef(null);
  const controllerRef = useRef(null);

  // Debounced values for real-time validation
  const debouncedEmail = useDebounce(email, 500);
  const debouncedPassword = useDebounce(password, 300);

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

  // Enhanced page setup
  useEffect(() => {
    document.title = 'Login - Process';
    
    // Remove existing meta tags
    const existingMetas = document.querySelectorAll('meta[name="description"], meta[name="keywords"]');
    existingMetas.forEach(meta => meta.remove());
    
    // Add new meta tags
    const meta = document.createElement('meta');
    meta.name = 'description';
    meta.content = 'Login to Process, your emotional support app. A safe place to process your emotions.';
    document.head.appendChild(meta);
    
    const keywords = document.createElement('meta');
    keywords.name = 'keywords';
    keywords.content = 'login, emotional support, process, mental health';
    document.head.appendChild(keywords);
    
    return () => {
      const metas = document.querySelectorAll('meta[name="description"], meta[name="keywords"]');
      metas.forEach(meta => meta.remove());
    };
  }, []);

  // Real-time validation
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

  // Enhanced keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e) => {
      // Enter key to submit form
      if (e.key === 'Enter' && !isLoading && !loginSuccess && countdown === 0) {
        e.preventDefault();
        handleSubmit(e);
      }
      
      // Escape key to clear errors
      if (e.key === 'Escape') {
        if (error) {
          setError('');
          setErrorCategory(null);
          emailInputRef.current?.focus();
        }
      }
    };
    
    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [isLoading, loginSuccess, countdown, error]);

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
    return email.trim() && password && !emailError && !passwordError && 
           !isLoading && !loginSuccess && countdown === 0;
  }, [email, password, emailError, passwordError, isLoading, loginSuccess, countdown]);

  const handleEmailChange = useCallback((e) => {
    const newEmail = e.target.value;
    setEmail(newEmail);
    if (emailError) setEmailError('');
    if (error) {
      setError('');
      setErrorCategory(null);
    }
  }, [emailError, error]);

  const handlePasswordChange = useCallback((e) => {
    const newPassword = e.target.value;
    setPassword(newPassword);
    if (passwordError) setPasswordError('');
    if (error) {
      setError('');
      setErrorCategory(null);
    }
  }, [passwordError, error]);

  const togglePasswordVisibility = useCallback(() => {
    setShowPassword(!showPassword);
  }, [showPassword]);

  const handleRetry = useCallback((e) => {
    if (retryCount >= 3) {
      setError('maximum retry attempts reached. please try again later.');
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
    const emailErr = validateEmail(email);
    const passwordErr = validatePassword(password);
    setEmailError(emailErr);
    setPasswordError(passwordErr);
    
    if (emailErr || passwordErr) {
      setTimeout(() => {
        if (emailErr) {
          emailInputRef.current?.focus();
        } else if (passwordErr) {
          passwordInputRef.current?.focus();
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

      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        },
        body: JSON.stringify({ 
          email: email.trim().toLowerCase(), 
          password, 
          rememberMe,
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
        // Set login success state for animation
        setLoginSuccess(true);
        
        // Store token based on remember me preference
        if (rememberMe) {
          localStorage.setItem('token', data.token);
        } else {
          sessionStorage.setItem('token', data.token);
        }
        
        toast.success('Login successful!');
        
        // Analytics tracking
        if (typeof gtag !== 'undefined') {
          gtag('event', 'login', {
            'event_category': 'auth',
            'event_label': 'success'
          });
        }
        
        // Add a slight delay for the success animation
        setTimeout(() => {
          navigate('/options');
        }, 1200);
      } else {
        const errorMessage = data.message || 'Invalid email or password. Please try again.';
        const category = categorizeError(errorMessage);
        
        setError(errorMessage);
        setErrorCategory(category);
        
        // Set countdown for rate limiting
        if (category.type === 'rateLimit') {
          setCountdown(300);
        } else if (category.type === 'auth' && submitAttempts >= 3) {
          setCountdown(60);
        }
        
        toast.error(errorMessage);
      }
    } catch (err) {
      console.error('Login error:', err);
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
        errorMessage = 'connection error. please check your internet and try again.';
        category = categorizeError('unknown error');
      }

      setError(errorMessage);
      setErrorCategory(category);
    } finally {
      if (!loginSuccess) setIsLoading(false);
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
      case 'auth': return '🔐';
      case 'account': return '👤';
      case 'network': return '⚡';
      case 'rateLimit': return '⏰';
      case 'server': return '🔧';
      default: return '⚠';
    }
  };

  return (
    <div className="login-container" role="main">
      <div className="login-content">
        <div 
          className={`login-card ${isLoading ? 'is-loading' : ''} ${loginSuccess ? 'success' : ''}`} 
          tabIndex={0} 
          aria-labelledby="login-heading"
        >
          <header className="login-header" aria-live="polite">
            <h1 id="login-heading" className="login-title">welcome back</h1>
            <p className="login-subtitle">
              a safe place for you to process your emotions
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
                  {errorCategory?.type === 'auth' && (
                    <div className="error-title">Login Failed</div>
                  )}
                  {error}
                </div>
              </div>
              {errorCategory?.canRetry && retryCount < 3 && countdown === 0 && (
                <button 
                  className="retry-button"
                  onClick={handleRetry}
                  aria-label={`retry login (attempt ${retryCount + 2})`}
                  type="button"
                >
                  try again
                </button>
              )}
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
            className="login-form" 
            noValidate
            autoComplete="on"
          >
            <div className={`form-group${emailError ? ' has-error' : ''}`}>
              <label htmlFor="email" className="form-label">email address</label>
              <div className="input-wrapper">
                <input
                  ref={emailInputRef}
                  id="email"
                  type="email"
                  className={`form-control ${(emailError && emailBlurred) ? 'is-invalid' : ''}`}
                  value={email}
                  onChange={handleEmailChange}
                  onBlur={() => setEmailBlurred(true)}
                  required
                  aria-required="true"
                  aria-invalid={!!emailError}
                  aria-describedby={emailError ? 'email-error' : 'email-help'}
                  placeholder="email address"
                  disabled={isLoading || loginSuccess}
                  autoComplete="username"
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
                enter your registered email address
              </div>
            </div>
            
            <div className="form-group">
              <label htmlFor="password" className="form-label">password</label>
              <div className="input-wrapper">
                <input
                  ref={passwordInputRef}
                  id="password"
                  type={showPassword ? "text" : "password"}
                  className={`form-control ${passwordError ? 'is-invalid' : ''}`}
                  value={password}
                  onChange={handlePasswordChange}
                  required
                  aria-required="true"
                  aria-invalid={!!passwordError}
                  aria-describedby={passwordError ? 'password-error' : 'password-help'}
                  placeholder="password"
                  disabled={isLoading || loginSuccess}
                  autoComplete="current-password"
                  maxLength="128"
                />
                <button 
                  type="button"
                  className="toggle-password"
                  onClick={togglePasswordVisibility}
                  aria-label={showPassword ? "hide password" : "show password"}
                  tabIndex="0"
                  disabled={isLoading || loginSuccess}
                >
                  {showPassword ? "hide" : "show"}
                </button>
              </div>
              {passwordError && (
                <div className="invalid-feedback" id="password-error" role="alert">
                  {passwordError}
                </div>
              )}
              <div id="password-help" className="visually-hidden">
                enter your account password
              </div>
            </div>
            
            <div className="form-options">
              <div className="remember-me">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    disabled={isLoading || loginSuccess}
                    aria-checked={rememberMe}
                  />
                  <span className="checkbox-text">remember me</span>
                </label>
              </div>
              <div className="forgot-password">
                <Link to="/forgot-password">forgot password?</Link>
              </div>
            </div>
            
            <button
              type="submit"
              className={`login-button ${isLoading ? 'loading' : ''} ${loginSuccess ? 'success' : ''}`}
              disabled={!isFormValid}
              aria-busy={isLoading}
              aria-describedby="login-status"
            >
              <span className="button-text">
                {loginSuccess ? 'success!' : 
                 isLoading ? 'signing in...' : 
                 countdown > 0 ? `wait ${formatCountdown(countdown)}` :
                 'sign in'}
              </span>
              {retryCount > 0 && !isLoading && !loginSuccess && (
                <span 
                  className="retry-count" 
                  aria-label={`attempt ${retryCount + 1}`}
                  aria-hidden="true"
                >
                  #{retryCount + 1}
                </span>
              )}
            </button>

            <div id="login-status" className="visually-hidden" aria-live="polite">
              {isLoading ? 'signing in, please wait' : ''}
              {loginSuccess ? 'login successful, redirecting' : ''}
              {error ? `error: ${error}` : ''}
            </div>
          </form>
          
          <footer className="login-footer">
            <p>don't have an account? <Link to="/register">sign up</Link></p>
            <p className="support-text">we're here to help whenever you need us.</p>
          </footer>
        </div>
      </div>
    </div>
  );
};

export default Login;