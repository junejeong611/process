import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
// import './Login.css';

const passwordStrength = (password) => {
  let score = 0;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  return score;
};

const strengthLabels = ['Too Weak', 'Weak', 'Fair', 'Good', 'Strong'];
const strengthColors = ['#e57373', '#ffb74d', '#fff176', '#81c784', '#4caf50'];

const Register = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [showTooltip, setShowTooltip] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    setError('');
    setSuccess('');
    setFieldErrors({});
  }, []);

  // Inline validation
  const validateName = (val) => !val.trim() ? 'Full name is required.' : '';
  const validateEmail = (val) => {
    if (!val.trim()) return 'Email is required.';
    if (!/^\S+@\S+\.\S+$/.test(val)) return 'Please enter a valid email address.';
    return '';
  };
  const validatePassword = (val) => {
    if (val.length < 8) return 'Password must be at least 8 characters long.';
    if (!/[A-Z]/.test(val)) return 'Password must contain at least one uppercase letter.';
    if (!/[0-9]/.test(val)) return 'Password must contain at least one number.';
    return '';
  };
  const validateConfirmPassword = (val) => val !== password ? 'Passwords do not match.' : '';

  const validateAll = () => {
    const errors = {
      name: validateName(name),
      email: validateEmail(email),
      password: validatePassword(password),
      confirmPassword: validateConfirmPassword(confirmPassword),
      agreed: agreed ? '' : 'You must agree to the privacy policy.'
    };
    setFieldErrors(errors);
    return Object.values(errors).every((e) => !e);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
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
        localStorage.setItem('token', data.token);
        setSuccess('Registration successful! Redirecting...');
        setTimeout(() => navigate('/subscribe'), 1200);
      } else {
        setError(data.message || 'Failed to register. Please try again.');
      }
    } catch (err) {
      setError('Failed to register. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const tooltip = (field) => {
    const tips = {
      name: 'We use your name to personalize your experience and foster a supportive community.',
      email: 'Your email is needed for account security and password recovery. We never share it.',
      password: 'A strong password keeps your account safe. Use a mix of letters, numbers, and symbols.',
      confirmPassword: 'Please re-enter your password to ensure it matches.',
      agreed: 'You must agree to our privacy policy to use our service.'
    };
    return tips[field];
  };

  const handleShowPassword = () => setShowPassword((v) => !v);

  return (
    <div className="register-container" role="main">
      <div className={`register-card${isLoading ? ' is-loading' : ''}${success ? ' success' : ''}`}
        tabIndex={0}
        aria-labelledby="register-heading"
      >
        <header className="login-header" aria-live="polite">
          <h1 id="register-heading" className="register-title">Create your account</h1>
          <p className="register-subtitle">a safe place for you to process your emotions</p>
        </header>
        {error && <div className="error-message" role="alert">{error}</div>}
        {success && <div className="success-message" role="status">{success}</div>}
        <form onSubmit={handleSubmit} className="register-form" noValidate>
          <div className="form-group">
            <label htmlFor="name" className="form-label">Full Name
            </label>
            <div className="input-wrapper">
              <input
                id="name"
                type="text"
                className={`form-control${fieldErrors.name ? ' is-invalid' : ''}`}
                value={name}
                onChange={e => setName(e.target.value)}
                required
                aria-required="true"
                aria-invalid={!!fieldErrors.name}
                aria-describedby={fieldErrors.name ? 'name-error' : undefined}
                placeholder="Full name"
                disabled={isLoading}
                autoComplete="name"
              />
              {fieldErrors.name && <div className="invalid-feedback" id="name-error">{fieldErrors.name}</div>}
            </div>
          </div>
          <div className="form-group">
            <label htmlFor="email" className="form-label">Email
            </label>
            <div className="input-wrapper">
              <input
                id="email"
                type="email"
                className={`form-control${fieldErrors.email ? ' is-invalid' : ''}`}
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                aria-required="true"
                aria-invalid={!!fieldErrors.email}
                aria-describedby={fieldErrors.email ? 'email-error' : undefined}
                placeholder="Email address"
                disabled={isLoading}
                autoComplete="email"
              />
              {fieldErrors.email && <div className="invalid-feedback" id="email-error">{fieldErrors.email}</div>}
            </div>
          </div>
          <div className="form-group">
            <label htmlFor="password" className="form-label">Password
            </label>
            <div className="input-wrapper">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                className={`form-control${fieldErrors.password ? ' is-invalid' : ''}`}
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                aria-required="true"
                aria-invalid={!!fieldErrors.password}
                aria-describedby={fieldErrors.password ? 'password-error' : undefined}
                placeholder="Password"
                disabled={isLoading}
                autoComplete="new-password"
              />
              <button
                type="button"
                className="toggle-password"
                onClick={handleShowPassword}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                tabIndex="0"
                disabled={isLoading}
              >
                {showPassword ? 'hide' : 'show'}
              </button>
              {fieldErrors.password && <div className="invalid-feedback" id="password-error">{fieldErrors.password}</div>}
            </div>
            <div className="password-strength">
              <div className="strength-bar" style={{ width: `${(passwordStrength(password) / 4) * 100}%`, background: strengthColors[passwordStrength(password)] }}></div>
              <span className="strength-label" style={{ color: strengthColors[passwordStrength(password)] }}>{strengthLabels[passwordStrength(password)]}</span>
            </div>
          </div>
          <div className="form-group">
            <label htmlFor="confirmPassword" className="form-label">Confirm Password
            </label>
            <div className="input-wrapper">
              <input
                id="confirmPassword"
                type="password"
                className={`form-control${fieldErrors.confirmPassword ? ' is-invalid' : ''}`}
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                required
                aria-required="true"
                aria-invalid={!!fieldErrors.confirmPassword}
                aria-describedby={fieldErrors.confirmPassword ? 'confirmPassword-error' : undefined}
                placeholder="Confirm password"
                disabled={isLoading}
                autoComplete="new-password"
              />
              {fieldErrors.confirmPassword && <div className="invalid-feedback" id="confirmPassword-error">{fieldErrors.confirmPassword}</div>}
            </div>
          </div>
          <div className="form-group terms">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={agreed}
                onChange={e => setAgreed(e.target.checked)}
                required
                aria-required="true"
                disabled={isLoading}
                id="privacy-checkbox"
              />
              <span className="checkbox-text">
                <span className="capital-i">I</span> agree to the <a href="/terms" target="_blank" rel="noopener noreferrer">terms of service</a> and <a href="/privacy" target="_blank" rel="noopener noreferrer">privacy policy</a>
              </span>
            </label>
            {fieldErrors.agreed && <div className="invalid-feedback">{fieldErrors.agreed}</div>}
          </div>
          <button
            type="submit"
            className={`register-button${isLoading ? ' loading' : ''}${success ? ' success' : ''}`}
            disabled={isLoading || success}
            aria-busy={isLoading}
          >
            <span className="button-text">
              {success ? 'Success!' : isLoading ? 'Creating Account...' : 'Create Account'}
            </span>
          </button>
        </form>
        <footer className="register-footer">
          <p>Already have an account? <Link to="/login">Log in</Link></p>
          <p className="support-text">We're here to help whenever you need us.</p>
        </footer>
      </div>
    </div>
  );
};

export default Register;