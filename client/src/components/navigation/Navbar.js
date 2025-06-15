import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import './Navbar.css';

const Navbar = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const navigate = useNavigate();
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
    </nav>
  );
};

export default Navbar;