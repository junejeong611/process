import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Icon from './Icon';

const UserMenuBar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [userName, setUserName] = useState('User');
  const userMenuRef = useRef(null);

  useEffect(() => {
    // Fetch user info on mount
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    if (!token) return;
    fetch('/api/users/me', {
      headers: {
        'Content-Type': 'application/json',
        'x-auth-token': token,
      },
    })
      .then(res => res.json())
      .then(data => {
        if (data && data.name) {
          setUserName(data.name);
        }
      })
      .catch(() => {});
  }, []);

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
      await new Promise(resolve => setTimeout(resolve, 500));
      navigate('/login');
    } catch (error) {
      setIsLoggingOut(false);
    }
  };

  return (
    <div className="user-menu-container" ref={userMenuRef}>
      <button
        className="user-menu-trigger"
        onClick={() => setShowUserMenu(!showUserMenu)}
        aria-expanded={showUserMenu}
        aria-haspopup="true"
        aria-label="user menu"
        disabled={isLoggingOut}
      >
        <Icon name="user" size={24} />
      </button>
      {showUserMenu && (
        <div className="user-menu" role="menu">
          <div className="user-menu-header">
            <span className="user-name">Hello, {userName}!</span>
          </div>
          <button
            className="user-menu-item"
            onClick={() => { setShowUserMenu(false); navigate('/settings'); }}
            disabled={location.pathname === '/settings'}
            role="menuitem"
          >
            <Icon name="settings" size={20} />
            <span>settings</span>
          </button>
          <button
            className="user-menu-item logout-button"
            onClick={handleLogout}
            disabled={isLoggingOut}
            role="menuitem"
          >
            <Icon name="logout" size={20} />
            <span>{isLoggingOut ? 'logging out...' : 'logout'}</span>
            {isLoggingOut && <div className="logout-spinner" />}
          </button>
        </div>
      )}
    </div>
  );
};

export default UserMenuBar; 