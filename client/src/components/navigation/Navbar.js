import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useSubscriptionStatus } from '../../hooks/useSubscriptionStatus';
import './Navbar.css';

const Navbar = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { status, loading } = useSubscriptionStatus();

  // Debug logs
  console.log('Navbar - Subscription Status:', status);
  console.log('Navbar - Loading:', loading);

  // Check if user has premium access
  const hasPremiumAccess = status && (
    status.subscriptionStatus === 'active' ||
    status.subscriptionStatus === 'trialing'
  ) && status.subscriptionStatus !== 'inactive';

  // Debug log for premium access
  console.log('Navbar - Has Premium Access:', hasPremiumAccess);
  console.log('Navbar - Current Status:', status?.subscriptionStatus);

  const navItems = [
    {
      key: 'dashboard',
      icon: (
        <svg width="20" height="20" fill="none" viewBox="0 0 24 24">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <polyline points="9,22 9,12 15,12 15,22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      ),
      label: 'dashboard',
      path: '/options'
    },
    {
      key: 'history',
      icon: (
        <svg width="20" height="20" fill="none" viewBox="0 0 24 24">
          <path d="M3 3v5h5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M3.05 13A9 9 0 1 0 6 5.3L3 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M12 7v5l4 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      ),
      label: 'history',
      path: '/chat-history',
      requiresPremium: true
    },
    {
      key: 'insights',
      icon: (
        <svg width="20" height="20" fill="none" viewBox="0 0 24 24">
          <path d="M9 19c-5 0-8-3-8-6 0-3 3-6 8-6h11l-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M20 12v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M12 5l4-4 4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M16 1v8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      ),
      label: 'insights',
      path: '/insights',
      requiresPremium: true
    },
    {
      key: 'subscribe',
      icon: (
        <svg width="20" height="20" fill="none" viewBox="0 0 24 24">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" stroke="currentColor" strokeWidth="2"/>
          <path d="M7 11V7a5 5 0 0 1 10 0v4" stroke="currentColor" strokeWidth="2"/>
          <circle cx="12" cy="16" r="1" fill="currentColor"/>
        </svg>
      ),
      label: hasPremiumAccess ? 'manage subscription' : 'subscribe',
      path: '/subscribe'
    }
  ];

  // Determine active item based on current path
  const getActiveItem = () => {
    const currentPath = location.pathname;
    
    // Handle exact matches first
    const exactMatch = navItems.find(item => item.path === currentPath);
    if (exactMatch) return exactMatch.key;
    
    // Handle route variations
    if (currentPath.startsWith('/chat-history')) return 'history';
    if (currentPath.startsWith('/insights')) return 'insights';
    if (currentPath.startsWith('/subscribe')) return 'subscribe';
    if (currentPath.startsWith('/dashboard') || currentPath === '/') return 'dashboard';
    
    return 'dashboard'; // Default fallback
  };

  const activeKey = getActiveItem();

  const handleNavigation = (item) => {
    try {
      // Check if premium access is required and user doesn't have it
      if (item.requiresPremium && !hasPremiumAccess) {
        navigate('/subscribe');
        return;
      }
      
      navigate(item.path);
    } catch (error) {
      console.error('Navigation error:', error);
    }
  };

  const handleKeyDown = (e, item) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleNavigation(item);
    }
  };

  // If still loading, show loading state
  if (loading) {
    return (
      <nav className={`navbar ${isCollapsed ? 'collapsed' : ''}`}>
        <div className="navbar-header">
          <button
            className="navbar-toggle"
            onClick={() => setIsCollapsed(!isCollapsed)}
            aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <svg 
              width="16" 
              height="16" 
              fill="none" 
              viewBox="0 0 24 24"
              className={`toggle-icon ${isCollapsed ? 'rotated' : ''}`}
            >
              <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <div 
            className="navbar-logo"
            onClick={() => navigate('/options')}
            style={{ cursor: 'pointer' }}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                navigate('/options');
              }
            }}
            aria-label="Go to options page"
          >
            <svg width="20" height="20" viewBox="0 0 48 48" fill="none">
              <path d="M24 41s-13-8.35-13-17.5C11 15.57 15.57 11 21 11c2.54 0 4.99 1.19 6.5 3.09C29.99 12.19 32.44 11 35 11c5.43 0 10 4.57 10 12.5C47 32.65 34 41 24 41z" fill="white"/>
            </svg>
          </div>
          {!isCollapsed && (
            <div className="navbar-brand">
              <h1 className="navbar-title">process</h1>
              <p className="navbar-subtitle">loading...</p>
            </div>
          )}
        </div>
        <div className="navbar-items">
          <div style={{ padding: '1rem', color: 'var(--light-gray)', fontSize: '0.85rem' }}>
            Loading...
          </div>
        </div>
      </nav>
    );
  }

  return (
    <nav className={`navbar ${isCollapsed ? 'collapsed' : ''}`}>
      {/* Header */}
      <div className="navbar-header">
        <button
          className="navbar-toggle"
          onClick={() => setIsCollapsed(!isCollapsed)}
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <svg 
            width="16" 
            height="16" 
            fill="none" 
            viewBox="0 0 24 24"
            className={`toggle-icon ${isCollapsed ? 'rotated' : ''}`}
          >
            <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <div 
          className="navbar-logo"
          onClick={() => navigate('/options')}
          style={{ cursor: 'pointer' }}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              navigate('/options');
            }
          }}
          aria-label="Go to options page"
        >
          <svg width="20" height="20" viewBox="0 0 48 48" fill="none">
            <path d="M24 41s-13-8.35-13-17.5C11 15.57 15.57 11 21 11c2.54 0 4.99 1.19 6.5 3.09C29.99 12.19 32.44 11 35 11c5.43 0 10 4.57 10 12.5C47 32.65 34 41 24 41z" fill="white"/>
          </svg>
        </div>
        {!isCollapsed && (
          <div className="navbar-brand">
            <h1 className="navbar-title">process</h1>
            <p className="navbar-subtitle">emotional support</p>
          </div>
        )}
      </div>

      {/* Navigation Items */}
      <div className="navbar-items">
        {navItems.map((item) => (
          <button
            key={item.key}
            className={`navbar-item ${activeKey === item.key ? 'active' : ''} ${
              item.requiresPremium && !hasPremiumAccess ? 'premium-required' : ''
            }`}
            onClick={() => handleNavigation(item)}
            onKeyDown={(e) => handleKeyDown(e, item)}
            aria-label={`Navigate to ${item.label}${item.requiresPremium && !hasPremiumAccess ? ' (Premium required)' : ''}`}
            title={isCollapsed ? `${item.label}${item.requiresPremium && !hasPremiumAccess ? ' (Premium required)' : ''}` : undefined}
          >
            {activeKey === item.key && <div className="navbar-item-indicator" />}
            <div className="navbar-item-icon">
              {item.icon}
              {item.requiresPremium && !hasPremiumAccess && (
                <svg 
                  width="10" 
                  height="10" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  style={{ position: 'absolute', top: '-2px', right: '-2px' }}
                >
                  <circle cx="12" cy="12" r="10" fill="var(--warning-orange, #ef6c00)"/>
                  <path d="M8 12l2 2 4-4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
            </div>
            {!isCollapsed && (
              <span className="navbar-item-label">
                {item.label}
                {item.requiresPremium && !hasPremiumAccess && (
                  <span style={{ fontSize: '0.7rem', opacity: 0.7 }}> (premium)</span>
                )}
              </span>
            )}
          </button>
        ))}
      </div>
    </nav>
  );
};

export default Navbar;