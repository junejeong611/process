import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import './ResetPassword.css';
import ErrorCard from '../ErrorCard';
import { categorizeError } from '../../utils/errorUtils';
import AuthErrorCard from '../AuthErrorCard';
import Banner from '../Banner';

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
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [touched, setTouched] = useState({ password: false, confirmPassword: false });
  const [shakePassword, setShakePassword] = useState(false);
  const [shakeConfirmPassword, setShakeConfirmPassword] = useState(false);
  // Add blurred and focused state for error timing
  const [passwordBlurred, setPasswordBlurred] = useState(false);
  const [confirmPasswordBlurred, setConfirmPasswordBlurred] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [confirmPasswordFocused, setConfirmPasswordFocused] = useState(false);

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

  // Remove real-time validation on every keystroke
  // Instead, only update error on input if blurred, and always on blur/submit

  const handlePasswordChange = useCallback((e) => {
    const newPassword = e.target.value;
    setPassword(newPassword);
    if (passwordBlurred) {
      setPasswordError(validatePassword(newPassword));
    }
    if (error) {
      setError('');
      setErrorCategory(null);
    }
  }, [passwordBlurred, error]);

  const handleConfirmPasswordChange = useCallback((e) => {
    const newConfirmPassword = e.target.value;
    setConfirmPassword(newConfirmPassword);
    if (confirmPasswordBlurred) {
      setConfirmPasswordError(validateConfirmPassword(newConfirmPassword, password));
    }
    if (error) {
      setError('');
      setErrorCategory(null);
    }
  }, [confirmPasswordBlurred, error, password]);

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

  const handleBlur = (field) => setTouched(prev => ({ ...prev, [field]: true }));

  const handlePasswordBlur = (e) => {
    setPasswordBlurred(true);
    setPasswordFocused(false);
    const value = e.target.value;
    const validationError = validatePassword(value);
    setPasswordError(validationError);
    if (validationError) {
      setShakePassword(false);
      setTimeout(() => setShakePassword(true), 0);
    }
  };
  const handlePasswordFocus = () => {
    setPasswordFocused(true);
  };
  const handleConfirmPasswordBlur = (e) => {
    setConfirmPasswordBlurred(true);
    setConfirmPasswordFocused(false);
    const value = e.target.value;
    const validationError = validateConfirmPassword(value, password);
    setConfirmPasswordError(validationError);
    if (validationError) {
      setShakeConfirmPassword(false);
      setTimeout(() => setShakeConfirmPassword(true), 0);
    }
  };
  const handleConfirmPasswordFocus = () => {
    setConfirmPasswordFocused(true);
  };

  // In handleSubmit, always set errors for both fields and trigger shake if needed
  const handleSubmit = async (e) => {
    debugger;
    let errorMessage, category;
    try {
      e.preventDefault();
      setHasSubmitted(true);
      setPasswordBlurred(true);
      setConfirmPasswordBlurred(true);
      
      // Check for rapid successive submissions
      let now = Date.now();
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
      let passwordErr = validatePassword(password);
      let confirmPasswordErr = validateConfirmPassword(confirmPassword, password);
      setPasswordError(passwordErr);
      setConfirmPasswordError(confirmPasswordErr);
      if (passwordErr) {
        setShakePassword(false);
        setTimeout(() => setShakePassword(true), 0);
      }
      if (confirmPasswordErr) {
        setShakeConfirmPassword(false);
        setTimeout(() => setShakeConfirmPassword(true), 0);
      }
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
        let timeoutId = setTimeout(() => controllerRef.current.abort(), 30000);

        let response = await fetch('/api/auth/reset-password', {
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

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        let data = await response.json();
        
        if (data.success) {
          setResetSuccess(true);
          setSuccess('password has been reset successfully! redirecting to login...');
          setRetryCount(0);
          
          // Analytics tracking
          if (typeof window.gtag !== 'undefined') {
            window.gtag('event', 'password_reset_completed', {
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
          errorMessage = data.message || 'failed to reset password. please try again.';
          category = categorizeError(errorMessage);
          
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
        }
      } catch (err) {
        console.error('Reset password error:', err);

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
        if (!resetSuccess) setIsLoading(false);
        controllerRef.current = null;
      }
    } catch (outerErr) {
      console.error('Outer error in handleSubmit:', outerErr, outerErr.stack);
      throw outerErr;
    }
  };

  // Restore isFormValid useMemo
  const isFormValid = useMemo(() => {
    return password && confirmPassword && !passwordError && !confirmPasswordError && 
           !isLoading && !resetSuccess && countdown === 0 && tokenValid;
  }, [password, confirmPassword, passwordError, confirmPasswordError, isLoading, resetSuccess, countdown, tokenValid]);

  const formatCountdown = useCallback((seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}:${secs.toString().padStart(2, '0')}` : `${secs}s`;
  }, []);

  const getPasswordStrengthWidth = useCallback(() => {
    if (!password) return 0;
    return Math.max((passwordStrength(password) / 4) * 100, 25);
  }, [password]);

  // Get appropriate error icon based on category
  const getErrorIcon = (category) => {
    switch (category?.type) {
      case 'token': return '🔗';
      case 'validation': return '🔐';
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
            <div className="header-icon" role="img" aria-label="lock icon">🔑</div>
            <h1 id="reset-password-heading" className="reset-password-title">
              set a new password
            </h1>
            <p className="reset-password-subtitle">
              your new password must be different from previous passwords
            </p>
          </header>

          {/* Unified status display - prevents stacking */}
          {(error || success || !isOnline) && (() => {
            // Priority: Success > Error > Offline
            if (success) {
              return (
                <Banner
                  variant="success"
                  title="password reset!"
                  message={success}
                  icon="✅"
                  style={{ marginBottom: '1.5rem' }}
                />
              );
            } else if (error) {
              const errorMessage = error.message || error;
              const errorCategory = categorizeError(errorMessage);
              const isUnauthorized = errorCategory.type === 'auth';
              if (isUnauthorized) {
                return (
                  <div className="error-container">
                    <AuthErrorCard />
                  </div>
                );
              }
              return (
                <div className="error-container">
                  <ErrorCard
                    error={errorMessage}
                    errorCategory={errorCategory}
                    onRetry={handleRetry}
                    retryLabel="refresh page"
                  />
                </div>
              );
            } else if (!isOnline) {
              return (
                <ErrorCard
                  error="You're currently offline. Please check your internet connection."
                  errorCategory={{ type: 'network', canRetry: false }}
                />
              );
            }
          })()}

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
                <div className={`input-shaker${shakePassword ? ' shake' : ''}`}
                  onAnimationEnd={() => setShakePassword(false)}>
                  <input
                    ref={passwordInputRef}
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    className={`form-control ${(passwordError && (hasSubmitted || (passwordBlurred && !passwordFocused))) ? 'is-invalid' : ''}`}
                    value={password}
                    onChange={handlePasswordChange}
                    onBlur={handlePasswordBlur}
                    onFocus={handlePasswordFocus}
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
              </div>
              {(passwordError && (hasSubmitted || (passwordBlurred && !passwordFocused))) && (
                <div className="feedback-container">
                  <div className="invalid-feedback" id="password-error" role="alert">
                    {passwordError}
                  </div>
                </div>
              )}
              {!(passwordError && (hasSubmitted || (passwordBlurred && !passwordFocused))) && (
                <div className="feedback-container"></div>
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
                <div className={`input-shaker${shakeConfirmPassword ? ' shake' : ''}`}
                  onAnimationEnd={() => setShakeConfirmPassword(false)}>
                  <input
                    ref={confirmPasswordInputRef}
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    className={`form-control ${(confirmPasswordError && (hasSubmitted || (confirmPasswordBlurred && !confirmPasswordFocused))) ? 'is-invalid' : ''} ${confirmPassword && !confirmPasswordError ? 'is-valid' : ''}`}
                    value={confirmPassword}
                    onChange={handleConfirmPasswordChange}
                    onBlur={handleConfirmPasswordBlur}
                    onFocus={handleConfirmPasswordFocus}
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
              </div>
              {(confirmPasswordError && (hasSubmitted || (confirmPasswordBlurred && !confirmPasswordFocused))) && (
                <div className="feedback-container">
                  <div className="invalid-feedback" id="confirmPassword-error" role="alert">
                    {confirmPasswordError}
                  </div>
                </div>
              )}
              {!(confirmPasswordError && (hasSubmitted || (confirmPasswordBlurred && !confirmPasswordFocused))) && (
                <div className="feedback-container"></div>
              )}
              <div id="confirmPassword-help" className="visually-hidden">
                re-enter your new password to confirm
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className={`app-button app-button--primary app-button--full-width reset-button ${isLoading ? 'loading' : ''} ${resetSuccess ? 'success' : ''}`}
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