import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../navigation/Navbar';
import './DashboardLayout.css';
import { toast } from 'react-toastify';

const UserIcon = () => (
  <svg width="24" height="24" fill="none" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" fill="#6b7a90"/>
  </svg>
);

const LogoutIcon = () => (
  <svg width="20" height="20" fill="none" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.59L17 17l5-5-5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z" fill="#6b7a90"/>
  </svg>
);

const getUserName = () => {
  try {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    if (token) {
      return 'User'; // Placeholder
    }
  } catch (error) {
    console.error('Error getting user name:', error);
  }
  return 'User';
};

const DashboardLayout = ({ children }) => {
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [userName] = useState(getUserName());
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const userMenuRef = useRef(null);
  const navigate = useNavigate();

  const toggleSidebar = () => {
    setSidebarOpen(!isSidebarOpen);
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    setShowUserMenu(false);
    try {
      localStorage.removeItem('token');
      sessionStorage.removeItem('token');
      toast.success('Logged out successfully');
      await new Promise(resolve => setTimeout(resolve, 500));
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
      toast.error('Logout failed. Please try again.');
      setIsLoggingOut(false);
    }
  };

  return (
    <div className="dashboard-layout">
      <Navbar isSidebarOpen={isSidebarOpen} toggleSidebar={toggleSidebar} />
      <main className={`main-content ${isSidebarOpen ? 'sidebar-open' : 'sidebar-closed'}`}>
        <div className="content-header">
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
        </div>
        <div className="page-content">
          {children}
        </div>
      </main>
    </div>
  );
};

export default DashboardLayout;