import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import axios from 'axios';
import './ResetMfaRequest.css';

const ResetMfaRequest = () => {
    const [email, setEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [csrfToken, setCsrfToken] = useState('');

    useEffect(() => {
        const fetchCsrfToken = async () => {
            try {
                const { data } = await axios.get('/api/v1/csrf-token');
                setCsrfToken(data.csrfToken);
            } catch (error) {
                console.error('Failed to fetch CSRF token:', error);
                toast.error('Could not load the page securely. Please refresh and try again.');
            }
        };
        fetchCsrfToken();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setMessage('');

        if (!email) {
            toast.error('Please enter your email address.');
            setIsLoading(false);
            return;
        }
        
        if (!csrfToken) {
            toast.error('A required security token is missing. Please refresh the page.');
            setIsLoading(false);
            return;
        }

        try {
            const { data } = await axios.post('/api/auth/mfa/reset-request', 
                { email },
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRF-TOKEN': csrfToken
                    },
                    withCredentials: true
                }
            );

            toast.success(data.message);
            setMessage(data.message);
            
        } catch (error) {
            console.error('MFA Reset Request Error:', error);
            const errorMessage = error.response?.data?.message || 'An error occurred. Please try again.';
            toast.error(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

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
                        <input
                            id="email"
                            type="email"
                            className="form-control"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            placeholder="Enter your email"
                            disabled={isLoading}
                        />
                    </div>
                    <button
                        type="submit"
                        className={`submit-button ${isLoading ? 'loading' : ''}`}
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