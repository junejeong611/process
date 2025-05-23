import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import './Login.css';
import { toast } from 'react-toastify';

// Form validation helper functions
const validateEmail = (email) => {
  if (!email.trim()) return 'Email is required.';
  if (!/^\S+@\S+\.\S+$/.test(email)) return 'Please enter a valid email address.';
  return '';
};

const validatePassword = (password) => {
  if (!password) return 'Password is required.';
  if (password.length < 6) return 'Password must be at least 6 characters.';
  return '';
};

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginSuccess, setLoginSuccess] = useState(false);

  const navigate = useNavigate();

  // Clear any stale errors when component mounts
  useEffect(() => {
    setError('');
    setEmailError('');
    setPasswordError('');
    document.title = 'Login - Process';
    const meta = document.createElement('meta');
    meta.name = 'description';
    meta.content = 'Login to Process, your emotional support app.';
    document.head.appendChild(meta);
    return () => { document.head.removeChild(meta); };
  }, []);

  const handleEmailChange = (e) => {
    setEmail(e.target.value);
    if (emailError) setEmailError('');
  };

  const handlePasswordChange = (e) => {
    setPassword(e.target.value);
    if (passwordError) setPasswordError('');
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    // Client-side validation
    const emailErr = validateEmail(email);
    const passwordErr = validatePassword(password);
    setEmailError(emailErr);
    setPasswordError(passwordErr);
    
    if (emailErr || passwordErr) return;
    
    setIsLoading(true);
    
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, rememberMe }),
      });
      
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
        
        // Add a slight delay for the success animation
        setTimeout(() => {
          navigate('/options');
        }, 1200);
      } else {
        setError(data.message || 'Invalid email or password. Please try again.');
        toast.error(data.message || 'Invalid email or password. Please try again.');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('Connection error. Please check your internet and try again.');
    } finally {
      if (!loginSuccess) setIsLoading(false);
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
          
          {error && (
            <div className="error-message" role="alert">
              {error.toLowerCase().includes('password') && (
                <div className="error-title">Incorrect Password</div>
              )}
              {error}
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="login-form" noValidate>
            <div className="form-group">
              <label htmlFor="email" className="form-label">email address</label>
              <div className="input-wrapper">
                <input
                  id="email"
                  type="email"
                  className={`form-control ${emailError ? 'is-invalid' : ''}`}
                  value={email}
                  onChange={handleEmailChange}
                  required
                  aria-required="true"
                  aria-invalid={!!emailError}
                  aria-describedby={emailError ? 'email-error' : undefined}
                  placeholder="email address"
                  disabled={isLoading}
                  autoComplete="username"
                />
                {emailError && (
                  <div className="invalid-feedback" id="email-error">{emailError}</div>
                )}
              </div>
            </div>
            
            <div className="form-group">
              <label htmlFor="password" className="form-label">password</label>
              <div className="input-wrapper">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  className={`form-control ${passwordError ? 'is-invalid' : ''}`}
                  value={password}
                  onChange={handlePasswordChange}
                  required
                  aria-required="true"
                  aria-invalid={!!passwordError}
                  aria-describedby={passwordError ? 'password-error' : undefined}
                  placeholder="password"
                  disabled={isLoading}
                  autoComplete="current-password"
                />
                <button 
                  type="button"
                  className="toggle-password"
                  onClick={togglePasswordVisibility}
                  aria-label={showPassword ? "hide password" : "show password"}
                  tabIndex="0"
                >
                  {showPassword ? "hide" : "show"}
                </button>
                {passwordError && (
                  <div className="invalid-feedback" id="password-error">{passwordError}</div>
                )}
              </div>
            </div>
            
            <div className="form-options">
              <div className="remember-me">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    disabled={isLoading}
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
              disabled={isLoading || loginSuccess}
              aria-busy={isLoading}
            >
              <span className="button-text">
                {loginSuccess ? 'success!' : isLoading ? 'signing in...' : 'sign in'}
              </span>
            </button>
          </form>
          
          <footer className="login-footer">
            <p>don't have an account? <Link to="/register">sign up</Link></p>
            <p className="support-text">we're here to help whenever you need us.</p>
          </footer>
          
          {/* Login progress and success animations are controlled via CSS */}
        </div>
      </div>
    </div>
  );
};

export default Login;