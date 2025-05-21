import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import './Navbar.css';

const Navbar = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    // Clear both localStorage and sessionStorage
    localStorage.removeItem('token');
    sessionStorage.removeItem('token');
    // Redirect to login page
    navigate('/login');
  };

  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <img src="/logo.svg" alt="Company Logo" className="navbar-logo" />
        <span className="sr-only">Emotional Support Chat</span>
      </div>
      <div className="navbar-links">
        <Link 
          to="/chat" 
          className={location.pathname === '/chat' ? 'active' : ''}
        >
          Chat
        </Link>
        <Link 
          to="/history" 
          className={location.pathname === '/history' ? 'active' : ''}
        >
          History
        </Link>
        <button onClick={handleLogout} className="logout-button">
          Logout
        </button>
      </div>
    </nav>
  );
};

export default Navbar; 