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

  const isOptionsPage = location.pathname === '/options';

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
          >
            Chat
          </Link>
        )}
        <Link 
          to="/chat-history" 
          className={location.pathname === '/chat-history' ? 'active' : ''}
        >
          History
        </Link>
        <Link 
          to="/insights" 
          className={location.pathname === '/insights' ? 'active' : ''}
        >
          Insights
        </Link>
      </div>
      <button onClick={handleLogout} className="logout-button">
        Logout
      </button>
    </nav>
  );
};

export default Navbar; 