import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import './ChatInterface.css';

// Helper: Wait for backend to be ready
const waitForBackend = async (retries = 10, delay = 1000) => {
  for (let i = 0; i < retries; i++) {
    try {
      await axios.get('/api/health');
      return true;
    } catch (err) {
      await new Promise(res => setTimeout(res, delay));
    }
  }
  return false;
};

// Helper: Retry wrapper for axios requests
const axiosWithRetry = async (axiosCall, retries = 3, delay = 1000) => {
  for (let i = 0; i < retries; i++) {
    try {
      return await axiosCall();
    } catch (err) {
      if (i === retries - 1) throw err;
      await new Promise(res => setTimeout(res, delay));
    }
  }
};

// Helper: Get user's name from token or fallback
const getUserName = () => {
  try {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    if (token) {
      // Decode JWT and extract name
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.name || 'there';
    }
  } catch (error) {
    console.error('Error getting user name:', error);
  }
  return 'there';
};

const ChatInterface = () => {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState(null);
  const [backendReady, setBackendReady] = useState(true);
  const [backendError, setBackendError] = useState('');
  const [charCount, setCharCount] = useState(0);
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);
  const userName = getUserName();
  const [uiReady, setUiReady] = useState(false);
  
  // Helper function to get token from either storage
  const getToken = () => {
    return localStorage.getItem('token') || sessionStorage.getItem('token');
  };
  
  // Auto-resize textarea with smoother animation
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const newHeight = Math.min(textareaRef.current.scrollHeight, 120);
      textareaRef.current.style.height = newHeight + 'px';
    }
    setCharCount(inputMessage.length);
  }, [inputMessage]);
  
  // Auto-scroll to bottom with smooth behavior
  useEffect(() => {
    const timer = setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ 
        behavior: 'smooth',
        block: 'end'
      });
    }, 100);
    return () => clearTimeout(timer);
  }, [messages, isLoading]);
  
  // Create a new conversation when component mounts
  useEffect(() => {
    const init = async () => {
      setBackendReady(false);
      setBackendError('');
      setUiReady(false);
      const ready = await waitForBackend();
      setBackendReady(ready);
      
      if (!ready) {
        setBackendError('Unable to connect to the backend server. Please try again later.');
        return;
      }
      
      try {
        const token = getToken();
        if (!token) {
          setBackendError('No authentication token found');
          return;
        }
        
        // Create new conversation and get initial AI message
        const response = await axiosWithRetry(() => axios.post('/api/chat/conversations', { type: 'text' }, {
          headers: { 'Authorization': `Bearer ${token}` }
        }));
        
        setConversationId(response.data._id);
        
        // Add the initial AI message to the chat
        setTimeout(() => {
          setMessages([{
            id: Date.now(),
            text: "Hello! I'm here to listen and support you. How are you feeling today?",
            sender: 'bot',
            timestamp: new Date().toISOString()
          }]);
          setUiReady(true);
        }, 800);
      } catch (error) {
        setBackendError('Error creating conversation: ' + (error.response?.data?.message || error.message));
      }
    };
    
    init();
  }, []);

  // Load messages when conversationId changes
  useEffect(() => {
    const loadMessages = async () => {
      if (!conversationId) return;
      
      try {
        const token = getToken();
        if (!token) {
          setBackendError('No authentication token found');
          return;
        }
        
        const response = await axiosWithRetry(() => axios.get(`/api/chat/messages/${conversationId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }));
        
        // Only set messages if we don't already have any (to preserve initial message)
        if (messages.length <= 1) {
          const loadedMessages = response.data.map(msg => ({
            id: msg._id || Date.now() + Math.random(),
            text: msg.content,
            sender: msg.sender === 'user' ? 'user' : 'bot',
            timestamp: msg.timestamp || msg.createdAt
          }));
          setMessages(loadedMessages);
        }
      } catch (error) {
        setBackendError('Error loading messages: ' + (error.response?.data?.message || error.message));
      }
    };
    
    loadMessages();
  }, [conversationId]);
  
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputMessage.trim() || !conversationId) return;
    
    const userMessage = {
      id: Date.now(),
      text: inputMessage.trim(),
      sender: 'user',
      timestamp: new Date().toISOString()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);
    setBackendError('');
    
    try {
      const token = getToken();
      if (!token) throw new Error('No authentication token found');
      
      const response = await axiosWithRetry(() => axios.post('/api/chat/send', {
        content: userMessage.text,
        conversationId: conversationId
      }, {
        headers: { 'Authorization': `Bearer ${token}` }
      }));
      
      // Add slight delay for more natural feel
      setTimeout(() => {
        const botMessage = {
          id: Date.now() + 1,
          text: response.data.message.content,
          sender: 'bot',
          timestamp: new Date().toISOString()
        };
        
        setMessages(prev => [...prev, botMessage]);
        setIsLoading(false);
      }, 1200);
      
    } catch (error) {
      setBackendError('Error sending message: ' + (error.response?.data?.message || error.message));
      
      const errorMessage = {
        id: Date.now() + 1,
        text: 'I apologize, but I encountered an issue processing your message. Please try again in a moment.',
        sender: 'system',
        error: true,
        timestamp: new Date().toISOString()
      };
      
      setTimeout(() => {
        setMessages(prev => [...prev, errorMessage]);
        setIsLoading(false);
      }, 800);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(e);
    }
  };

  const formatTime = (timestamp) => {
    return new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    }).format(new Date(timestamp));
  };

  const getMessageDelay = (index) => {
    return `${index * 0.1}s`;
  };

  return (
    <div className="improved-chat-interface">
      {/* Enhanced Connection Status */}
      {(!backendReady || backendError) && (
        <div className={`connection-banner ${backendError ? 'error' : 'loading'}`}>
          <div className="connection-content">
            <div className="connection-icon">
              {backendError ? (
                <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                </svg>
              ) : (
                <div className="loading-spinner" />
              )}
            </div>
            <span>{backendError || 'connecting to support...'}</span>
          </div>
        </div>
      )}

      {/* Enhanced Chat Header */}
      <div className="chat-header-enhanced">
        <div className="header-main">
          <div className="header-content">
            <h1 className="chat-title-enhanced">hi {userName}</h1>
            <p className="chat-subtitle-enhanced">i'm here to help you process your emotions</p>
          </div>
          <div className="header-status">
            <div className={`status-dot ${backendReady && !backendError ? 'connected' : 'connecting'}`} />
            <span className="status-label">
              {backendReady && !backendError ? 'connected' : 'connecting...'}
            </span>
          </div>
        </div>
        <div className="header-divider" />
      </div>

      {/* Enhanced Messages Container */}
      <div className="chat-messages-enhanced">
        {!uiReady ? (
          <div className="welcome-state">
            <div className="welcome-icon">
              <div className="loading-spinner" />
            </div>
            <h3>starting your conversation...</h3>
            <p>please wait a moment while we set things up for you</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="welcome-state">
            <div className="welcome-icon">
              <svg width="56" height="56" fill="none" viewBox="0 0 24 24">
                <path 
                  d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" 
                  stroke="currentColor" 
                  strokeWidth="1.5" 
                  strokeLinecap="round" 
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <h3>welcome to your safe space</h3>
            <p>this is a judgment-free zone where you can share whatever is on your mind</p>
          </div>
        ) : (
          <div className="messages-list">
            {messages.map((message, index) => (
              <div 
                key={message.id} 
                className={`message-enhanced ${message.sender} ${message.error ? 'error' : ''}`}
                style={{ animationDelay: getMessageDelay(index) }}
              >
                <div className="message-wrapper">
                  {message.sender === 'bot' && (
                    <div className="message-avatar">
                      <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                      </svg>
                    </div>
                  )}
                  <div className="message-bubble-enhanced">
                    <div className="message-content-enhanced">{message.text}</div>
                    <div className="message-meta">
                      <span className="message-time-enhanced">{formatTime(message.timestamp)}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            
            {isLoading && (
              <div className="message-enhanced bot typing-message">
                <div className="message-wrapper">
                  <div className="message-avatar">
                    <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                    </svg>
                  </div>
                  <div className="message-bubble-enhanced typing-bubble">
                    <div className="typing-indicator-enhanced">
                      <span></span>
                      <span></span>
                      <span></span>
                    </div>
                    <div className="typing-text">listening...</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Enhanced Input Area */}
      <div className="chat-input-enhanced">
        <form onSubmit={handleSendMessage} className="input-form-enhanced">
          <div className="input-wrapper-enhanced">
            <textarea
              ref={textareaRef}
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="share what's on your mind..."
              className="message-input-enhanced"
              rows="1"
              disabled={isLoading || !backendReady || !uiReady}
              maxLength={2000}
            />
            <div className="input-actions">
              <div className="char-counter">
                <span className={charCount > 1800 ? 'warning' : ''}>{charCount}/2000</span>
              </div>
              <button
                type="submit"
                disabled={!inputMessage.trim() || isLoading || !backendReady || !uiReady}
                className={`send-button-enhanced${isLoading ? ' loading' : ''}`}
                aria-label="Send message"
              >
                {isLoading ? (
                  <span className="spinner" aria-hidden="true"></span>
                ) : (
                  <svg width="18" height="18" fill="none" viewBox="0 0 24 24">
                    <path 
                      d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" 
                      stroke="currentColor" 
                      strokeWidth="2" 
                      strokeLinecap="round" 
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
                <span className="send-label">
                  {isLoading ? 'sending...' : 'send'}
                </span>
              </button>
            </div>
          </div>
        </form>
        
        <div className="input-footer">
          <div className="input-hint-enhanced">
            <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24">
              <path d="M13 17h8l-8-8V1H9v8l-8 8h8v6h4v-6z"/>
            </svg>
            <span>press enter to send • shift + enter for new line</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;