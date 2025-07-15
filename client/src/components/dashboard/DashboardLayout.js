import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../navigation/Navbar';
import Icon from '../Icon';
import './DashboardLayout.css';
import { toast } from 'react-toastify';
import UserMenuBar from '../UserMenuBar';

// Using standardized Icon component instead of inline SVGs

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

/**
 * DashboardLayout component
 * @param {object} props
 * @param {React.ReactNode} props.children - The content to render inside the layout
 * @param {boolean} [props.sidebarOffset=true] - Whether to offset the page content for the sidebar
 * @param {boolean} [props.showUserMenuBar=true] - Whether to show the user menu bar on the right
 */
const DashboardLayout = ({ children, sidebarOffset = true, showUserMenuBar = true }) => {
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
        {showUserMenuBar && <UserMenuBar />}
        <div className={`page-content${isSidebarOpen && sidebarOffset ? ' sidebar-offset' : ''}`}>
          {children}
        </div>
      </main>
    </div>
  );
};

export default DashboardLayout;