import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useSubscriptionStatus } from '../../hooks/useSubscriptionStatus';
import './Navbar.css';

const Navbar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { status, loading } = useSubscriptionStatus();

  // Debug logs
  console.log('Navbar - Subscription Status:', status);
  console.log('Navbar - Loading:', loading);

  const handleLogout = () => {
    // Clear both localStorage and sessionStorage
    localStorage.removeItem('token');
    sessionStorage.removeItem('token');
    // Redirect to login page
    navigate('/login');
  };

  const isOptionsPage = location.pathname === '/options';
  
  // Check if user has premium access
  const hasPremiumAccess = status && (
    status.subscriptionStatus === 'active' ||
    status.subscriptionStatus === 'trialing'
  ) && status.subscriptionStatus !== 'inactive';

  // Debug log for premium access
  console.log('Navbar - Has Premium Access:', hasPremiumAccess);
  console.log('Navbar - Current Status:', status?.subscriptionStatus);

  const handlePremiumClick = (e) => {
    if (!hasPremiumAccess) {
      e.preventDefault();
      navigate('/subscribe');
    }
  };

  // If still loading, show a simpler navbar
  if (loading) {
    return (
      <nav className="navbar">
        <div className="navbar-brand">
          <Link to="/options">
            <img src="/logo.svg" alt="Company Logo" className="navbar-logo" />
            <span className="sr-only">Emotional Support Chat</span>
          </Link>
        </div>
        <div className="navbar-links">
          <Link to="/subscribe" className="nav-link">Subscribe</Link>
        </div>
        <button onClick={handleLogout} className="logout-button">
          Logout
        </button>
      </nav>
    );
  }

  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <Link to="/options">
          <img src="/logo.svg" alt="Company Logo" className="navbar-logo" />
          <span className="sr-only">Emotional Support Chat</span>
        </Link>
      </div>
      <div className="navbar-links">
        {!isOptionsPage && (
          <Link 
            to="/options"
            className={location.pathname === '/chat' ? 'active' : ''}
            onClick={handlePremiumClick}
          >
            Chat
          </Link>
        )}
        <Link 
          to="/chat-history" 
          className={location.pathname === '/chat-history' ? 'active' : ''}
          onClick={handlePremiumClick}
        >
          History
        </Link>
        <Link 
          to="/insights" 
          className={location.pathname === '/insights' ? 'active' : ''}
          onClick={handlePremiumClick}
        >
          Insights
        </Link>
        <Link to="/subscribe" className="nav-link">Subscribe</Link>
      </div>
      <button onClick={handleLogout} className="logout-button">
        Logout
      </button>
    </nav>
  );
};

export default Navbar; 