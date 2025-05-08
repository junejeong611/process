import React from 'react';
import ChatInterface from '../chat/ChatInterface';
import './Dashboard.css';

const Dashboard = () => {
  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <h1>Emotional Support Chat</h1>
      </header>
      
      <div className="chat-container">
        <ChatInterface />
      </div>
    </div>
  );
};

export default Dashboard;