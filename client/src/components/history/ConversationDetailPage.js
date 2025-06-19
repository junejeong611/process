import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import MessageThread from './MessageThread';
import './ConversationDetailPage.css';

const ConversationDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [conversation, setConversation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Loading stages with better messaging
  const loadingMessages = {
    initial: "loading your conversation...",
    processing: "organizing your messages...",
    finalizing: "almost ready..."
  };
  const [loadingStage, setLoadingStage] = useState('initial');

  // Enhanced loading sequence
  const simulateLoadingStages = () => {
    setLoadingStage('initial');
    setTimeout(() => setLoadingStage('processing'), 800);
    setTimeout(() => setLoadingStage('finalizing'), 1600);
  };

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
    simulateLoadingStages();
  }, [fetchConversation]);

  if (loading) {
    return (
      <div className="conversation-detail-container">
        <div className="loading-state">
          <div className="loading-spinner" role="status" aria-label="Loading">
            <div className="spinner-circle"></div>
          </div>
          <p className="loading-text" aria-live="polite">
            {loadingMessages[loadingStage]}
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="conversation-detail-container error-bg">
        <div className="error-message">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="conversation-detail-container">
      <div className="support-back-btn-row">
        <Link to="/chat-history" className="support-back-btn" aria-label="Back to chat history">
          <span className="support-back-icon">&#8592;</span> back
        </Link>
      </div>
      {conversation && (
        <MessageThread messages={conversation.messages} />
      )}
    </div>
  );
};

export default ConversationDetailPage; 