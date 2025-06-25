import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import axios from 'axios';
import ErrorCard from '../common/ErrorCard';
import './ResetMfaConfirm.css';

const categorizeError = (error, statusCode = null) => {
    const errorLower = error.toLowerCase();
    if (errorLower.includes('network') || errorLower.includes('failed to fetch')) {
        return { type: 'network', canRetry: true };
    }
    if (statusCode === 404 || errorLower.includes('invalid') || errorLower.includes('expired')) {
        return { type: 'validation', canRetry: false };
    }
    return { type: 'unknown', canRetry: false };
};

const ResetMfaConfirm = () => {
    const { token } = useParams();
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [errorCategory, setErrorCategory] = useState(null);
    const [isSuccess, setIsSuccess] = useState(false);
    const [csrfToken, setCsrfToken] = useState('');

    useEffect(() => {
        const fetchCsrfToken = async () => {
            try {
                const { data } = await axios.get('/api/v1/csrf-token');
                setCsrfToken(data.csrfToken);
            } catch (error) {
                toast.error('Could not load the page securely, please refresh');
                setError('A security error occurred, please refresh the page and try again');
                setErrorCategory(categorizeError('network'));
            }
        };
        fetchCsrfToken();
    }, []);

    const handleConfirm = async () => {
        setIsLoading(true);
        setError('');
        setMessage('');
        setErrorCategory(null);

        if (!csrfToken) {
            toast.error('A required security token is missing, please refresh the page');
            setError('A security error occurred, please refresh the page and try again');
            setErrorCategory(categorizeError('unknown'));
            setIsLoading(false);
            return;
        }

        try {
            const { data } = await axios.post('/api/auth/mfa/reset-confirm', 
                { token },
                {
                    headers: { 'X-CSRF-TOKEN': csrfToken },
                    withCredentials: true
                }
            );

            setIsSuccess(true);
            toast.success(data.message);
            setMessage(data.message);
            setTimeout(() => navigate('/login'), 5000);

        } catch (err) {
            console.error('MFA Reset Confirm Error:', err);
            const errorMessage = err.response?.data?.message || 'An error occurred, the link may be invalid or expired';
            const category = categorizeError(errorMessage, err.response?.status);
            setError(errorMessage);
            setErrorCategory(category);
            toast.error(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="reset-mfa-confirm-container" role="main">
            <div className="reset-mfa-confirm-card">
                <header className="reset-mfa-confirm-header">
                    <h1 className="reset-mfa-confirm-title">Reset Your Authenticator</h1>
                </header>

                {isSuccess ? (
                    <div className="confirmation-message">
                        <p>{message}</p>
                        <p>You will be redirected to the login page shortly</p>
                        <Link to="/login" className="login-link">Go to Login Now</Link>
                    </div>
                ) : (
                    <>
                        <p className="reset-mfa-confirm-subtitle">
                            This will disable two-factor authentication
                        </p>
                        
                        <ErrorCard 
                            error={error}
                            errorCategory={errorCategory}
                            onRetry={handleConfirm}
                        />

                        <button
                            onClick={handleConfirm}
                            className={`confirm-button ${isLoading ? 'loading' : ''}`}
                            disabled={isLoading || !csrfToken}
                        >
                            {isLoading ? 'Resetting...' : 'Reset My Authenticator'}
                        </button>
                        
                        <p className="warning-text">
                            For your security, set up a new authenticator the next time you log in
                        </p>
                    </>
                )}
            </div>
        </div>
    );
};

export default ResetMfaConfirm; 