import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
// import './Register.css'; // Uncomment if you have a CSS file for styling

const Register = () => {
  // Form fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  // UI states
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const navigate = useNavigate();

  // Password validation
  const validatePassword = (password) => {
    if (password.length < 8) {
      return 'Password must be at least 8 characters long';
    }
    if (!/[A-Z]/.test(password)) {
      return 'Password must contain at least one uppercase letter';
    }
    if (!/[0-9]/.test(password)) {
      return 'Password must contain at least one number';
    }
    return '';
  };

  // Form submission handler
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setPasswordError('');
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    const passwordValidationError = validatePassword(password);
    if (passwordValidationError) {
      setPasswordError(passwordValidationError);
      return;
    }
    setIsLoading(true);
    try {
      // makes request to /api/auth/register
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });
      const data = await response.json();
      if (data.success) {
        // Optionally store token
        localStorage.setItem('token', data.token);
        navigate('/dashboard');
      } else {
        setError(data.message || 'Failed to register. Please try again.');
      }
    } catch (err) {
      setError('Failed to register. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="register-container">
      <div className="register-card">
        <h2 id="register-heading" className="register-title">Create Your Account</h2>
        <p className="register-subtitle">Join our emotional support community</p>
        {error && <div className="error-message" role="alert">{error}</div>}
        <form onSubmit={handleSubmit} aria-labelledby="register-heading" className="register-form">
          <div className="form-group">
            <label htmlFor="name">Full Name</label>
            <input
              id="name"
              type="text"
              className="form-control"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              aria-required="true"
              placeholder="Enter your full name"
              disabled={isLoading}
            />
          </div>
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              className="form-control"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              aria-required="true"
              placeholder="Enter your email"
              disabled={isLoading}
            />
          </div>
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              className={`form-control ${passwordError ? 'is-invalid' : ''}`}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              aria-required="true"
              placeholder="Create a password"
              disabled={isLoading}
            />
            {passwordError && <div className="invalid-feedback">{passwordError}</div>}
            <small className="password-hint">
              Password must be at least 8 characters long, contain an uppercase letter and a number
            </small>
          </div>
          <div className="form-group">
            <label htmlFor="confirmPassword">Confirm Password</label>
            <input
              id="confirmPassword"
              type="password"
              className="form-control"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              aria-required="true"
              placeholder="Confirm your password"
              disabled={isLoading}
            />
          </div>
          <div className="form-group terms">
            <label className="checkbox-label">
              <input
                type="checkbox"
                required
                aria-required="true"
                disabled={isLoading}
              />
              <span className="checkbox-text">
                I agree to the <a href="/terms">Terms of Service</a> and <a href="/privacy">Privacy Policy</a>
              </span>
            </label>
          </div>
          <button 
            type="submit" 
            className="register-button" 
            disabled={isLoading}
          >
            {isLoading ? 'Creating Account...' : 'Create Account'}
          </button>
        </form>
        <div className="register-footer">
          <p>Already have an account? <Link to="/login">Log in</Link></p>
        </div>
      </div>
    </div>
  );
};

export default Register;