import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './ChatHistory.css';

const ChatHistory = () => {
  const [conversations, setConversations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const getToken = () => {
    return localStorage.getItem('token') || sessionStorage.getItem('token');
  };

  useEffect(() => {
    const fetchConversations = async () => {
      try {
        const token = getToken();
        if (!token) {
          setError('No authentication token found');
          return;
        }

        const response = await axios.get('/api/chat/conversations', {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        setConversations(response.data);
      } catch (error) {
        setError('Error loading conversations: ' + (error.response?.data?.message || error.message));
      } finally {
        setIsLoading(false);
      }
    };

    fetchConversations();
  }, []);

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  if (isLoading) {
    return <div className="loading">Loading conversations...</div>;
  }

  if (error) {
    return <div className="error-message">{error}</div>;
  }

  return (
    <div className="chat-history">
      <h2>Conversation History</h2>
      {conversations.length === 0 ? (
        <div className="empty-state">
          <p>No conversations found. Start a new chat!</p>
        </div>
      ) : (
        <div className="conversations-list">
          {conversations.map((conversation) => (
            <div key={conversation._id} className="conversation-card">
              <div className="conversation-header">
                <span className="conversation-date">
                  {formatDate(conversation.createdAt)}
                </span>
                <span className="message-count">
                  {conversation.messageCount || 0} messages
                </span>
              </div>
              <div className="conversation-preview">
                {conversation.lastMessage || 'No messages yet'}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ChatHistory; 