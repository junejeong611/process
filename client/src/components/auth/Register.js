/* global gtag */
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import './Register.css';
import { toast } from 'react-toastify';

// Enhanced password strength calculation - consistent with ResetPassword
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

// Enhanced validation functions - consistent with Login/ResetPassword
const validateName = (name) => {
  if (!name.trim()) return 'full name is required';
  if (name.trim().length < 2) return 'name must be at least 2 characters long';
  if (name.trim().length > 50) return 'name is too long';
  if (!/^[a-zA-Z\s'-]+$/.test(name.trim())) return 'name contains invalid characters';
  return '';
};

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

const validateAgreement = (agreed) => {
  if (!agreed) return 'you must agree to the terms and privacy policy';
  return '';
};

// Enhanced error categorization - consistent with Login/ResetPassword
const categorizeError = (error, statusCode = null) => {
  const errorLower = error.toLowerCase();
  
  // Email already exists
  if (errorLower.includes('email already exists') || errorLower.includes('user already exists') ||
      errorLower.includes('already registered') || statusCode === 409) {
    return { type: 'conflict', canRetry: false, severity: 'warning' };
  }
  
  // Validation errors
  if (errorLower.includes('validation') || errorLower.includes('invalid format') ||
      errorLower.includes('required') || statusCode === 400) {
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

const Register = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [errorCategory, setErrorCategory] = useState(null);
  const [success, setSuccess] = useState('');
  const [nameError, setNameError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');
  const [agreementError, setAgreementError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [registrationSuccess, setRegistrationSuccess] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [countdown, setCountdown] = useState(0);
  const [submitAttempts, setSubmitAttempts] = useState(0);
  const [lastSubmitTime, setLastSubmitTime] = useState(null);
  const [nameBlurred, setNameBlurred] = useState(false);
  const [emailBlurred, setEmailBlurred] = useState(false);
  const [passwordBlurred, setPasswordBlurred] = useState(false);
  const [confirmPasswordBlurred, setConfirmPasswordBlurred] = useState(false);
  
  const navigate = useNavigate();
  const formRef = useRef(null);
  const nameInputRef = useRef(null);
  const emailInputRef = useRef(null);
  const passwordInputRef = useRef(null);
  const confirmPasswordInputRef = useRef(null);
  const controllerRef = useRef(null);

  // Debounced values for real-time validation
  const debouncedName = useDebounce(name, 500);
  const debouncedEmail = useDebounce(email, 500);
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
    document.title = 'Register - Process';
    
    // Remove existing meta tags
    const existingMetas = document.querySelectorAll('meta[name="description"], meta[name="keywords"]');
    existingMetas.forEach(meta => meta.remove());
    
    // Add new meta tags
    const meta = document.createElement('meta');
    meta.name = 'description';
    meta.content = 'Create your Process account. A safe place to process your emotions.';
    document.head.appendChild(meta);
    
    const keywords = document.createElement('meta');
    keywords.name = 'keywords';
    keywords.content = 'register, create account, emotional support, process, mental health';
    document.head.appendChild(keywords);
    
    return () => {
      const metas = document.querySelectorAll('meta[name="description"], meta[name="keywords"]');
      metas.forEach(meta => meta.remove());
    };
  }, []);

  // Real-time validation
  useEffect(() => {
    if (debouncedName && debouncedName.trim()) {
      const validationError = validateName(debouncedName);
      if (validationError !== nameError) {
        setNameError(validationError);
      }
    } else if (nameError && !debouncedName.trim()) {
      setNameError('');
    }
  }, [debouncedName, nameError]);

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
      if (e.key === 'Enter' && !isLoading && !registrationSuccess && countdown === 0) {
        e.preventDefault();
        handleSubmit(e);
      }
      
      // Escape key to clear errors
      if (e.key === 'Escape') {
        if (error) {
          setError('');
          setErrorCategory(null);
          nameInputRef.current?.focus();
        }
      }
    };
    
    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [isLoading, registrationSuccess, countdown, error]);

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
    return name.trim() && email.trim() && password && confirmPassword && agreed &&
           !nameError && !emailError && !passwordError && !confirmPasswordError && 
           !isLoading && !registrationSuccess && countdown === 0;
  }, [name, email, password, confirmPassword, agreed, nameError, emailError, passwordError, confirmPasswordError, isLoading, registrationSuccess, countdown]);

  const handleNameChange = useCallback((e) => {
    const newName = e.target.value;
    setName(newName);
    if (nameError) setNameError('');
    if (error) {
      setError('');
      setErrorCategory(null);
    }
  }, [nameError, error]);

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

  const handleConfirmPasswordChange = useCallback((e) => {
    const newConfirmPassword = e.target.value;
    setConfirmPassword(newConfirmPassword);
    if (confirmPasswordError) setConfirmPasswordError('');
    if (error) {
      setError('');
      setErrorCategory(null);
    }
  }, [confirmPasswordError, error]);

  const handleAgreementChange = useCallback((e) => {
    const isChecked = e.target.checked;
    setAgreed(isChecked);
    if (agreementError) setAgreementError('');
    if (error) {
      setError('');
      setErrorCategory(null);
    }
  }, [agreementError, error]);

  const togglePasswordVisibility = useCallback(() => {
    setShowPassword(!showPassword);
  }, [showPassword]);

  const toggleConfirmPasswordVisibility = useCallback(() => {
    setShowConfirmPassword(!showConfirmPassword);
  }, [showConfirmPassword]);

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
    const nameErr = validateName(name);
    const emailErr = validateEmail(email);
    const passwordErr = validatePassword(password);
    const confirmPasswordErr = validateConfirmPassword(confirmPassword, password);
    const agreementErr = validateAgreement(agreed);
    
    setNameError(nameErr);
    setEmailError(emailErr);
    setPasswordError(passwordErr);
    setConfirmPasswordError(confirmPasswordErr);
    setAgreementError(agreementErr);

    if (nameErr || emailErr || passwordErr || confirmPasswordErr || agreementErr) {
      setTimeout(() => {
        if (nameErr) {
          nameInputRef.current?.focus();
        } else if (emailErr) {
          emailInputRef.current?.focus();
        } else if (passwordErr) {
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

      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        },
        body: JSON.stringify({ 
          name: name.trim(), 
          email: email.trim().toLowerCase(), 
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
        setRegistrationSuccess(true);
        localStorage.setItem('token', data.token);
        setSuccess('registration successful! redirecting...');
        
        toast.success('Account created successfully!');
        
        // Analytics tracking
        if (typeof gtag !== 'undefined') {
          gtag('event', 'sign_up', {
            'event_category': 'auth',
            'event_label': 'success'
          });
        }
        
        // Add a slight delay for the success animation
        setTimeout(() => {
          navigate('/options');
        }, 1200);
      } else {
        // Handle server-side registration failures
        const errorMessage = data.message || 'failed to register. please try again.';
        const category = categorizeError(errorMessage, response.status);
        
        setError(errorMessage);
        setErrorCategory(category);
        
        // Set countdown for rate limiting
        if (category.type === 'rateLimit') {
          setCountdown(300);
        } else if (category.type === 'server') {
          setCountdown(30);
        }
        
        toast.error(errorMessage);
      }
    } catch (err) {
      console.error('Registration error:', err);
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
      } else if (err.message.includes('HTTP 409') || statusCode === 409) {
        errorMessage = 'an account with this email already exists. please sign in instead.';
        category = categorizeError('email already exists', 409);
      } else if (err.message.includes('HTTP 429') || statusCode === 429) {
        errorMessage = 'too many registration attempts. please wait before trying again.';
        category = categorizeError('rate limit', 429);
        setCountdown(300);
      } else if (err.message.includes('HTTP 5') || (statusCode >= 500 && statusCode < 600)) {
        errorMessage = 'server error. please try again in a moment.';
        category = categorizeError('server error', statusCode);
        setCountdown(30);
      } else if (statusCode === 400) {
        errorMessage = 'invalid registration data. please check your input and try again.';
        category = categorizeError('validation error', 400);
      } else {
        // Check if the error message itself contains specific error types
        const errorLower = err.message.toLowerCase();
        if (errorLower.includes('email') && errorLower.includes('exists')) {
          errorMessage = err.message;
          category = categorizeError(err.message, statusCode);
        } else {
          errorMessage = 'connection error. please check your internet and try again.';
          category = categorizeError('unknown error');
        }
      }

      setError(errorMessage);
      setErrorCategory(category);
    } finally {
      if (!registrationSuccess) setIsLoading(false);
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

  // Get appropriate error icon based on category - consistent with Login/ResetPassword
  const getErrorIcon = (category) => {
    switch (category?.type) {
      case 'conflict': return '👤';
      case 'validation': return '📝';
      case 'network': return '⚡';
      case 'rateLimit': return '⏰';
      case 'server': return '🔧';
      default: return '⚠';
    }
  };

  return (
    <div className="register-container" role="main">
      <div className="register-content">
        <div 
          className={`register-card ${isLoading ? 'is-loading' : ''} ${registrationSuccess ? 'success' : ''}`}
          tabIndex={0}
          aria-labelledby="register-heading"
        >
          <header className="register-header" aria-live="polite">
            <h1 id="register-heading" className="register-title">create your account</h1>
            <p className="register-subtitle">a safe place for you to process your emotions</p>
          </header>
          
          {/* Enhanced error display - consistent with Login/ResetPassword */}
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
                  {errorCategory?.type === 'conflict' && (
                    <div className="error-title">account already exists</div>
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
              {errorCategory?.canRetry && errorCategory?.type !== 'conflict' && retryCount < 3 && countdown === 0 && (
                <button 
                  className="retry-button"
                  onClick={handleRetry}
                  aria-label={`retry registration (attempt ${retryCount + 2})`}
                  type="button"
                >
                  try again
                </button>
              )}
            </div>
          )}

          {/* Enhanced success message - consistent with ResetPassword */}
          {success && (
            <div className="success-message" role="status" aria-live="polite">
              <div className="success-content">
                <div className="success-icon" aria-hidden="true">✓</div>
                <div className="success-text">
                  <div className="success-title">account created!</div>
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
            className="register-form" 
            noValidate
            autoComplete="on"
          >
            {/* Full Name Field */}
            <div className="form-group">
              <label htmlFor="name" className="form-label">full name</label>
              <div className="input-wrapper">
                <input
                  ref={nameInputRef}
                  id="name"
                  type="text"
                  className={`form-control ${(nameError && nameBlurred) ? 'is-invalid' : ''}`}
                  value={name}
                  onChange={handleNameChange}
                  onBlur={() => setNameBlurred(true)}
                  required
                  aria-required="true"
                  aria-invalid={!!nameError}
                  aria-describedby={nameError ? 'name-error' : 'name-help'}
                  placeholder="full name"
                  disabled={isLoading || registrationSuccess}
                  autoComplete="name"
                  maxLength="50"
                />
              </div>
              {nameError && (
                <div className="invalid-feedback" id="name-error" role="alert">
                  {nameError}
                </div>
              )}
              <div id="name-help" className="visually-hidden">
                enter your full name
              </div>
            </div>

            {/* Email Field */}
            <div className="form-group">
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
                  disabled={isLoading || registrationSuccess}
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
                enter your email address for your account
              </div>
            </div>

            {/* Password Field */}
            <div className="form-group">
              <label htmlFor="password" className="form-label">password</label>
              <div className="input-wrapper">
                <input
                  ref={passwordInputRef}
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  className={`form-control ${(passwordError && passwordBlurred) ? 'is-invalid' : ''}`}
                  value={password}
                  onChange={handlePasswordChange}
                  onBlur={() => setPasswordBlurred(true)}
                  required
                  aria-required="true"
                  aria-invalid={!!passwordError}
                  aria-describedby={passwordError ? 'password-error' : 'password-help'}
                  placeholder="password"
                  disabled={isLoading || registrationSuccess}
                  autoComplete="new-password"
                  maxLength="128"
                />
                <button
                  type="button"
                  className="toggle-password"
                  onClick={togglePasswordVisibility}
                  aria-label={showPassword ? 'hide password' : 'show password'}
                  tabIndex="0"
                  disabled={isLoading || registrationSuccess}
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
              <label htmlFor="confirmPassword" className="form-label">confirm password</label>
              <div className="input-wrapper">
                <input
                  ref={confirmPasswordInputRef}
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  className={`form-control ${(confirmPasswordError && confirmPasswordBlurred) ? 'is-invalid' : ''} ${confirmPassword && !confirmPasswordError ? 'is-valid' : ''}`}
                  value={confirmPassword}
                  onChange={handleConfirmPasswordChange}
                  onBlur={() => setConfirmPasswordBlurred(true)}
                  required
                  aria-required="true"
                  aria-invalid={!!confirmPasswordError}
                  aria-describedby={confirmPasswordError ? 'confirmPassword-error' : 'confirmPassword-help'}
                  placeholder="confirm password"
                  disabled={isLoading || registrationSuccess}
                  autoComplete="new-password"
                  maxLength="128"
                />
                <button
                  type="button"
                  className="toggle-password"
                  onClick={toggleConfirmPasswordVisibility}
                  aria-label={showConfirmPassword ? 'hide password' : 'show password'}
                  tabIndex="0"
                  disabled={isLoading || registrationSuccess}
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
                re-enter your password to confirm
              </div>
            </div>

            {/* Terms Agreement */}
            <div className="form-group terms-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={handleAgreementChange}
                  required
                  aria-required="true"
                  aria-invalid={!!agreementError}
                  aria-describedby={agreementError ? 'agreement-error' : 'agreement-help'}
                  disabled={isLoading || registrationSuccess}
                  id="privacy-checkbox"
                />
                <span className="checkbox-text">
                  I agree to the <a href="/terms" target="_blank" rel="noopener noreferrer">terms of service</a> and <a href="/privacy" target="_blank" rel="noopener noreferrer">privacy policy</a>
                </span>
              </label>
              {agreementError && (
                <div className="invalid-feedback" id="agreement-error" role="alert">
                  {agreementError}
                </div>
              )}
              <div id="agreement-help" className="visually-hidden">
                you must agree to proceed with registration
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className={`register-button ${isLoading ? 'loading' : ''} ${registrationSuccess ? 'success' : ''}`}
              disabled={!isFormValid}
              aria-busy={isLoading}
              aria-describedby="register-status"
            >
              <span className="button-text">
                {registrationSuccess ? 'success!' : 
                 isLoading ? 'creating account...' : 
                 countdown > 0 ? `wait ${formatCountdown(countdown)}` :
                 'create account'}
              </span>
              {retryCount > 0 && !isLoading && !registrationSuccess && (
                <span 
                  className="retry-count" 
                  aria-label={`attempt ${retryCount + 1}`}
                  aria-hidden="true"
                >
                  #{retryCount + 1}
                </span>
              )}
            </button>

            <div id="register-status" className="visually-hidden" aria-live="polite">
              {isLoading ? 'creating account, please wait' : ''}
              {registrationSuccess ? 'registration successful, redirecting' : ''}
              {error ? `error: ${error}` : ''}
            </div>
          </form>
          
          <footer className="register-footer">
            <p>already have an account? <Link to="/login">sign in</Link></p>
            <p className="support-text">we're here to help whenever you need us.</p>
          </footer>
        </div>
      </div>
    </div>
  );
};

export default Register;