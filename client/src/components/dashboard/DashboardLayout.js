import React from 'react';
import Navbar from '../navigation/Navbar';
import '../dashboard/Dashboard.css';

const DashboardLayout = ({ children }) => {
  return (
    <div className="dashboard-container">
      <Navbar />
      <div className="main-content">
        {children}
      </div>
    </div>
  );
};

export default DashboardLayout; 