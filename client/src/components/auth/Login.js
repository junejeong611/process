/* global gtag */
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios'; // Import axios
import './Login.css';
import { toast } from 'react-toastify';
import { useAuth } from '../../contexts/AuthContext';
import ErrorCard from '../common/ErrorCard';

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

// Enhanced error categorization - consistent with ResetPassword
const categorizeError = (error, statusCode = null) => {
  const errorLower = error.toLowerCase();
  
  // Authentication errors - improved detection
  if (errorLower.includes('invalid email') || errorLower.includes('invalid password') ||
      errorLower.includes('incorrect') || errorLower.includes('wrong') ||
      errorLower.includes('invalid credentials') || errorLower.includes('unauthorized') ||
      errorLower.includes('authentication failed') || errorLower.includes('login failed') ||
      statusCode === 401 || statusCode === 403) {
    return { type: 'auth', canRetry: true, severity: 'warning' };
  }
  
  // Account issues
  if (errorLower.includes('locked') || errorLower.includes('suspended') ||
      errorLower.includes('disabled') || errorLower.includes('blocked')) {
    return { type: 'account', canRetry: false, severity: 'error' };
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
  
  // Validation errors
  if (errorLower.includes('validation') || errorLower.includes('invalid format') ||
      statusCode === 400) {
    return { type: 'validation', canRetry: true, severity: 'warning' };
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
  const [passwordBlurred, setPasswordBlurred] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [shakePassword, setShakePassword] = useState(false);
  const [shakeEmail, setShakeEmail] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);

  // New states for MFA
  const [mfaStep, setMfaStep] = useState(null); // null, 'required', 'setup', 'backup-codes'
  const [mfaCode, setMfaCode] = useState('');
  const [mfaError, setMfaError] = useState('');
  const [qrCode, setQrCode] = useState('');
  const [backupCodes, setBackupCodes] = useState([]);
  const [trustDevice, setTrustDevice] = useState(false);
  // A temporary token to authorize MFA steps without full login
  const [mfaAuthToken, setMfaAuthToken] = useState(null); 
  const [useBackupCode, setUseBackupCode] = useState(false);
  const [finalAccessToken, setFinalAccessToken] = useState(null);

  const navigate = useNavigate();
  const { login } = useAuth();
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

  // Real-time validation for password only
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
      // Only handle Escape key globally
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
  }, [error]);

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
    if (error) {
      setError('');
      setErrorCategory(null);
    }
    setHasSubmitted(false);
  }, [error]);

  const handlePasswordChange = useCallback((e) => {
    const newPassword = e.target.value;
    setPassword(newPassword);
    if (error) {
      setError('');
      setErrorCategory(null);
    }
    setHasSubmitted(false);
  }, [error]);

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

  const handleEmailBlur = () => {
    setEmailBlurred(true);
    setEmailFocused(false);
    setEmailError(validateEmail(email));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setHasSubmitted(true);
    setEmailError(validateEmail(email));
    if (isLoading || !isOnline || countdown > 0) return;
    if (validateEmail(email)) return; // Prevent submit if invalid
    
    // Prevent multiple quick submissions
    const now = Date.now();
    if (lastSubmitTime && now - lastSubmitTime < 500) return; // 500ms debounce
    setLastSubmitTime(now);

    // Cancel any ongoing requests
    if (controllerRef.current) {
      controllerRef.current.abort();
    }
    controllerRef.current = new AbortController();

    setIsLoading(true);
    setError('');
    setMfaError('');
    setErrorCategory(null);
    setSubmitAttempts(prev => prev + 1);

    try {
      const response = await axios.post('/api/v1/auth/login', {
        email,
        password,
        rememberMe
      }, {
        signal: controllerRef.current.signal,
        withCredentials: true // Important for sessions/cookies
      });

      const { data } = response;
      
      if (data.mfaRequired) {
        setIsLoading(false);
        setMfaStep('required');
        setMfaAuthToken(data.mfaToken); // Store the temporary MFA token
        // Clear password from state for security
        setPassword('');
        return;
      }
      
      if (data.mfaSetupRequired) {
        setIsLoading(false);
        setMfaStep('setup');
        setQrCode(data.qrCode);
        setMfaAuthToken(data.mfaToken);
        setPassword('');
        return;
      }

      if (data.success) {
        setLoginSuccess(true);
        login(data.accessToken, data.user, rememberMe);
        toast.success('Login successful!');
        
        // Analytics tracking
        if (typeof gtag !== 'undefined') {
          gtag('event', 'login', {
            'event_category': 'auth',
            'event_label': 'success'
          });
        }
        
        // Use axios for subscription status check too for consistency
        axios.get('/api/v1/subscription/status', {
          headers: { Authorization: `Bearer ${data.accessToken}` },
          withCredentials: true
        })
          .then(res => res.data)
          .then(subStatus => {
            setTimeout(() => {
              if (subStatus.subscriptionStatus === 'inactive') {
                navigate('/subscribe');
              } else {
                navigate('/options');
              }
            }, 800);
          })
          .catch(error => {
            console.error('Subscription status check failed:', error);
            setTimeout(() => {
              navigate('/options');
            }, 800);
          });
      } else {
        const errorMessage = data.message || 'invalid email or password. please try again.';
        const category = categorizeError(errorMessage, response.status);
        setError(errorMessage);
        setErrorCategory(category);
        
        if (category.type === 'rateLimit') setCountdown(300);
        else if (category.type === 'auth' && submitAttempts >= 3) setCountdown(60);
        
        toast.error(errorMessage);
      }
    } catch (err) {
      // Handle the case where the server sends a special response for password reset
      if (err.response?.data?.passwordResetRequired) {
        const { resetToken } = err.response.data;
        toast.info('For your security, you must reset your password.');
        navigate(`/reset-password/${resetToken}`);
        return;
      }
      console.error('Login error:', err);
      let errorMessage;
      let category;
      let statusCode = err.response?.status;

      if (axios.isCancel(err)) {
        errorMessage = 'request timed out. please check your connection and try again.';
        category = categorizeError('network timeout');
      } else if (err.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        errorMessage = err.response.data?.message || `Error: ${err.response.statusText}`;
        category = categorizeError(errorMessage, statusCode);
      } else if (err.request) {
        // The request was made but no response was received
        errorMessage = 'connection error. please check your internet and try again.';
        category = categorizeError('network connection');
      } else {
        // Something happened in setting up the request that triggered an Error
        errorMessage = err.message;
        category = categorizeError(errorMessage);
      }

      setError(errorMessage);
      setErrorCategory(category);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleMfaSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setMfaError('');

    if (controllerRef.current) {
        controllerRef.current.abort();
    }
    controllerRef.current = new AbortController();
    const timeoutId = setTimeout(() => controllerRef.current.abort(), 30000);

    try {
        console.log('Submitting MFA code with payload:', { mfaCode, trustDevice, useBackupCode });
        const response = await axios.post('/api/v1/auth/mfa/verify', {
            mfaCode,
            trustDevice,
            useBackupCode
        }, {
            headers: { Authorization: `Bearer ${mfaAuthToken}` },
            withCredentials: true,
            signal: controllerRef.current.signal
        });

        clearTimeout(timeoutId);
        const data = response.data;
        console.log('MFA verification successful. Server response:', data);

        // Handle successful setup
        if (data.setupComplete) {
            setBackupCodes(data.backupCodes);
            login(data.accessToken, data.user, rememberMe);
            setFinalAccessToken(data.accessToken); // Store token for final step
            setMfaStep('backup-codes');
            setIsLoading(false);
            return;
        }

        // Handle successful login
        if (data.success && data.accessToken) {
            setLoginSuccess(true);
            login(data.accessToken, data.user, rememberMe);
            toast.success('Login successful!');
            
            // Consistent navigation based on subscription
            axios.get('/api/v1/subscription/status', {
              withCredentials: true
            })
            .then(res => res.data)
            .then(subStatus => {
                setTimeout(() => {
                    if (subStatus.subscriptionStatus === 'inactive') {
                        navigate('/subscribe');
                    } else {
                        navigate('/options');
                    }
                }, 800);
            })
            .catch(error => {
                console.error('Subscription status check failed:', error);
                setTimeout(() => {
                    navigate('/options');
                }, 800);
            });
        }

    } catch (err) {
        console.error('MFA verification failed. Full error object:', err);
        let errorMessage = 'An error occurred. Please try again.';
        if (axios.isCancel(err)) {
            errorMessage = 'Request timed out.';
        } else if (err.response) {
            console.error('Error response from server:', err.response.data);
            errorMessage = err.response.data?.message || `Error: ${err.response.statusText || err.response.status}`;
        } else if (err.request) {
            errorMessage = 'Connection error. Please check your internet and try again.';
        } else {
            errorMessage = err.message;
        }
        setMfaError(errorMessage);
        toast.error(errorMessage);
    } finally {
        setIsLoading(false);
    }
  };

  const finishSetup = () => {
    setLoginSuccess(true);
    toast.success('Setup complete! Welcome!');
    
    if (finalAccessToken) {
        axios.get('/api/v1/subscription/status', {
          withCredentials: true
        })
        .then(res => res.data)
        .then(subStatus => {
            setTimeout(() => {
                if (subStatus.subscriptionStatus === 'inactive') {
                    navigate('/subscribe');
                } else {
                    navigate('/options');
                }
            }, 800);
        })
        .catch(error => {
            console.error('Subscription status check failed:', error);
            setTimeout(() => {
                navigate('/options');
            }, 800);
        });
    } else {
        // Fallback if token is somehow missing
        setTimeout(() => navigate('/options'), 800);
    }
  };

  const formatCountdown = useCallback((seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}:${secs.toString().padStart(2, '0')}` : `${secs}s`;
  }, []);

  // Get appropriate error icon based on category - consistent with ResetPassword
  const getErrorIcon = (category) => {
    switch (category?.type) {
      case 'auth': return '🔐';
      case 'account': return '👤';
      case 'network': return '⚡';
      case 'rateLimit': return '⏰';
      case 'server': return '🔧';
      case 'validation': return '📝';
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
          {mfaStep === 'required' ? (
            <>
              <header className="login-header" aria-live="polite">
                <h1 id="login-heading" className="login-title">two-factor authentication</h1>
                <p className="login-subtitle">
                  {useBackupCode ? 'enter one of your backup codes' : 'enter the code from your authenticator app'}
                </p>
              </header>
              {/* MFA Error Display */}
              {mfaError && (
                <div className="error-message auth" role="alert" aria-live="polite">
                  <div className="error-content">
                    <div className="error-icon" aria-hidden="true">🔐</div>
                    <div className="error-text">{mfaError}</div>
                  </div>
                </div>
              )}
              <form onSubmit={handleMfaSubmit} className="login-form" noValidate>
                <div className="form-group">
                  <label htmlFor="mfa-code" className="form-label">verification code</label>
                  <div className="input-wrapper">
                      <input
                        id="mfa-code"
                        type="text"
                        className="form-control"
                        value={mfaCode}
                        onChange={(e) => {
                          const value = e.target.value;
                          if (useBackupCode) {
                            // Allow hex characters for backup codes, and force uppercase
                            setMfaCode(value.replace(/[^0-9a-fA-F]/g, '').toUpperCase());
                          } else {
                            // Allow only digits for TOTP codes
                            setMfaCode(value.replace(/[^0-9]/g, ''));
                          }
                        }}
                        required
                        autoComplete="one-time-code"
                        maxLength={useBackupCode ? 8 : 6}
                        placeholder={useBackupCode ? '8-character backup code' : '6-digit code'}
                      />
                  </div>
                </div>
                
                <div className="form-options">
                    <div className="remember-me">
                        <label className="checkbox-label mfa-checkbox">
                        <input
                            type="checkbox"
                            checked={trustDevice}
                            onChange={(e) => setTrustDevice(e.target.checked)}
                            aria-checked={trustDevice}
                        />
                        <span className="checkbox-text">trust this device for 30 days</span>
                        </label>
                    </div>
                </div>

                <button
                  type="submit"
                  className={`login-button ${isLoading ? 'loading' : ''}`}
                  disabled={isLoading || mfaCode.length !== (useBackupCode ? 8 : 6)}
                >
                  <span className="button-text">
                    {isLoading ? 'verifying...' : 'verify'}
                  </span>
                </button>
              </form>
               <footer className="login-footer">
                <p>
                    <button className="link-button" onClick={() => setUseBackupCode(!useBackupCode)}>
                        {useBackupCode ? 'use authenticator app' : "can't access your app? use a backup code"}
                    </button>
                </p>
                <p className="support-text">
                    <Link to="/reset-mfa-request">Having trouble? Reset your authenticator</Link>
                </p>
              </footer>
            </>
          ) : mfaStep === 'setup' ? (
             <>
                <header className="login-header" aria-live="polite">
                  <h1 id="login-heading" className="login-title">set up two-factor auth</h1>
                  <p className="login-subtitle">
                    scan this qr code with your authenticator app
                  </p>
                  <p className="login-app-recommendation">
                    don't have one? download Microsoft Authenticator, Google Authenticator, or Duo from the app store
                  </p>
                </header>

                {/* MFA Error Display */}
                {mfaError && (
                  <div className="error-message auth" role="alert" aria-live="polite">
                    <div className="error-content">
                      <div className="error-icon" aria-hidden="true">🔐</div>
                      <div className="error-text">{mfaError}</div>
                    </div>
                  </div>
                )}
                
                <div className="qr-code-container">
                    {qrCode ? <img src={qrCode} alt="MFA QR Code" /> : <div className="loading-spinner" style={{ margin: '0 auto' }} />}
                </div>

                 <form onSubmit={handleMfaSubmit} className="login-form" noValidate>
                    <div className="form-group">
                        <label htmlFor="mfa-code" className="form-label">verification code</label>
                        <div className="input-wrapper">
                            <input
                                id="mfa-code"
                                type="text"
                                className="form-control"
                                value={mfaCode}
                                onChange={(e) => setMfaCode(e.target.value.replace(/[^0-9]/g, ''))}
                                required
                                autoComplete="one-time-code"
                                maxLength="6"
                                placeholder="enter 6-digit code to verify"
                            />
                        </div>
                    </div>
                    <button type="submit" className="login-button" disabled={isLoading || mfaCode.length !== 6}>
                        <span className="button-text">{isLoading ? 'verifying...' : 'verify & enable'}</span>
                    </button>
                </form>
                 <footer className="login-footer">
                    <p className="support-text">
                        <Link to="/reset-mfa-request">Having trouble? Reset your authenticator</Link>
                    </p>
                </footer>
             </>
          ) : mfaStep === 'backup-codes' ? (
            <>
              <header className="login-header" aria-live="polite">
                <h1 id="login-heading" className="login-title">save your backup codes</h1>
                <p className="login-subtitle">
                  store these securely. you can use them to log in if you lose access to your authenticator app.
                </p>
              </header>
              <div className="backup-codes-container">
                <div className="backup-codes-grid">
                    {backupCodes.map((code, index) => (
                        <div key={index} className="backup-code-item">{code}</div>
                    ))}
                </div>
              </div>
              <p className="backup-codes-info">each code can only be used once</p>
              <button type="button" className="login-button" onClick={finishSetup}>
                <span className="button-text">I saved my codes</span>
              </button>
            </>
          ) : (
            <>
              <header className="login-header" aria-live="polite">
                <h1 id="login-heading" className="login-title">welcome back</h1>
                <p className="login-subtitle">
                  a safe place for you to process your emotions
                </p>
              </header>
          
              {/* Enhanced error display - consistent with ResetPassword */}
              <ErrorCard 
                error={error}
                errorCategory={errorCategory}
                onRetry={handleRetry}
                retryCount={retryCount}
              />
          
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
                      className={`form-control${(emailError && (emailBlurred || hasSubmitted) && !emailFocused) ? ' is-invalid' : ''}${shakeEmail && (emailError && (emailBlurred || hasSubmitted) && !emailFocused) ? ' shake' : ''}`}
                      value={email}
                      onChange={handleEmailChange}
                      onFocus={() => setEmailFocused(true)}
                      onBlur={handleEmailBlur}
                      required
                      aria-required="true"
                      aria-invalid={!!emailError}
                      aria-describedby={emailError ? 'email-error' : 'email-help'}
                      placeholder="email address"
                      disabled={isLoading || loginSuccess}
                      autoComplete="username"
                      spellCheck="false"
                      maxLength="254"
                      onAnimationEnd={() => setShakeEmail(false)}
                    />
                  </div>
                  {emailError && (emailBlurred || hasSubmitted) && !emailFocused && (
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
                      className={`form-control${(passwordError && (passwordBlurred || hasSubmitted) && !passwordFocused ? ' is-invalid' : '')}${shakePassword && (passwordError && (passwordBlurred || hasSubmitted) && !passwordFocused) ? ' shake' : ''}`}
                      value={password}
                      onChange={handlePasswordChange}
                      onFocus={() => setPasswordFocused(true)}
                      onBlur={() => { setPasswordBlurred(true); setPasswordFocused(false); }}
                      required
                      aria-required="true"
                      aria-invalid={!!passwordError}
                      aria-describedby={passwordError ? 'password-error' : 'password-help'}
                      placeholder="password"
                      disabled={isLoading || loginSuccess}
                      autoComplete="current-password"
                      maxLength="128"
                      onAnimationEnd={() => setShakePassword(false)}
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
                  {passwordError && (passwordBlurred || hasSubmitted) && !passwordFocused && (
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
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Login;