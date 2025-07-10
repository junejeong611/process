import React, { useState } from 'react';
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

  // Get token directly from localStorage/sessionStorage
  const token = localStorage.getItem('token') || sessionStorage.getItem('token');

  const handleManageSubscription = () => {
    navigate('/subscribe');
  };

  const handleLogout = async () => {
    try {
      // Clear tokens
      localStorage.removeItem('token');
      sessionStorage.removeItem('token');
      
      // Navigate to login
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
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
        <p className="settings-subtitle">Manage your account and preferences</p>

        {error && <p className="error-message">{error}</p>}
        {success && <p className="success-message">{success}</p>}

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
            <button className="settings-button primary-button" type="submit" disabled={loading}>
              {loading ? 'Updating...' : 'Change Password'}
            </button>
          </form>
        </div>

        {/* Manage Subscription Section */}
        <div className="settings-card">
          <h2 className="settings-card-title">Manage Subscription</h2>
          <p className="settings-card-description">View your current plan, update billing details, or cancel your subscription.</p>
          <button className="settings-button primary-button" onClick={handleManageSubscription}>
            Go to Subscription Page
          </button>
        </div>

        {/* Delete Account Section */}
        <div className="settings-card danger-zone">
          <h2 className="settings-card-title">Delete Account</h2>
          <p className="settings-card-description">Permanently delete your account and all associated data. This action cannot be undone.</p>
          <button className="settings-button danger-button" onClick={handleDeleteAccount}>
            Delete My Account
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage; 