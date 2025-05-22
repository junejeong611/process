import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import ConversationCard from './ConversationCard';
import './ChatHistoryPage.css';

const ChatHistoryPage = () => {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sortOrder, setSortOrder] = useState('newest');
  const navigate = useNavigate();

  useEffect(() => {
    fetchConversations();
  }, []);

  const fetchConversations = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/chat/conversations', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token') || sessionStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      console.log('API Response:', data);
      
      if (data.success) {
        setConversations(data.conversations);
      } else {
        console.error('API Error:', data.message || 'Failed to load conversations');
        setError(data.message || 'Failed to load conversations');
      }
    } catch (err) {
      console.error('Fetch Error:', err);
      setError('Failed to load conversations');
    } finally {
      setLoading(false);
    }
  };

  const handleSortChange = (e) => {
    setSortOrder(e.target.value);
  };

  const sortedConversations = [...conversations].sort((a, b) => {
    const dateA = new Date(a.lastMessageTime);
    const dateB = new Date(b.lastMessageTime);
    return sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
  });

  if (loading) {
    return (
      <div className="chat-history-container">
        <div className="loading-spinner">Loading conversations...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="chat-history-container">
        <div className="error-message">{error}</div>
      </div>
    );
  }

  return (
    <div className="chat-history-container">
      <div className="chat-history-header">
        <h1>Chat History</h1>
        <div className="sort-controls">
          <label htmlFor="sort-order">Sort by:</label>
          <select 
            id="sort-order" 
            value={sortOrder} 
            onChange={handleSortChange}
            className="sort-select"
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
          </select>
        </div>
      </div>
      
      <div className="conversations-list">
        {sortedConversations.length === 0 ? (
          <div className="no-conversations">
            No conversations found
          </div>
        ) : (
          sortedConversations.map(conversation => (
            <ConversationCard
              key={conversation.id}
              conversation={conversation}
              onClick={() => navigate(`/chat-history/${conversation.id}`)}
            />
          ))
        )}
      </div>
    </div>
  );
};

export default ChatHistoryPage; 