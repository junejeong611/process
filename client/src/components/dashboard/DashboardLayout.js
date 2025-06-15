import React from 'react';
import Navbar from '../navigation/Navbar';
import './Dashboard.css';

const DashboardLayout = ({ children }) => {
  return (
    <div className="dashboard-layout">
      <Navbar />
      <div className="main-content">
        {children}
      </div>
    </div>
  );
};

export default DashboardLayout;