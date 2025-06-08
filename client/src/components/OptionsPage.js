/* global gtag */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import './OptionsPage.css';
import { toast } from 'react-toastify';

const HeartIcon = () => (
  <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
    <path d="M24 41s-13-8.35-13-17.5C11 15.57 15.57 11 21 11c2.54 0 4.99 1.19 6.5 3.09C29.99 12.19 32.44 11 35 11c5.43 0 10 4.57 10 12.5C47 32.65 34 41 24 41z" fill="#7bb6fa"/>
  </svg>
);

const UserIcon = () => (
  <svg width="20" height="20" fill="none" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" fill="#6b7a90"/>
  </svg>
);

const LogoutIcon = () => (
  <svg width="18" height="18" fill="none" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.59L17 17l5-5-5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z" fill="#6b7a90"/>
  </svg>
);

const options = [
  {
    key: 'voice',
    title: 'voice mode',
    subtitle: "let it all out, i'm here to listen",
    description: 'speak freely and express your emotions through voice',
    to: '/voice',
    icon: (
      <svg width="28" height="28" fill="none" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d="M12 3a4 4 0 0 1 4 4v5a4 4 0 0 1-8 0V7a4 4 0 0 1 4-4zm6 9a1 1 0 1 1 2 0 8 8 0 0 1-16 0 1 1 0 1 1 2 0 6 6 0 0 0 12 0z" />
      </svg>
    ),
    gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: '#667eea'
  },
  {
    key: 'text',
    title: 'text mode',
    subtitle: 'take your time, express at your own pace',
    description: 'write and reflect through thoughtful conversation',
    to: '/conversation',
    icon: (
      <svg width="28" height="28" fill="none" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d="M20 2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h4l4 4 4-4h4c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z" />
      </svg>
    ),
    gradient: 'linear-gradient(135deg, #4caf50 0%, #81c784 100%)',
    color: '#4caf50'
  },
];

const ChevronIcon = () => (
  <svg width="24" height="24" fill="none" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <path d="M8 5l8 7-8 7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

// Get user's name from localStorage or token
const getUserName = () => {
  try {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    if (token) {
      // In a real app, you'd decode the JWT token to get user info
      // For now, we'll use a placeholder
      return 'there'; // or extract from token payload
    }
  } catch (error) {
    console.error('Error getting user name:', error);
  }
  return 'there';
};

// Get personalized greeting based on time of day
const getTimeBasedGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return "good morning";
  if (hour < 17) return "good afternoon";
  if (hour < 21) return "good evening";
  return "good evening";
};

const OptionsPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [loadingKey, setLoadingKey] = useState(null);
  const [userName] = useState(getUserName());
  const [greeting] = useState(getTimeBasedGreeting());
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const userMenuRef = useRef(null);

  // Handle success message from login
  useEffect(() => {
    if (location.state?.message) {
      toast.success(location.state.message);
      // Clear the state to prevent showing the message again
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  useEffect(() => {
    document.title = "Dashboard - Process";
    
    // Remove existing meta tags
    const existingMetas = document.querySelectorAll('meta[name="description"], meta[name="keywords"]');
    existingMetas.forEach(meta => meta.remove());
    
    // Add new meta tags
    const meta = document.createElement('meta');
    meta.name = 'description';
    meta.content = 'Choose your support mode on Process: voice or text conversation for emotional support.';
    document.head.appendChild(meta);
    
    const keywords = document.createElement('meta');
    keywords.name = 'keywords';
    keywords.content = 'emotional support, voice therapy, text therapy, mental health, process';
    document.head.appendChild(keywords);
    
    return () => {
      const metas = document.querySelectorAll('meta[name="description"], meta[name="keywords"]');
      metas.forEach(meta => meta.remove());
    };
  }, []);

  // Close user menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setShowUserMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Enhanced keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && showUserMenu) {
        setShowUserMenu(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [showUserMenu]);

  const handleCardClick = async (key, to) => {
    if (loadingKey) return;
    
    setLoadingKey(key);
    try {
      // Analytics tracking
      if (typeof gtag !== 'undefined') {
        gtag('event', 'select_mode', {
          'event_category': 'navigation',
          'event_label': key,
          'value': 1
        });
      }
      
      // Brief delay for visual feedback
      await new Promise(resolve => setTimeout(resolve, 300));
      navigate(to);
    } catch (err) {
      console.error('Navigation error:', err);
      toast.error('Navigation failed. Please try again.');
      setLoadingKey(null);
    }
  };

  const handleKeyDown = useCallback((e, key, to) => {
    if ((e.key === 'Enter' || e.key === ' ') && !loadingKey) {
      e.preventDefault();
      handleCardClick(key, to);
    }
  }, [loadingKey]);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    setShowUserMenu(false);
    
    try {
      // Clear tokens
      localStorage.removeItem('token');
      sessionStorage.removeItem('token');
      
      // Analytics tracking
      if (typeof gtag !== 'undefined') {
        gtag('event', 'logout', {
          'event_category': 'auth',
          'event_label': 'success'
        });
      }
      
      toast.success('Logged out successfully');
      
      // Brief delay for feedback
      await new Promise(resolve => setTimeout(resolve, 500));
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
      toast.error('Logout failed. Please try again.');
      setIsLoggingOut(false);
    }
  };

  return (
    <main className="options-main" role="main">
      {/* User menu */}
      <div className="user-menu-container" ref={userMenuRef}>
        <button
          className="user-menu-trigger"
          onClick={() => setShowUserMenu(!showUserMenu)}
          aria-expanded={showUserMenu}
          aria-haspopup="true"
          aria-label="user menu"
          disabled={isLoggingOut}
        >
          <UserIcon />
        </button>
        
        {showUserMenu && (
          <div className="user-menu" role="menu">
            <div className="user-menu-header">
              <span className="user-name">Hello, {userName}!</span>
            </div>
            <button
              className="user-menu-item logout-button"
              onClick={handleLogout}
              disabled={isLoggingOut}
              role="menuitem"
            >
              <LogoutIcon />
              <span>{isLoggingOut ? 'logging out...' : 'logout'}</span>
              {isLoggingOut && <div className="logout-spinner" />}
            </button>
          </div>
        )}
      </div>

      <div className="options-center">
        <div className="options-heart" aria-hidden="true">
          <HeartIcon />
        </div>
        
        <div className="greeting-section">
          <h1 className="options-greeting">{greeting}, {userName}</h1>
          <p className="options-title">how are you feeling today?</p>
        </div>
        
        <div className="options-cards">
          {options.map((opt, index) => (
            <div
              key={opt.key}
              className={`options-card ${loadingKey === opt.key ? 'loading' : ''}`}
              tabIndex={0}
              role="button"
              aria-label={`${opt.title}: ${opt.subtitle}`}
              aria-busy={loadingKey === opt.key}
              aria-describedby={`card-desc-${opt.key}`}
              onClick={() => handleCardClick(opt.key, opt.to)}
              onKeyDown={(e) => handleKeyDown(e, opt.key, opt.to)}
              style={{
                '--card-color': opt.color,
                '--card-gradient': opt.gradient,
                animationDelay: `${index * 100}ms`
              }}
            >
              <div className="options-card-icon">
                {opt.icon}
              </div>
              
              <div className="options-card-content">
                <span className="options-card-title">{opt.title}</span>
                <span className="options-card-subtitle">{opt.subtitle}</span>
                <span className="options-card-description" id={`card-desc-${opt.key}`}>
                  {opt.description}
                </span>
              </div>
              
              <div className="options-card-action">
                {loadingKey === opt.key ? (
                  <div className="options-card-spinner" aria-label="loading" />
                ) : (
                  <ChevronIcon />
                )}
              </div>
            </div>
          ))}
        </div>
        
        <div className="options-footer">
          <p className="support-text">
            need immediate help? <Link to="/crisis-support" className="crisis-link">crisis support</Link>
          </p>
        </div>
      </div>
    </main>
  );
};

export default OptionsPage;