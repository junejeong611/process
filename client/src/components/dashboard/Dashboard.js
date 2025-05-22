import React from 'react';
import ChatInterface from '../chat/ChatInterface';
import './Dashboard.css';

const Dashboard = () => {
  return (
    <div className="dashboard-container">
      <div className="chat-container">
        <ChatInterface />
      </div>
    </div>
  );
};

export default Dashboard;