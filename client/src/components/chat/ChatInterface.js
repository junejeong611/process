import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import './ChatInterface.css';
import UnifiedStreamingService from '../../services/streamingService';
import useCreateConversation from '../../utils/useCreateConversation';

// Constants
const MAX_MESSAGE_LENGTH = 2000;
const SCROLL_DELAY = 100;
const UI_READY_DELAY = 800;

// Helper Functions
const generateMessageId = () => `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

const sanitizeMessage = (content) => {
  if (typeof content !== 'string') return '';
  return content.trim().substring(0, MAX_MESSAGE_LENGTH);
};

const ChatInterface = () => {
  // State Management
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [backendError, setBackendError] = useState('');
  const [uiReady, setUiReady] = useState(false);
  const [fallbackMessage, setFallbackMessage] = useState('');
  const { conversationId, createConversation, loading: creatingConversation } = useCreateConversation('text');

  // Refs
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);
  const streamingServiceRef = useRef(null);
  
  // Memoized Values
  const charCount = useMemo(() => input.length, [input]);
  const isCharLimitWarning = useMemo(() => charCount > 1800, [charCount]);

  // Helper to get auth token
  const getToken = useCallback(() => localStorage.getItem('token') || sessionStorage.getItem('token'), []);

  // Effects
  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
    }
  }, [input]);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    const timer = setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, SCROLL_DELAY);
    return () => clearTimeout(timer);
  }, [messages, isLoading]);

  // Initialize conversation
  useEffect(() => {
    let isMounted = true;
    const initializeChat = async () => {
      try {
        let convoId = conversationId;
        if (!convoId) {
            const newConvo = await createConversation();
            if (!newConvo || !newConvo._id) throw new Error("Failed to create conversation.");
            convoId = newConvo._id;
        }

        const token = getToken();
        if (!token) throw new Error('Authentication token not found.');
        
        // Load initial messages for the new conversation
        const messagesRes = await axios.get(`/api/chat/messages/${convoId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if(isMounted && messagesRes.data) {
           const loadedMessages = messagesRes.data.map(msg => ({
              id: msg._id || generateMessageId(),
              text: sanitizeMessage(msg.content),
              sender: msg.sender,
              timestamp: msg.createdAt || new Date().toISOString()
            }));
           setMessages(loadedMessages);
        }
        setTimeout(() => setUiReady(true), UI_READY_DELAY);

      } catch (err) {
        if (isMounted) {
          setBackendError('Failed to start a conversation. Please refresh the page.');
          console.error('Initialization error:', err);
        }
      }
    };
    initializeChat();
    return () => { isMounted = false; };
  }, [conversationId, createConversation, getToken]);
  
  useEffect(() => {
    return () => {
      if (streamingServiceRef.current) {
        streamingServiceRef.current.close();
      }
    };
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Core Logic: Sending a message
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = { sender: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    setIsTyping(true);
    setFallbackMessage('');

    // Initialize the streaming service
    streamingServiceRef.current = new UnifiedStreamingService({
      onTextChunk: (textChunk) => {
        setIsTyping(false); // Stop typing indicator as soon as first chunk arrives
        setFallbackMessage(''); // Clear fallback message on first chunk
        setMessages(prev => {
          const lastMessage = prev[prev.length - 1];
          if (lastMessage && lastMessage.sender === 'ai') {
            const updatedMessage = { ...lastMessage, content: lastMessage.content + textChunk };
            return [...prev.slice(0, -1), updatedMessage];
          } else {
            return [...prev, { sender: 'ai', content: textChunk }];
          }
        });
      },
      onStreamEnd: () => {
        setIsLoading(false);
        setIsTyping(false);
        setFallbackMessage('');
      },
      onFallback: (message) => {
        setFallbackMessage(message);
        setIsTyping(false); // Stop typing indicator during fallback
      },
      onError: (error) => {
        console.error('Streaming error:', error);
        setMessages(prev => [...prev, { sender: 'ai', content: `sorry, something went wrong. please try again.` }]);
        setIsLoading(false);
        setIsTyping(false);
        setFallbackMessage('');
      }
    });

    streamingServiceRef.current.start('text', {
      conversationId,
      content: input,
    });
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Render Method
  return (
    <div className="chat-container">
      {creatingConversation && !backendError ? (
        <div className="chat-loading-overlay">
          <div className="chat-spinner"></div>
          <div className="chat-loading-text">Starting conversation...</div>
        </div>
      ) : backendError ? (
         <div className="chat-loading-overlay">
            <div className="chat-error-icon">⚠️</div>
            <div className="chat-error-message">{backendError}</div>
        </div>
      ) : (
        <>
          <header className="chat-header">
            <h1 className="chat-title">process</h1>
            <p className="chat-subtitle">a safe place to feel and be heard</p>
          </header>
          <main className="chat-messages" aria-live="polite">
            {messages.map(msg => (
              <div key={msg.id} className={`chat-message-wrapper ${msg.sender}`}>
                <div className={`chat-message ${msg.isError ? 'error' : ''}`}>
                  <p className="chat-message-text">
                    {msg.text}
                    {msg.isTyping && <span className="typing-indicator"></span>}
                  </p>
                  <span className="chat-message-timestamp">{new Date(msg.timestamp).toLocaleTimeString()}</span>
                </div>
              </div>
            ))}
            {isTyping && <div className="typing-indicator"><span>.</span><span>.</span><span>.</span></div>}
            {fallbackMessage && <div className="fallback-indicator">{fallbackMessage}</div>}
            <div ref={messagesEndRef} />
          </main>
          <footer className="chat-input-area">
            <form onSubmit={handleSendMessage} className="chat-input-form">
              <div className="chat-input-wrapper">
                <textarea
                  ref={textareaRef}
                  className="chat-input"
                  placeholder="share what's on your mind..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  rows="1"
                  disabled={isLoading || !uiReady}
                  aria-label="Chat message input"
                />
                <button 
                  type="submit" 
                  className="send-button" 
                  disabled={!input.trim() || isLoading || !uiReady}
                  aria-label="Send message"
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M3 12L21 3L12 21L10 14L3 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
              </div>
              <div className={`char-counter ${isCharLimitWarning ? 'warning' : ''}`} aria-live="polite">
                {charCount} / {MAX_MESSAGE_LENGTH}
              </div>
            </form>
          </footer>
        </>
      )}
    </div>
  );
};

export default ChatInterface;