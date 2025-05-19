import React from 'react';
import ChatInterface from '../chat/ChatInterface';
import Navbar from '../navigation/Navbar';
import './Dashboard.css';

const Dashboard = () => {
  return (
    <div className="dashboard-container">
      <Navbar />
      <div className="chat-container">
        <ChatInterface />
      </div>
    </div>
  );
};

export default Dashboard;