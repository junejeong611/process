import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import './ResetMfaRequest.css';

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

const ResetMfaRequest = () => {
    const [email, setEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [emailError, setEmailError] = useState('');
    const [emailBlurred, setEmailBlurred] = useState(false);
    const [hasSubmitted, setHasSubmitted] = useState(false);
    const [shakeEmail, setShakeEmail] = useState(false);
    const [emailFocused, setEmailFocused] = useState(false);
    const emailInputRef = useRef(null);

    const validateEmail = (email) => {
        if (!email.trim()) return 'email is required';
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) return 'please enter a valid email address';
        return '';
    };

    const handleEmailChange = (e) => {
        setEmail(e.target.value);
        if (emailError) setEmailError('');
    };

    const handleEmailInput = (e) => {
        setEmail(e.target.value);
        if (emailBlurred) {
            const validationError = validateEmail(e.target.value);
            setEmailError(validationError);
        }
    };
    const [debouncedEmail, flushDebouncedEmail] = useDebounce(email, 500);
    const handleEmailBlur = () => {
        setEmailBlurred(true);
        flushDebouncedEmail();
        const validationError = validateEmail(email);
        setEmailError(validationError);
        if (validationError) setShakeEmail(true);
        setEmailFocused(false);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setHasSubmitted(true);
        flushDebouncedEmail();
        const err = validateEmail(email);
        setEmailError(err);
        if (err) {
            setTimeout(() => {
                emailInputRef.current?.focus();
            }, 100);
            setShakeEmail(true);
            return;
        }
        setIsLoading(true);
        setMessage('');

        try {
            const response = await fetch('/api/auth/mfa/reset-request', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
            });

            const data = await response.json();

            if (response.ok) {
                toast.success(data.message);
                setMessage(data.message);
            } else {
                toast.error(data.message || 'An error occurred. Please try again.');
            }
        } catch (error) {
            console.error('MFA Reset Request Error:', error);
            toast.error('A network error occurred. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
      if (shakeEmail) {
        const id = setTimeout(() => setShakeEmail(false), 300); // match animation duration
        return () => clearTimeout(id);
      }
    }, [shakeEmail]);

    return (
        <div className="reset-mfa-request-container" role="main">
            <div className="reset-mfa-request-card">
                <header className="reset-mfa-request-header">
                    <h1 className="reset-mfa-request-title">Reset Authenticator</h1>
                    <p className="reset-mfa-request-subtitle">
                        enter your email address to reset two-factor authentication
                    </p>
                </header>

                <form onSubmit={handleSubmit} className="reset-mfa-request-form" noValidate>
                    <div className="form-group">
                        <label htmlFor="email" className="form-label">Email Address</label>
                        <div className="input-wrapper">
                            <div className={`input-shaker${shakeEmail && (emailError && (emailBlurred || hasSubmitted) && !emailFocused) ? ' shake' : ''}`}>
                                <input
                                    ref={emailInputRef}
                                    id="email"
                                    type="email"
                                    className={`form-control${(emailError && (emailBlurred || hasSubmitted) && !emailFocused) ? ' is-invalid' : ''}`}
                                    value={email}
                                    onChange={handleEmailChange}
                                    onInput={handleEmailInput}
                                    onFocus={() => setEmailFocused(true)}
                                    onBlur={handleEmailBlur}
                                    required
                                    placeholder="Enter your email"
                                    disabled={isLoading}
                                    onAnimationEnd={() => setShakeEmail(false)}
                                />
                            </div>
                        </div>
                        {emailError && (emailBlurred || hasSubmitted) && !emailFocused && (
                            <div className="feedback-container">
                              <div className="invalid-feedback" role="alert">{emailError}</div>
                            </div>
                        )}
                    </div>
                    <button
                        type="submit"
                        className={`app-button app-button--primary app-button--full-width submit-button ${isLoading ? 'loading' : ''}`}
                        disabled={isLoading}
                    >
                        {isLoading ? 'Sending...' : 'Send Reset Link'}
                    </button>
                </form>

                {message && (
                    <div className="message-display" role="alert">
                        {message}
                    </div>
                )}

                <footer className="reset-mfa-request-footer">
                    <p>remember your details? <Link to="/login">back to login</Link></p>
                </footer>
            </div>
        </div>
    );
};

export default ResetMfaRequest; 