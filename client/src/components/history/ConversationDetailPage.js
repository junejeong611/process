import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import MessageThread from './MessageThread';
import './ConversationDetailPage.css';

const ConversationDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [conversation, setConversation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchConversation = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/chat/messages/${id}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token') || sessionStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      
      // data is an array of messages
      if (Array.isArray(data)) {
        setConversation({ messages: data });
      } else {
        setError('Failed to load conversation');
      }
    } catch (err) {
      setError('Failed to load conversation');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchConversation();
  }, [fetchConversation]);

  if (loading) {
    return (
      <div className="conversation-detail-container">
        <div className="loading-spinner">Loading conversation...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="conversation-detail-container">
        <div className="error-message">{error}</div>
      </div>
    );
  }

  return (
    <div className="conversation-detail-container">
      <div className="conversation-header">
        <button 
          className="back-button"
          onClick={() => navigate('/chat-history')}
        >
          ← Back to History
        </button>
        <h1>{conversation?.title || 'Untitled Conversation'}</h1>
      </div>
      
      {conversation && (
        <MessageThread messages={conversation.messages} />
      )}
    </div>
  );
};

export default ConversationDetailPage; 