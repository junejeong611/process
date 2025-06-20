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
      <div className="conversation-detail-container">
        <div className="error-container">
          <div className="error-card">
            <div className="error-icon-lock">
              <svg width="48" height="48" fill="none" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="10" stroke="#e53e3e" strokeWidth="1.5" />
                  <path d="M12 7v6" stroke="#e53e3e" strokeWidth="1.5" strokeLinecap="round" />
                  <circle cx="12" cy="16" r="1" fill="#e53e3e" />
              </svg>
            </div>
            <h3 className="error-title-text">failed to load conversation</h3>
            <p className="error-message-text">{error}</p>
            <div className="error-actions">
              <button className="refresh-button-centered" onClick={() => fetchConversation()}>
                try again
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="conversation-detail-container">
      <div className="back-navigation">
        <Link to="/chat-history" className="back-link" aria-label="Back to chat history">
          <span className="back-icon">&#8592;</span> back
        </Link>
      </div>
      {conversation && (
        <MessageThread messages={conversation.messages} />
      )}
    </div>
  );
};

export default ConversationDetailPage; 