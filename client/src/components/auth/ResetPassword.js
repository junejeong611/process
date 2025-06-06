import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import './ResetPassword.css';

const passwordStrength = (password) => {
  let score = 0;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  return score;
};

const strengthLabels = ['too weak', 'weak', 'fair', 'good', 'strong'];
const strengthColors = ['#e57373', '#ffb74d', '#fff176', '#81c784', '#4caf50'];

const ResetPassword = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);

  // Set page title and meta when component mounts
  useEffect(() => {
    document.title = 'Reset Password - Process';
    const meta = document.createElement('meta');
    meta.name = 'description';
    meta.content = 'Reset your Process account password. Enter your new password to regain access.';
    document.head.appendChild(meta);
    return () => { 
      const existingMeta = document.querySelector('meta[name="description"]');
      if (existingMeta) document.head.removeChild(existingMeta);
    };
  }, []);

  // Improved validation functions (no periods, lowercase)
  const validatePassword = (pw) => {
    if (pw.length < 8) return 'password must be at least 8 characters long';
    if (!/[A-Z]/.test(pw)) return 'password must contain at least one uppercase letter';
    if (!/[0-9]/.test(pw)) return 'password must contain at least one number';
    return '';
  };

  const validateConfirmPassword = (confirmPw) => {
    if (!confirmPw) return 'please confirm your password';
    if (confirmPw !== password) return 'passwords do not match';
    return '';
  };

  // Handle input changes with real-time validation clearing
  const handlePasswordChange = (e) => {
    setPassword(e.target.value);
    if (passwordError) setPasswordError('');
    if (error) setError('');
  };

  const handleConfirmPasswordChange = (e) => {
    setConfirmPassword(e.target.value);
    if (confirmPasswordError) setConfirmPasswordError('');
    if (error) setError('');
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const toggleConfirmPasswordVisibility = () => {
    setShowConfirmPassword(!showConfirmPassword);
  };

  const validateAll = () => {
    const pwError = validatePassword(password);
    const confirmPwError = validateConfirmPassword(confirmPassword);
    
    setPasswordError(pwError);
    setConfirmPasswordError(confirmPwError);
    
    return !pwError && !confirmPwError;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!validateAll()) return;

    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setResetSuccess(true);
        setSuccess('password has been reset successfully! redirecting to login...');
        
        // Add a slight delay for the success animation
        setTimeout(() => {
          navigate('/login');
        }, 2500);
      } else {
        setError(data.message || 'failed to reset password. please try again.');
      }
    } catch (err) {
      console.error('Reset password error:', err);
      setError('connection error. please check your internet and try again.');
    } finally {
      if (!resetSuccess) setIsLoading(false);
    }
  };

  const getPasswordStrengthWidth = () => {
    if (!password) return 0;
    return Math.max((passwordStrength(password) / 4) * 100, 25);
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
            <Link to="/login" className="back-link" aria-label="back to login">
              <span className="back-icon">←</span>
              back to login
            </Link>
          </div>

          <header className="reset-password-header">
            <div className="header-icon">🔑</div>
            <h1 id="reset-password-heading" className="reset-password-title">
              reset your password
            </h1>
            <p className="reset-password-subtitle">
              enter your new password to regain access to your account
            </p>
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
                  <div className="success-title">password reset!</div>
                  {success}
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="reset-password-form" noValidate>
            {/* New Password Field */}
            <div className="form-group">
              <label htmlFor="password" className="form-label">new password</label>
              <div className="input-wrapper">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  className={`form-control ${passwordError ? 'is-invalid' : ''}`}
                  value={password}
                  onChange={handlePasswordChange}
                  required
                  aria-required="true"
                  aria-invalid={!!passwordError}
                  aria-describedby={passwordError ? 'password-error' : undefined}
                  placeholder="new password"
                  disabled={isLoading}
                  autoComplete="new-password"
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
              {passwordError && (
                <div className="invalid-feedback" id="password-error">{passwordError}</div>
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
              <label htmlFor="confirmPassword" className="form-label">confirm new password</label>
              <div className="input-wrapper">
                <input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  className={`form-control ${confirmPasswordError ? 'is-invalid' : ''}`}
                  value={confirmPassword}
                  onChange={handleConfirmPasswordChange}
                  required
                  aria-required="true"
                  aria-invalid={!!confirmPasswordError}
                  aria-describedby={confirmPasswordError ? 'confirmPassword-error' : undefined}
                  placeholder="confirm new password"
                  disabled={isLoading}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  className="toggle-password"
                  onClick={toggleConfirmPasswordVisibility}
                  aria-label={showConfirmPassword ? 'hide password' : 'show password'}
                  tabIndex="0"
                  disabled={isLoading}
                >
                  {showConfirmPassword ? 'hide' : 'show'}
                </button>
              </div>
              {confirmPasswordError && (
                <div className="invalid-feedback" id="confirmPassword-error">{confirmPasswordError}</div>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className={`reset-button ${isLoading ? 'loading' : ''} ${resetSuccess ? 'success' : ''}`}
              disabled={isLoading || resetSuccess}
              aria-busy={isLoading}
            >
              <span className="button-text">
                {resetSuccess ? 'success!' : isLoading ? 'resetting password...' : 'reset password'}
              </span>
            </button>
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