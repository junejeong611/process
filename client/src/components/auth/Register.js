/* global gtag */
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import './Register.css';

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
const strengthColors = ['#e57373', '#ffb74d', '#fff176', '#81c784', '#4caf50'];

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
  const [registrationSuccess, setRegistrationSuccess] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [touched, setTouched] = useState({ name: false, email: false, password: false, confirmPassword: false });
  const [fieldErrors, setFieldErrors] = useState({});
  
  const navigate = useNavigate();

  // Clear any stale errors when component mounts
  useEffect(() => {
    setError('');
    setSuccess('');
    setFieldErrors({});
    document.title = 'Register - Process';
    const meta = document.createElement('meta');
    meta.name = 'description';
    meta.content = 'Create your Process account. A safe place to process your emotions.';
    document.head.appendChild(meta);
    return () => { 
      const existingMeta = document.querySelector('meta[name="description"]');
      if (existingMeta) document.head.removeChild(existingMeta);
    };
  }, []);

  // Improved validation functions (no periods, lowercase)
  const validateName = (val) => !val.trim() ? 'full name is required' : '';
  
  const validateEmail = (val) => {
    if (!val.trim()) return 'email is required';
    if (!/^\S+@\S+\.\S+$/.test(val)) return 'please enter a valid email address';
    return '';
  };
  
  const validatePassword = (val) => {
    if (val.length < 8) return 'password must be at least 8 characters long';
    if (!/[A-Z]/.test(val)) return 'password must contain at least one uppercase letter';
    if (!/[0-9]/.test(val)) return 'password must contain at least one number';
    return '';
  };
  
  const validateConfirmPassword = (val) => val !== password ? 'passwords do not match' : '';
  
  const validateAgreement = (val) => val ? '' : 'you must agree to the privacy policy';

  // Handle input changes with real-time validation clearing
  const handleNameChange = (e) => {
    setName(e.target.value);
    if (fieldErrors.name) {
      setFieldErrors(prev => ({ ...prev, name: '' }));
    }
    if (error) setError('');
  };

  const handleEmailChange = (e) => {
    setEmail(e.target.value);
    if (fieldErrors.email) {
      setFieldErrors(prev => ({ ...prev, email: '' }));
    }
    if (error) setError('');
  };

  const handlePasswordChange = (e) => {
    setPassword(e.target.value);
    if (fieldErrors.password) {
      setFieldErrors(prev => ({ ...prev, password: '' }));
    }
    if (error) setError('');
  };

  const handleConfirmPasswordChange = (e) => {
    setConfirmPassword(e.target.value);
    if (fieldErrors.confirmPassword) {
      setFieldErrors(prev => ({ ...prev, confirmPassword: '' }));
    }
    if (error) setError('');
  };

  const handleAgreementChange = (e) => {
    setAgreed(e.target.checked);
    if (fieldErrors.agreed) {
      setFieldErrors(prev => ({ ...prev, agreed: '' }));
    }
    if (error) setError('');
  };

  const handleBlur = (field) => setTouched(prev => ({ ...prev, [field]: true }));

  const validateAll = () => {
    const errors = {
      name: validateName(name),
      email: validateEmail(email),
      password: validatePassword(password),
      confirmPassword: validateConfirmPassword(confirmPassword),
      agreed: validateAgreement(agreed)
    };
    setFieldErrors(errors);
    return Object.values(errors).every((e) => !e);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setHasSubmitted(true);
    setError('');
    setErrorCategory(null);
    setSuccess('');
    
    if (!validateAll()) return;
    
    setIsLoading(true);
    
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        setRegistrationSuccess(true);
        localStorage.setItem('token', data.token);
        setSuccess('registration successful! redirecting...');
        
        // Analytics tracking for registration
        if (typeof gtag !== 'undefined') {
          gtag('event', 'sign_up', {
            'event_category': 'auth',
            'event_label': 'success'
          });
        }
        
        // Redirect new users to subscription page
        setTimeout(() => {
          navigate('/subscribe');
        }, 1200);
      } else {
        setError(data.message || 'failed to register. please try again.');
      }
    } catch (err) {
      console.error('Registration error:', err);
      setError('connection error. please check your internet and try again.');
    } finally {
      if (!registrationSuccess) setIsLoading(false);
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const getPasswordStrengthWidth = () => {
    if (!password) return 0;
    return Math.max((passwordStrength(password) / 4) * 100, 25);
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
          
          {error && (
            <div className="error-message" role="alert">
              {error}
            </div>
          )}
          
          {success && (
            <div className="success-message" role="status">
              <div className="success-content">
                <div className="success-icon">✓</div>
                <div className="success-text">
                  <div className="success-title">account created!</div>
                  {success}
                </div>
              </div>
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="register-form" noValidate>
            {/* Full Name Field */}
            <div className="form-group">
              <label htmlFor="name" className="form-label">full name</label>
              <div className="input-wrapper">
                <input
                  id="name"
                  type="text"
                  className={`form-control ${(fieldErrors.name && (hasSubmitted || touched.name)) ? 'is-invalid' : ''}`}
                  value={name}
                  onChange={handleNameChange}
                  onBlur={() => handleBlur('name')}
                  required
                  aria-required="true"
                  aria-invalid={!!fieldErrors.name}
                  aria-describedby={fieldErrors.name ? 'name-error' : undefined}
                  placeholder="full name"
                  disabled={isLoading}
                  autoComplete="name"
                  style={{ textTransform: 'none' }}
                />
              </div>
              {fieldErrors.name && (
                <div className="invalid-feedback" id="name-error">{fieldErrors.name}</div>
              )}
            </div>

            {/* Email Field */}
            <div className="form-group">
              <label htmlFor="email" className="form-label">email address</label>
              <div className="input-wrapper">
                <input
                  id="email"
                  type="email"
                  className={`form-control ${(fieldErrors.email && (hasSubmitted || touched.email)) ? 'is-invalid' : ''}`}
                  value={email}
                  onChange={handleEmailChange}
                  onBlur={() => handleBlur('email')}
                  required
                  aria-required="true"
                  aria-invalid={!!fieldErrors.email}
                  aria-describedby={fieldErrors.email ? 'email-error' : undefined}
                  placeholder="email address"
                  disabled={isLoading}
                  autoComplete="email"
                />
              </div>
              {fieldErrors.email && (
                <div className="invalid-feedback" id="email-error">{fieldErrors.email}</div>
              )}
            </div>

            {/* Password Field */}
            <div className="form-group">
              <label htmlFor="password" className="form-label">password</label>
              <div className="input-wrapper">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  className={`form-control ${(fieldErrors.password && (hasSubmitted || touched.password)) ? 'is-invalid' : ''}`}
                  value={password}
                  onChange={handlePasswordChange}
                  onBlur={() => handleBlur('password')}
                  required
                  aria-required="true"
                  aria-invalid={!!fieldErrors.password}
                  aria-describedby={fieldErrors.password ? 'password-error' : undefined}
                  placeholder="password"
                  disabled={isLoading}
                  autoComplete="new-password"
                  style={{ textTransform: 'none' }}
                />
                <button
                  type="button"
                  className="toggle-password"
                  onClick={togglePasswordVisibility}
                  aria-label={showPassword ? 'hide password' : 'show password'}
                  tabIndex="0"
                  disabled={isLoading}
                >
                  {showPassword ? 'hide' : 'show'}
                </button>
              </div>
              {fieldErrors.password && (
                <div className="invalid-feedback" id="password-error">{fieldErrors.password}</div>
              )}
              
              {/* Password Strength Indicator */}
              {password && (
                <div className="password-strength">
                  <div 
                    className="strength-bar" 
                    style={{ 
                      width: `${getPasswordStrengthWidth()}%`, 
                      background: strengthColors[passwordStrength(password)] 
                    }}
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
                  id="confirmPassword"
                  type="password"
                  className={`form-control ${(fieldErrors.confirmPassword && (hasSubmitted || touched.confirmPassword)) ? 'is-invalid' : ''}`}
                  value={confirmPassword}
                  onChange={handleConfirmPasswordChange}
                  onBlur={() => handleBlur('confirmPassword')}
                  required
                  aria-required="true"
                  aria-invalid={!!fieldErrors.confirmPassword}
                  aria-describedby={fieldErrors.confirmPassword ? 'confirmPassword-error' : undefined}
                  placeholder="confirm password"
                  disabled={isLoading}
                  autoComplete="new-password"
                  style={{ textTransform: 'none' }}
                />
              </div>
              {fieldErrors.confirmPassword && (
                <div className="invalid-feedback" id="confirmPassword-error">{fieldErrors.confirmPassword}</div>
              )}
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
                  disabled={isLoading}
                  id="privacy-checkbox"
                />
                <span className="checkbox-text">
                  I agree to the <a href="/terms" target="_blank" rel="noopener noreferrer">terms of service</a> and <a href="/privacy" target="_blank" rel="noopener noreferrer">privacy policy</a>
                </span>
              </label>
              {fieldErrors.agreed && (
                <div className="invalid-feedback">{fieldErrors.agreed}</div>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className={`register-button ${isLoading ? 'loading' : ''} ${registrationSuccess ? 'success' : ''}`}
              disabled={isLoading || registrationSuccess}
              aria-busy={isLoading}
            >
              <span className="button-text">
                {registrationSuccess ? 'success!' : isLoading ? 'creating account...' : 'create account'}
              </span>
            </button>
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