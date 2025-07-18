/* global gtag */
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useLocation } from 'react-router-dom';
import './Login.css';
import { toast } from 'react-toastify';
import Button from '../Button';
import ErrorCard from '../ErrorCard';

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

// Enhanced network connectivity check
const checkInternetConnectivity = async () => {
  // First check navigator.onLine (basic browser connectivity)
  if (!navigator.onLine) {
    console.log('Navigator reports offline');
    return false;
  }
  
  try {
    // Test actual internet connectivity with a lightweight request
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000); // Reduced timeout
    
    const response = await fetch('/api/health', {
      method: 'HEAD',
      cache: 'no-cache',
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    // Enhanced logging
    console.log('Health check response:', {
      status: response.status,
      ok: response.ok,
      statusText: response.statusText
    });
    
    const isConnected = response.ok;
    console.log('Internet connectivity check:', isConnected ? 'CONNECTED' : 'DISCONNECTED');
    return isConnected;
  } catch (error) {
    // More detailed error logging
    console.log('Internet connectivity check failed:', {
      name: error.name,
      message: error.message,
      code: error.code
    });
    
    // Treat all fetch failures as connection problems
    return false;
  }
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
  
  // Network errors - enhanced detection
  if (errorLower.includes('network') || errorLower.includes('connection') || 
      errorLower.includes('fetch') || errorLower.includes('timeout') ||
      errorLower.includes('failed to fetch') || errorLower.includes('no internet') ||
      errorLower.includes('wifi') || errorLower.includes('offline') ||
      statusCode === 0 || errorLower.includes('disconnected')) {
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

// Custom debounce hook with flush
const useDebounce = (value, delay) => {
  const [debouncedValue, setDebouncedValue] = useState(value);
  const flush = useCallback(() => {
    setDebouncedValue(value);
  }, [value]);
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return [debouncedValue, flush];
};

const Login = () => {
  const location = useLocation();
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

  const navigate = useNavigate();
  const formRef = useRef(null);
  const emailInputRef = useRef(null);
  const passwordInputRef = useRef(null);
  const controllerRef = useRef(null);

  // Debounced values for real-time validation
  const [debouncedEmail, flushDebouncedEmail] = useDebounce(email, 500);
  const [debouncedPassword, flushDebouncedPassword] = useDebounce(password, 300);

  // Enhanced online/offline monitoring with immediate detection
  useEffect(() => {
    const handleOnline = () => {
      console.log('Online event detected');
      setIsOnline(true);
      if (error && errorCategory?.type === 'network') {
        setError('');
        setErrorCategory(null);
      }
    };
    
    const handleOffline = () => {
      console.log('Offline event detected');
      setIsOnline(false);
      setError('wifi connection lost. please reconnect to wifi and try again.');
      setErrorCategory({ type: 'network', canRetry: true, severity: 'warning' });
    };

    // Check initial state
    if (!navigator.onLine) {
      console.log('Initial offline state detected');
      setIsOnline(false);
      setError('you appear to be offline. please check your wifi connection and try again.');
      setErrorCategory({ type: 'network', canRetry: true, severity: 'warning' });
    }

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []); // Remove dependencies to avoid clearing errors prematurely

  // Aggressive connectivity monitoring to catch WiFi disconnections
  useEffect(() => {
    const checkConnectivity = async () => {
      console.log('Running periodic connectivity check...');
      console.log('Current state - isOnline:', isOnline, 'navigator.onLine:', navigator.onLine);
      
      const hasInternet = await checkInternetConnectivity();
      console.log('Connectivity check result:', hasInternet);
      
      if (!hasInternet && isOnline) {
        console.log('🔴 DISCONNECTION DETECTED! Setting offline state...');
        setIsOnline(false);
        setError('wifi connection lost. please check your wifi and try again.');
        setErrorCategory({ type: 'network', canRetry: true, severity: 'warning' });
      } else if (hasInternet && !isOnline && navigator.onLine) {
        console.log('🟢 CONNECTION RESTORED! Setting online state...');
        setIsOnline(true);
        if (error && errorCategory?.type === 'network') {
          setError('');
          setErrorCategory(null);
        }
      }
    };

    // Run check every 3 seconds (more aggressive)
    const interval = setInterval(checkConnectivity, 3000);
    
    // Run initial check immediately
    checkConnectivity();

    return () => {
      clearInterval(interval);
    };
  }, [isOnline, error, errorCategory]);

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

  // Check for mfaSetup redirect from registration
  useEffect(() => {
    if (location.state && location.state.mfaSetup) {
      setMfaStep('setup');
      if (location.state.email) {
        setEmail(location.state.email);
      }
    }
  }, [location.state]);

  // Fetch QR code and MFA token when entering setup step
  useEffect(() => {
    if (mfaStep === 'setup' && !qrCode) {
      // Call backend to get QR code and mfaToken
      (async () => {
        setIsLoading(true);
        try {
          const response = await fetch('/api/auth/mfa/setup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email }),
          });
          const data = await response.json();
          if (response.ok && data.qrCode && data.mfaToken) {
            setQrCode(data.qrCode);
            setMfaAuthToken(data.mfaToken);
          } else {
            setMfaError(data.message || 'Failed to load MFA setup.');
          }
        } catch (err) {
          setMfaError('Failed to load MFA setup.');
        } finally {
          setIsLoading(false);
        }
      })();
    }
  }, [mfaStep, qrCode, email]);

  // Real-time validation
  useEffect(() => {
    let validationError = '';
    if ((emailBlurred || hasSubmitted) && debouncedEmail && debouncedEmail.trim()) {
      validationError = validateEmail(debouncedEmail);
    }
    
    if (validationError !== emailError) {
      setEmailError(validationError);
    }
  }, [debouncedEmail, emailBlurred, hasSubmitted, emailError]);

  // Real-time validation for password only
  useEffect(() => {
    let validationError = '';
    if ((passwordBlurred || hasSubmitted) && debouncedPassword) {
      validationError = validatePassword(debouncedPassword);
    }
    if (validationError !== passwordError) {
      setPasswordError(validationError);
    }
  }, [debouncedPassword, passwordBlurred, hasSubmitted, passwordError]);

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



  const handleEmailBlur = (e) => {
    setEmailBlurred(true);
    flushDebouncedEmail();
    // Use the value from the event target, not from state
    const value = e.target.value;
    const validationError = validateEmail(value);
    setEmailError(validationError);
    if (validationError) {
      setShakeEmail(false);
      setTimeout(() => setShakeEmail(true), 0);
    }
  };

  const handlePasswordBlur = (e) => {
    setPasswordBlurred(true);
    flushDebouncedPassword();
    // Use the value from the event target, not from state
    const value = e.target.value;
    const validationError = validatePassword(value);
    setPasswordError(validationError);
    if (validationError) {
      setShakePassword(false);
      setTimeout(() => setShakePassword(true), 0);
    }
  };

  const handleEmailInput = (e) => {
    setEmail(e.target.value);
    if (emailBlurred) {
      const validationError = validateEmail(e.target.value);
      setEmailError(validationError);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setHasSubmitted(true);
    
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

    // Enhanced connectivity check
    const hasInternet = await checkInternetConnectivity();
    if (!hasInternet) {
      const errorMsg = !navigator.onLine 
        ? 'you appear to be offline. please check your wifi connection and try again.'
        : 'no internet connection detected. please check your wifi or cellular data and try again.';
      setError(errorMsg);
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
      if (emailErr) {
        setShakeEmail(false);
        setTimeout(() => setShakeEmail(true), 0);
      }
      if (passwordErr) {
        setShakePassword(false);
        setTimeout(() => setShakePassword(true), 0);
      }
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
      
      // MFA handling
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
        // Set login success state for animation
        setLoginSuccess(true);
        // Clear any lingering errors
        setPasswordError('');
        setEmailError('');
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
        
        // After login, check subscription status
        fetch('/api/subscription/status', {
          headers: { Authorization: `Bearer ${data.token}` }
        })
          .then(res => res.json())
          .then(subStatus => {
            // Add a slight delay for the success animation
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
            // Fallback to options page if subscription check fails
            setTimeout(() => {
              navigate('/options');
            }, 800);
          });
      } else {
        // Handle server-side authentication failures
        const errorMessage = data.message || 'invalid email or password. please try again.';
        const category = categorizeError(errorMessage, response.status);
        
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
      let statusCode = null;

      // Extract status code if available
      if (err.cause?.statusCode) {
        statusCode = err.cause.statusCode;
      }

      if (err.name === 'AbortError') {
        errorMessage = 'request timed out. please check your wifi connection and try again.';
        category = categorizeError('network timeout');
      } else if (err.message.includes('Failed to fetch') || err.message.includes('NetworkError')) {
        // Check if this is due to WiFi disconnection
        const hasInternet = await checkInternetConnectivity();
        if (!hasInternet) {
          errorMessage = !navigator.onLine 
            ? 'wifi connection lost. please reconnect to wifi and try again.'
            : 'no internet connection. please check your wifi or cellular data and try again.';
        } else {
          errorMessage = 'connection error. please check your internet and try again.';
        }
        category = categorizeError('network connection');
      } else if (err.message.includes('HTTP 401') || statusCode === 401) {
        errorMessage = 'invalid email or password. please try again.';
        category = categorizeError('authentication failed', 401);
      } else if (err.message.includes('HTTP 403') || statusCode === 403) {
        errorMessage = 'access denied. please check your credentials.';
        category = categorizeError('authentication failed', 403);
      } else if (err.message.includes('HTTP 429') || statusCode === 429) {
        errorMessage = 'too many login attempts. please wait before trying again.';
        category = categorizeError('rate limit', 429);
        setCountdown(300);
      } else if (err.message.includes('HTTP 5') || (statusCode >= 500 && statusCode < 600)) {
        // Check if this is actually a connectivity issue disguised as a server error
        const hasInternet = await checkInternetConnectivity();
        if (!hasInternet) {
          errorMessage = 'wifi connection lost. please check your wifi and try again.';
          category = categorizeError('network connection');
        } else {
          errorMessage = 'server error. please try again in a moment.';
          category = categorizeError('server error', statusCode);
          setCountdown(30);
        }
      } else if (statusCode === 400) {
        errorMessage = 'invalid request. please check your input and try again.';
        category = categorizeError('validation error', 400);
      } else {
        // Check if the error message itself contains authentication-related keywords
        const errorLower = err.message.toLowerCase();
        if (errorLower.includes('invalid') || errorLower.includes('incorrect') || 
            errorLower.includes('wrong') || errorLower.includes('password') ||
            errorLower.includes('email')) {
          errorMessage = err.message;
          category = categorizeError(err.message, statusCode);
        } else {
          // Check connectivity for unknown errors
          const hasInternet = await checkInternetConnectivity();
          if (!hasInternet) {
            errorMessage = 'connection lost. please check your wifi and try again.';
            category = categorizeError('network connection');
          } else {
            errorMessage = 'connection error. please check your internet and try again.';
            category = categorizeError('unknown error');
          }
        }
      }

      setError(errorMessage);
      setErrorCategory(category);
    } finally {
      if (!loginSuccess) setIsLoading(false);
      // Do not clear the controller ref if we are in an MFA step
      if (!mfaStep) {
        controllerRef.current = null;
      }
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
        const response = await fetch('/api/auth/mfa/verify', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${mfaAuthToken}`
            },
            body: JSON.stringify({ mfaCode, trustDevice }),
            signal: controllerRef.current.signal
        });

        clearTimeout(timeoutId);
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'MFA verification failed.');
        }

        // Handle successful setup
        if (data.setupComplete) {
            setBackupCodes(data.backupCodes);
            // Store the final token received after setup
            if (data.accessToken) {
                if (rememberMe) {
                    localStorage.setItem('token', data.accessToken);
                } else {
                    sessionStorage.setItem('token', data.accessToken);
                }
            }
            setMfaStep('backup-codes');
            setIsLoading(false);
            return;
        }

        // Handle successful login
        if (data.success && data.accessToken) {
            setLoginSuccess(true);
            if (rememberMe) {
                localStorage.setItem('token', data.accessToken);
            } else {
                sessionStorage.setItem('token', data.accessToken);
            }
            toast.success('Login successful!');
            setTimeout(() => navigate('/options'), 800);
        }

    } catch (err) {
        setMfaError(err.message || 'An error occurred. Please try again.');
        toast.error(err.message || 'An error occurred.');
    } finally {
        setIsLoading(false);
    }
  };

  const finishSetup = () => {
    setLoginSuccess(true);
    toast.success('Setup complete! Welcome!');
    // The token has already been stored, so we just need to redirect.
    setTimeout(() => navigate('/options'), 800);
  };

  const handleRetry = useCallback(async () => {
    // Check maximum retry attempts
    if (retryCount >= 3) {
      setError('maximum retry attempts reached. please try again later.');
      setErrorCategory({ type: 'rateLimit', canRetry: false, severity: 'error' });
      setCountdown(300);
      return;
    }
    
    setRetryCount(prev => prev + 1);
    setError('');
    setErrorCategory(null);
    
    // Re-check connectivity before retrying
    const hasInternet = await checkInternetConnectivity();
    if (!hasInternet) {
      const errorMsg = !navigator.onLine 
        ? 'still offline. please check your wifi connection and try again.'
        : 'still no internet connection. please check your wifi or cellular data and try again.';
      setError(errorMsg);
      setErrorCategory({ type: 'network', canRetry: true, severity: 'warning' });
      return;
    }
    
    // Auto-retry the login if we have valid credentials
    if (email && password && !emailError && !passwordError) {
      handleSubmit({ preventDefault: () => {} });
    }
  }, [email, password, emailError, passwordError, handleSubmit, retryCount]);

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
                <ErrorCard
                  error={mfaError}
                  errorCategory={{ type: 'auth', canRetry: false }}
                  style={{ marginBottom: '1rem' }}
                />
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
                  className={`app-button app-button--primary app-button--full-width login-button ${isLoading ? 'loading' : ''}`}
                  disabled={isLoading || mfaCode.length !== (useBackupCode ? 8 : 6)}
                >
                  <span className="button-text">
                    {isLoading ? 'verifying...' : 'verify'}
                  </span>
                </button>
              </form>
               <footer className="login-footer">
                <p>
                    <a
                      href="#"
                      className="app-link"
                      role="button"
                      tabIndex={0}
                      onClick={e => { e.preventDefault(); setUseBackupCode(!useBackupCode); }}
                      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setUseBackupCode(!useBackupCode); } }}
                      aria-pressed={useBackupCode}
                    >
                      {useBackupCode ? 'use authenticator app' : "can't access your app? use a backup code"}
                    </a>
                </p>
                <p className="support-text">
                    <Link to="/reset-mfa-request" className="app-link">having trouble? reset your authenticator</Link>
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
                  <ErrorCard
                    error={mfaError}
                    errorCategory={{ type: 'auth', canRetry: false }}
                    style={{ marginBottom: '1rem' }}
                  />
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
                    <button type="submit" className="app-button app-button--primary app-button--full-width login-button" disabled={isLoading || mfaCode.length !== 6}>
                        <span className="button-text">{isLoading ? 'verifying...' : 'verify & enable'}</span>
                    </button>
                </form>
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
              <button type="button" className="app-button app-button--primary app-button--full-width login-button" onClick={finishSetup}>
                <span className="button-text">I saved my backup codes</span>
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
          


              {/* Single unified error display - prioritizes specific errors over general offline */}
              {(error || !isOnline) && (() => {
                if (error) {
                  return (
                    <ErrorCard
                      error={error}
                      errorCategory={errorCategory}
                      onRetry={handleRetry}
                      retryLabel="Try Again"
                      style={{ marginBottom: '1rem' }}
                    />
                  );
                } else if (!isOnline) {
                  return (
                    <ErrorCard
                      error="connection lost. please check your WiFi and try again."
                      errorCategory={{ type: 'network', canRetry: false }}
                      style={{ marginBottom: '1rem' }}
                    />
                  );
                }
              })()}
              
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
                    <div className={`input-shaker${shakeEmail ? ' shake' : ''}`}
                      onAnimationEnd={() => setShakeEmail(false)}>
                      <input
                        ref={emailInputRef}
                        id="email"
                        type="email"
                        className={`form-control${(emailError && (emailBlurred || hasSubmitted) ? ' is-invalid' : '')}`}
                        value={email}
                        onChange={handleEmailChange}
                        onInput={handleEmailInput}
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
                      />
                    </div>
                  </div>
                  <div className="feedback-container">
                    {emailError && (emailBlurred || hasSubmitted) && (
                      <div className="invalid-feedback" id="email-error" role="alert">
                        {emailError}
                      </div>
                    )}
                  </div>
                  <div id="email-help" className="visually-hidden">
                    enter your registered email address
                  </div>
                </div>
                
                <div className="form-group">
                  <label htmlFor="password" className="form-label">password</label>
                  <div className="input-wrapper">
                    <div className={`input-shaker${shakePassword ? ' shake' : ''}`}
                      onAnimationEnd={() => setShakePassword(false)}>
                      <input
                        ref={passwordInputRef}
                        id="password"
                        type={showPassword ? "text" : "password"}
                        className={`form-control${(passwordError && (passwordBlurred || hasSubmitted) ? ' is-invalid' : '')}`}
                        value={password}
                        onChange={handlePasswordChange}
                        onFocus={() => setPasswordFocused(true)}
                        onBlur={handlePasswordBlur}
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
                  </div>
                  <div className="feedback-container">
                    {passwordError && (passwordBlurred || hasSubmitted) && (
                      <div className="invalid-feedback" id="password-error" role="alert">
                        {passwordError}
                      </div>
                    )}
                  </div>
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
                
                <Button
                  type="submit"
                  variant="primary"
                  fullWidth
                  loading={isLoading}
                  disabled={!isFormValid}
                  className={`login-button ${loginSuccess ? 'success' : ''}`}
                  aria-busy={isLoading}
                  aria-describedby="login-status"
                >
                  <span className="button-text">
                    {loginSuccess ? 'success!' : 
                     isLoading ? 'signing in...' : 
                     countdown > 0 ? `wait ${formatCountdown(countdown)}` :
                     'sign in'}
                  </span>
                </Button>

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