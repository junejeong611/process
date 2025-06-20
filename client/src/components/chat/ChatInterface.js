import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import './ChatInterface.css';

// Constants
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;
const BACKEND_HEALTH_RETRIES = 10;
const MAX_MESSAGE_LENGTH = 2000;
const TYPING_DELAY = 1200;
const SCROLL_DELAY = 100;
const UI_READY_DELAY = 800;

// API Configuration
const createAxiosConfig = (token) => ({
  headers: { 'Authorization': `Bearer ${token}` },
  timeout: 30000 // 30 second timeout
});

// Helper: Wait for backend to be ready
const waitForBackend = async (retries = BACKEND_HEALTH_RETRIES, delay = RETRY_DELAY) => {
  for (let i = 0; i < retries; i++) {
    try {
      await axios.get('/api/health', { timeout: 5000 });
      return true;
    } catch (err) {
      console.warn(`Backend health check attempt ${i + 1} failed:`, err.message);
      if (i < retries - 1) {
        await new Promise(res => setTimeout(res, delay));
      }
    }
  }
  console.error('Backend health check failed after all retries');
  return false;
};

// Helper: Retry wrapper for axios requests with exponential backoff
const axiosWithRetry = async (axiosCall, retries = MAX_RETRIES, baseDelay = RETRY_DELAY) => {
  for (let i = 0; i < retries; i++) {
    try {
      return await axiosCall();
    } catch (err) {
      const isLastAttempt = i === retries - 1;
      const isRetryableError = err.response?.status >= 500 || err.code === 'ECONNABORTED' || !err.response;
      
      if (isLastAttempt || !isRetryableError) {
        throw err;
      }
      
      const delay = baseDelay * Math.pow(2, i); // Exponential backoff
      console.warn(`Request attempt ${i + 1} failed, retrying in ${delay}ms:`, err.message);
      await new Promise(res => setTimeout(res, delay));
    }
  }
};

// Helper: Get user's name from token with better error handling
const getUserName = () => {
  try {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    if (!token) return 'there';
    
    const parts = token.split('.');
    if (parts.length !== 3) {
      console.warn('Invalid JWT token format');
      return 'there';
    }
    
    const payload = JSON.parse(atob(parts[1]));
    return payload.name?.trim() || 'there';
  } catch (error) {
    console.error('Error parsing user token:', error);
    return 'there';
  }
};

// Helper: Generate unique message ID
const generateMessageId = () => `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

// Helper: Sanitize message content
const sanitizeMessage = (content) => {
  if (typeof content !== 'string') return '';
  return content.trim().substring(0, MAX_MESSAGE_LENGTH);
};

const ChatInterface = () => {
  // State management
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState(null);
  const [backendReady, setBackendReady] = useState(false);
  const [backendError, setBackendError] = useState('');
  const [uiReady, setUiReady] = useState(false);
  
  // Refs
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);
  const abortControllerRef = useRef(null);
  
  // Memoized values
  const userName = useMemo(() => getUserName(), []);
  const charCount = useMemo(() => inputMessage.length, [inputMessage]);
  const isCharLimitWarning = useMemo(() => charCount > 1800, [charCount]);
  
  // Helper function to get token
  const getToken = useCallback(() => {
    return localStorage.getItem('token') || sessionStorage.getItem('token');
  }, []);
  
  // Auto-resize textarea with improved performance
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    
    // Use requestAnimationFrame for smoother resize
    requestAnimationFrame(() => {
      textarea.style.height = 'auto';
      const newHeight = Math.min(textarea.scrollHeight, 120);
      textarea.style.height = `${newHeight}px`;
    });
  }, [inputMessage]);
  
  // Auto-scroll to bottom with improved performance
  useEffect(() => {
    const timer = setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ 
        behavior: 'smooth',
        block: 'end'
      });
    }, SCROLL_DELAY);
    
    return () => clearTimeout(timer);
  }, [messages, isLoading]);
  
  // Add message helper with better error handling
  const addMessage = useCallback((content, sender, options = {}) => {
    if (!content?.trim()) {
      console.warn('Attempted to add empty message');
      return;
    }
    
    const message = {
      id: generateMessageId(),
      text: sanitizeMessage(content),
      sender,
      timestamp: new Date().toISOString(),
      ...options
    };
    
    setMessages(prev => [...prev, message]);
    return message;
  }, []);
  
  // Initialize conversation with better error handling
  useEffect(() => {
    let isMounted = true;
    
    const initializeConversation = async () => {
      try {
        setBackendReady(false);
        setBackendError('');
        setUiReady(false);
        
        const isBackendReady = await waitForBackend();
        
        if (!isMounted) return;
        
        setBackendReady(isBackendReady);
        
        if (!isBackendReady) {
          setBackendError('Unable to connect to the backend server. Please try again later.');
          return;
        }
        
        const token = getToken();
        if (!token) {
          setBackendError('No authentication token found. Please log in again.');
          return;
        }
        
        // Create new conversation
        const response = await axiosWithRetry(() => 
          axios.post('/api/chat/conversations', 
            { type: 'text' }, 
            createAxiosConfig(token)
          )
        );
        
        if (!isMounted) return;
        
        setConversationId(response.data._id);
        
        // Add initial AI message with delay for better UX
        setTimeout(() => {
          if (isMounted) {
            setUiReady(true);
          }
        }, UI_READY_DELAY);
        
      } catch (error) {
        console.error('Failed to initialize conversation:', error);
        if (isMounted) {
          const errorMsg = error.response?.data?.message || error.message || 'Unknown error occurred';
          setBackendError(`Error creating conversation: ${errorMsg}`);
        }
      }
    };
    
    initializeConversation();
    
    return () => {
      isMounted = false;
      // Cancel any ongoing requests
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [getToken, addMessage]);

  // Load messages when conversation is created
  useEffect(() => {
    if (!conversationId) return;
    
    let isMounted = true;
    
    const loadMessages = async () => {
      try {
        const token = getToken();
        if (!token) {
          setBackendError('No authentication token found');
          return;
        }
        
        const response = await axiosWithRetry(() => 
          axios.get(`/api/chat/messages/${conversationId}`, createAxiosConfig(token))
        );
        
        if (!isMounted) return;
        
        // Only set messages if we don't already have any (preserve initial message)
        if (messages.length <= 1) {
          const loadedMessages = response.data
            .filter(msg => msg.content?.trim()) // Filter out empty messages
            .map(msg => ({
              id: msg._id || generateMessageId(),
              text: sanitizeMessage(msg.content),
              sender: msg.sender === 'user' ? 'user' : 'bot',
              timestamp: msg.timestamp || msg.createdAt || new Date().toISOString()
            }));
          
          if (loadedMessages.length > 0) {
            setMessages(loadedMessages);
          }
        }
      } catch (error) {
        console.error('Failed to load messages:', error);
        if (isMounted) {
          const errorMsg = error.response?.data?.message || error.message || 'Unknown error occurred';
          setBackendError(`Error loading messages: ${errorMsg}`);
        }
      }
    };
    
    loadMessages();
    
    return () => {
      isMounted = false;
    };
  }, [conversationId, getToken, messages.length]);
  
  // Send message with improved error handling and request cancellation
  const handleSendMessage = useCallback(async (e) => {
    e.preventDefault();
    
    const messageContent = inputMessage.trim();
    if (!messageContent || !conversationId || isLoading) return;
    
    // Cancel any previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    // Create new abort controller
    abortControllerRef.current = new AbortController();
    
    // Add user message immediately
    addMessage(messageContent, 'user');
    setInputMessage('');
    setIsLoading(true);
    setBackendError('');
    
    try {
      const token = getToken();
      if (!token) {
        throw new Error('No authentication token found');
      }
      
      const response = await axiosWithRetry(() => 
        axios.post('/api/chat/send', {
          content: messageContent,
          conversationId: conversationId
        }, {
          ...createAxiosConfig(token),
          signal: abortControllerRef.current.signal
        })
      );
      
      // Add AI response with natural delay
      setTimeout(() => {
        const botResponse = response.data.message?.content;
        if (botResponse?.trim()) {
          addMessage(botResponse, 'bot');
        } else {
          console.warn('Received empty response from AI');
          addMessage(
            'I apologize, but I seem to have had trouble processing that. Could you try rephrasing your message?',
            'bot'
          );
        }
        setIsLoading(false);
      }, TYPING_DELAY);
      
    } catch (error) {
      console.error('Failed to send message:', error);
      
      if (error.name === 'AbortError') {
        console.log('Request was cancelled');
        setIsLoading(false);
        return;
      }
      
      const errorMsg = error.response?.data?.message || error.message || 'Unknown error occurred';
      setBackendError(`Error sending message: ${errorMsg}`);
      
      // Add error message to chat
      setTimeout(() => {
        addMessage(
          'I apologize, but I encountered an issue processing your message. Please try again in a moment.',
          'system',
          { error: true }
        );
        setIsLoading(false);
      }, 800);
    }
  }, [inputMessage, conversationId, isLoading, getToken, addMessage]);

  // Handle keyboard shortcuts
  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(e);
    }
  }, [handleSendMessage]);

  // Format timestamp with better localization
  const formatTime = useCallback((timestamp) => {
    try {
      return new Intl.DateTimeFormat('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      }).format(new Date(timestamp));
    } catch (error) {
      console.warn('Failed to format timestamp:', error);
      return ''; // Return empty string instead of showing invalid time
    }
  }, []);

  // Calculate animation delay for messages
  const getMessageDelay = useCallback((index) => `${index * 0.1}s`, []);

  // Determine if send button should be disabled
  const isSendDisabled = useMemo(() => 
    !inputMessage.trim() || 
    isLoading || 
    !backendReady || 
    !uiReady || 
    !conversationId
  , [inputMessage, isLoading, backendReady, uiReady, conversationId]);

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
              disabled={!backendReady || !uiReady}
              maxLength={MAX_MESSAGE_LENGTH}
              aria-label="Message input"
            />
            <div className="input-actions">
              <div className="char-counter">
                <span className={isCharLimitWarning ? 'warning' : ''}>
                  {charCount}/{MAX_MESSAGE_LENGTH}
                </span>
              </div>
              <button
                type="submit"
                disabled={isSendDisabled}
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