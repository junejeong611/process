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

  return (
    <div className="settings-page">
      <div className="settings-container">
        <h1 className="settings-title">Settings</h1>
        <p className="settings-subtitle">Manage your account and preferences</p>

        {error && <p className="error-message">{error}</p>}

        {/* Change Password Section */}
        <div className="settings-card">
          <h2 className="settings-card-title">Change Password</h2>
          <p className="settings-card-description">Update your password for better security. (Feature coming soon)</p>
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