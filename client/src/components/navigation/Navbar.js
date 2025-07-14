import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useSubscription } from '../../contexts/SubscriptionContext';
import Icon from '../Icon';
import './Navbar.css';

// Responsive hook
function useWindowWidth() {
  const [width, setWidth] = useState(window.innerWidth);
  useEffect(() => {
    const handleResize = () => setWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  return width;
}

const Navbar = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { status, loading } = useSubscription();
  const width = useWindowWidth();
  const isMobile = width <= 900;

  // Debug logs
  console.log('Navbar - Subscription Status:', status);
  console.log('Navbar - Loading:', loading);

  // Check if user has premium access
  const hasPremiumAccess = (!loading && status && (status.subscriptionStatus === 'active' || status.subscriptionStatus === 'trialing'));

  // Debug log for premium access
  console.log('Navbar - Has Premium Access:', hasPremiumAccess);

  const isPremiumRoute = location.pathname.startsWith('/chat-history') || location.pathname.startsWith('/insights');

  const getSubscriptionLabel = () => {
    // While loading, show a neutral/loading state
    if (loading) {
      console.log('Navbar - Render: Loading...');
      return '...';
    }
    // After loading, determine the correct label
    const label = hasPremiumAccess ? 'Manage Subscription' : 'Subscribe';
    console.log(`Navbar - Render: Label is "${label}"`);
    return label;
  };

  const navItems = [
    {
      key: 'dashboard',
      icon: <Icon name="dashboard" size={20} />,
      label: 'dashboard',
      path: '/options',
      requiresPremium: true
    },
    {
      key: 'history',
      icon: <Icon name="history" size={20} />,
      label: 'history',
      path: '/chat-history',
      requiresPremium: true
    },
    {
      key: 'insights',
      icon: <Icon name="insights" size={20} />,
      label: 'insights',
      path: '/insights',
      requiresPremium: true
    }
    // Removed settings tab
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
    if (currentPath.startsWith('/dashboard') || currentPath === '/') return 'dashboard';
    
    return 'dashboard'; // Default fallback
  };

  const activeKey = getActiveItem();

  const handleNavigation = (item) => {
    try {
      // Always navigate to the requested page - PremiumRoute will handle the paywall
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

  return (
    <>
      {/* Hamburger icon for mobile */}
      {isMobile && (
        <button
          className="navbar-hamburger"
          onClick={() => setMobileMenuOpen(true)}
          aria-label="Open navigation menu"
        >
          <Icon name="hamburger" size={28} />
        </button>
      )}

      {/* Overlay menu for mobile */}
      {isMobile && mobileMenuOpen && (
        <div className="navbar-overlay">
          <nav className="navbar mobile open">
            <button
              className="navbar-close"
              onClick={() => setMobileMenuOpen(false)}
              aria-label="Close navigation menu"
            >
              <Icon name="close" size={24} />
            </button>
            {/* Header */}
            <div className="navbar-header">
              <button
                className="navbar-toggle"
                onClick={() => setIsCollapsed(!isCollapsed)}
                aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              >
                <Icon 
                  name={isCollapsed ? "toggleCollapsed" : "toggleExpanded"} 
                  size={16} 
                  className={`toggle-icon ${isCollapsed ? 'rotated' : ''}`}
                />
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
                <img src="/logo.svg" alt="Process Logo" width="20" height="20" style={{ filter: 'brightness(0) invert(1)' }} />
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
              {navItems.map((item) => {
                // Only show premium-required state if loading is false
                const isPremiumRequired = !loading && item.requiresPremium && !hasPremiumAccess;
                return (
                  <button
                    key={item.key}
                    className={`navbar-item ${activeKey === item.key ? 'active' : ''} ${isPremiumRequired ? 'premium-required' : ''}`}
                    onClick={() => { handleNavigation(item); setMobileMenuOpen(false); }}
                    onKeyDown={(e) => handleKeyDown(e, item)}
                    aria-label={`Navigate to ${item.label}${isPremiumRequired ? ' (Premium required)' : ''}`}
                    title={isCollapsed ? `${item.label}${isPremiumRequired ? ' (Premium required)' : ''}` : undefined}
                  >
                    {activeKey === item.key && <div className="navbar-item-indicator" />}
                    <div className="navbar-item-icon" style={{ position: 'relative' }}>
                      {item.icon}
                      {/* Only show orange icon if loading is false and premium is required */}
                      {isPremiumRequired && (
                        <Icon 
                          name="premium" 
                          size={10} 
                          style={{ position: 'absolute', top: '-2px', right: '-2px' }}
                        />
                      )}
                    </div>
                    {!isCollapsed && <span className="navbar-item-label">{item.label}</span>}
                  </button>
                );
              })}
            </div>
          </nav>
          {/* Click outside to close */}
          <div className="navbar-overlay-bg" onClick={() => setMobileMenuOpen(false)} />
        </div>
      )}

      {/* Desktop sidebar (unchanged) */}
      {!isMobile && (
        <nav className={`navbar${isCollapsed ? ' collapsed' : ''}`}> 
          {/* Header */}
          <div className="navbar-header">
            <button
              className="navbar-toggle"
              onClick={() => setIsCollapsed(!isCollapsed)}
              aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              <Icon 
                name={isCollapsed ? "toggleCollapsed" : "toggleExpanded"} 
                size={16} 
                className={`toggle-icon ${isCollapsed ? 'rotated' : ''}`}
              />
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
              <img src="/logo.svg" alt="Process Logo" width="20" height="20" style={{ filter: 'brightness(0) invert(1)' }} />
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
            {navItems.map((item) => {
              // Only show premium-required state if loading is false
              const isPremiumRequired = !loading && item.requiresPremium && !hasPremiumAccess;
              return (
                <button
                  key={item.key}
                  className={`navbar-item ${activeKey === item.key ? 'active' : ''} ${isPremiumRequired ? 'premium-required' : ''}`}
                  onClick={() => handleNavigation(item)}
                  onKeyDown={(e) => handleKeyDown(e, item)}
                  aria-label={`Navigate to ${item.label}${isPremiumRequired ? ' (Premium required)' : ''}`}
                  title={isCollapsed ? `${item.label}${isPremiumRequired ? ' (Premium required)' : ''}` : undefined}
                >
                  {activeKey === item.key && <div className="navbar-item-indicator" />}
                  <div className="navbar-item-icon" style={{ position: 'relative' }}>
                    {item.icon}
                    {/* Only show orange icon if loading is false and premium is required */}
                    {isPremiumRequired && (
                      <Icon 
                        name="premium" 
                        size={10} 
                        style={{ position: 'absolute', top: '-2px', right: '-2px' }}
                      />
                    )}
                  </div>
                  {!isCollapsed && <span className="navbar-item-label">{item.label}</span>}
                </button>
              );
            })}
          </div>
        </nav>
      )}
    </>
  );
};

export default Navbar;