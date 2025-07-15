import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import MessageThread from './MessageThread';
import './ConversationDetailPage.css';
import ErrorCard from '../ErrorCard';
import { categorizeError } from '../../utils/errorUtils';
import AuthErrorCard from '../AuthErrorCard';

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

  useEffect(() => {
    document.body.classList.add('conversation-detail-page');
    document.documentElement.classList.add('conversation-detail-page');
    return () => {
      document.body.classList.remove('conversation-detail-page');
      document.documentElement.classList.remove('conversation-detail-page');
    };
  }, []);

  if (loading) {
    return (
      <div className="conversation-detail-container">
        <div className="app-loading">
          <span className="app-spinner app-spinner--large" aria-label="Loading" />
          <span>{loadingMessages[loadingStage]}</span>
        </div>
      </div>
    );
  }

  if (error) {
    const errorMessage = error.message || error;
    const errorCategory = categorizeError(errorMessage);
    const isUnauthorized = errorCategory.type === 'auth';
    if (isUnauthorized) {
      return (
        <div className="error-container">
          <AuthErrorCard />
        </div>
      );
    }
    return (
      <div className="error-container">
        <ErrorCard
          error={errorMessage}
          errorCategory={errorCategory}
          onRetry={fetchConversation}
          retryLabel="refresh page"
        />
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