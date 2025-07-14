import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import './ResetMfaConfirm.css';

const ResetMfaConfirm = () => {
    const { token } = useParams();
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [isSuccess, setIsSuccess] = useState(false);

    const handleConfirm = async () => {
        setIsLoading(true);
        setError('');
        setMessage('');

        try {
            const response = await fetch('/api/auth/mfa/reset-confirm', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token }),
            });

            const data = await response.json();

            if (response.ok) {
                setIsSuccess(true);
                toast.success(data.message);
                setMessage(data.message);
                setTimeout(() => navigate('/login'), 5000);
            } else {
                setError(data.message || 'An error occurred. The link may be invalid or expired.');
                toast.error(data.message || 'An error occurred.');
            }
        } catch (err) {
            console.error('MFA Reset Confirm Error:', err);
            setError('A network error occurred. Please try again.');
            toast.error('A network error occurred.');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        // You could optionally verify the token on page load as well
    }, [token]);

    return (
        <div className="reset-mfa-confirm-container" role="main">
            <div className="reset-mfa-confirm-card">
                <header className="reset-mfa-confirm-header">
                    <h1 className="reset-mfa-confirm-title">Confirm Authenticator Reset</h1>
                </header>

                {isSuccess ? (
                    <div className="confirmation-message">
                        <p>{message}</p>
                        <p>You will be redirected to the login page shortly.</p>
                        <Link to="/login" className="login-link">Go to Login Now</Link>
                    </div>
                ) : (
                    <>
                        <p className="reset-mfa-confirm-subtitle">
                            Click the button below to confirm that you want to disable two-factor authentication for your account.
                        </p>
                        
                                  {error && (
            <div className="error-card error-card--auth" role="alert">
              <div className="error-card__content">
                <div className="error-card__icon">🔐</div>
                <div className="error-card__text">
                  <h3 className="error-card__title">Reset Failed</h3>
                  <p className="error-card__message">{error}</p>
                </div>
              </div>
            </div>
          )}

                        <button
                            onClick={handleConfirm}
                            className={`app-button app-button--primary app-button--full-width confirm-button ${isLoading ? 'loading' : ''}`}
                            disabled={isLoading}
                        >
                            {isLoading ? 'Resetting...' : 'Reset My Authenticator'}
                        </button>
                        
                        <p className="warning-text">
                            Warning: This will remove the extra security layer from your account until you set it up again.
                        </p>
                    </>
                )}
            </div>
        </div>
    );
};

export default ResetMfaConfirm; 