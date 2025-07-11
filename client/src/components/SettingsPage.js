import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './SettingsPage.css';

// This would be in a proper service/API file
const deleteAccount = async (token) => {
  const response = await fetch('/api/users/me', {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      'x-auth-token': token,
    },
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || 'Failed to delete account.');
  }

  return response.json();
};

const UserIcon = () => (
  <svg width="24" height="24" fill="none" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" fill="#6b7a90"/>
  </svg>
);

const SettingsPage = () => {
  const navigate = useNavigate();
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [loading, setLoading] = useState(false);
  // Change password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const userMenuRef = useRef(null);
  const [userName, setUserName] = useState('User');

  useEffect(() => {
    // Fetch user info on mount
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    if (!token) return;
    fetch('/api/users/me', {
      headers: {
        'Content-Type': 'application/json',
        'x-auth-token': token,
      },
    })
      .then(res => res.json())
      .then(data => {
        if (data && data.name) {
          setUserName(data.name);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    console.log('[DEBUG] useEffect for user-menu-container ran');
    if (userMenuRef.current) {
      console.log('[DEBUG] user-menu-container rendered:', userMenuRef.current);
      const rect = userMenuRef.current.getBoundingClientRect();
      console.log('[DEBUG] user-menu-container bounding rect:', rect);
      const main = document.querySelector('.settings-page');
      if (main) {
        const mainStyle = window.getComputedStyle(main);
        console.log('[DEBUG] .settings-page computed position:', mainStyle.position);
      }
      const menuStyle = window.getComputedStyle(userMenuRef.current);
      console.log('[DEBUG] .user-menu-container computed position:', menuStyle.position);
    } else {
      console.log('[DEBUG] userMenuRef.current is null');
    }
  }, []);

  // Get token directly from localStorage/sessionStorage
  const token = localStorage.getItem('token') || sessionStorage.getItem('token');

  const handleManageSubscription = () => {
    navigate('/subscribe');
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    setShowUserMenu(false);
    try {
      localStorage.removeItem('token');
      sessionStorage.removeItem('token');
      // Optionally show a toast here
      await new Promise(resolve => setTimeout(resolve, 500));
      navigate('/login');
    } catch (error) {
      setIsLoggingOut(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (window.confirm('Are you sure you want to permanently delete your account? This will cancel any active subscriptions and cannot be undone.')) {
      try {
        await deleteAccount(token);
        alert('Your account has been successfully deleted.');
        handleLogout(); // Log the user out after deletion
      } catch (err) {
        setError(err.message);
        alert(`Error: ${err.message}`);
      }
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    if (newPassword !== confirmPassword) {
      setError('New passwords do not match');
      return;
    }
    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }
    setLoading(true);
    try {
      const response = await fetch('/api/users/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ currentPassword, newPassword })
      });
      const data = await response.json();
      if (data.success) {
        setSuccess('Password updated successfully');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setError(data.message || 'Failed to change password');
      }
    } catch (err) {
      setError('Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="settings-page">
      <div className="settings-container">
        <h1 className="settings-title">Settings</h1>
        <hr className="settings-divider" />
        <p className="settings-subtitle">Manage your account and preferences</p>

        {error && (
          <div className="error-card" role="alert">
            <div className="error-card__icon">!</div>
            <div className="error-card__title">Error</div>
            <div className="error-card__message">{error}</div>
          </div>
        )}
        {success && (
          <div className="error-card error-card--success" role="status">
            <div className="error-card__icon">✓</div>
            <div className="error-card__title">Success</div>
            <div className="error-card__message">{success}</div>
          </div>
        )}

        {/* Change Password Section */}
        <div className="settings-card">
          <h2 className="settings-card-title">Change Password</h2>
          <p className="settings-card-description">Update your password for better security.</p>
          <form className="settings-form" onSubmit={handleChangePassword} autoComplete="off">
            <div className="settings-form-group">
              <label htmlFor="currentPassword">Current Password</label>
              <div className="input-wrapper">
                <input
                  id="currentPassword"
                  type={showCurrentPassword ? 'text' : 'password'}
                  className="settings-form-input"
                  value={currentPassword}
                  onChange={e => setCurrentPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="toggle-password"
                  onClick={() => setShowCurrentPassword(v => !v)}
                  tabIndex="-1"
                >
                  {showCurrentPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>
            <div className="settings-form-group">
              <label htmlFor="newPassword">New Password</label>
              <div className="input-wrapper">
                <input
                  id="newPassword"
                  type={showNewPassword ? 'text' : 'password'}
                  className="settings-form-input"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  className="toggle-password"
                  onClick={() => setShowNewPassword(v => !v)}
                  tabIndex="-1"
                >
                  {showNewPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>
            <div className="settings-form-group">
              <label htmlFor="confirmPassword">Confirm New Password</label>
              <div className="input-wrapper">
                <input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  className="settings-form-input"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  className="toggle-password"
                  onClick={() => setShowConfirmPassword(v => !v)}
                  tabIndex="-1"
                >
                  {showConfirmPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>
            <button className="login-button" type="submit" disabled={loading}>
              <span className="button-text">{loading ? 'Updating...' : 'Change Password'}</span>
            </button>
          </form>
        </div>

        {/* Manage Subscription Section */}
        <div className="settings-card">
          <h2 className="settings-card-title">Manage Subscription</h2>
          <p className="settings-card-description">View your current plan, update billing details, or cancel your subscription.</p>
          <button className="login-button" onClick={handleManageSubscription}>
            <span className="button-text">Go to Subscription Page</span>
          </button>
        </div>

        {/* Delete Account Section */}
        <div className="settings-card danger-zone">
          <h2 className="settings-card-title">Delete Account</h2>
          <p className="settings-card-description">Permanently delete your account and all associated data. This action cannot be undone.</p>
          <button className="login-button" onClick={handleDeleteAccount}>
            <span className="button-text">Delete My Account</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage; 