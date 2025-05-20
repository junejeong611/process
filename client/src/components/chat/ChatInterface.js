import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import './ChatInterface.css';

// Helper: Wait for backend to be ready
const waitForBackend = async (retries = 10, delay = 1000) => {
  for (let i = 0; i < retries; i++) {
    try {
      await axios.get('/api/health'); // You may need to implement this endpoint in your backend
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

const ChatInterface = () => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState(null);
  const messagesEndRef = useRef(null);
  const [backendReady, setBackendReady] = useState(true);
  const [backendError, setBackendError] = useState('');
  
  // Helper function to get token from either storage
  const getToken = () => {
    return localStorage.getItem('token') || sessionStorage.getItem('token');
  };
  
  // Create a new conversation when component mounts
  useEffect(() => {
    const init = async () => {
      setBackendReady(false);
      setBackendError('');
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
        const response = await axiosWithRetry(() => axios.post('/api/chat/conversations', {}, {
          headers: { 'Authorization': `Bearer ${token}` }
        }));
        setConversationId(response.data._id);
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
        setMessages(response.data);
      } catch (error) {
        setBackendError('Error loading messages: ' + (error.response?.data?.message || error.message));
      }
    };
    loadMessages();
  }, [conversationId]);
  
  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !conversationId) return;
    const userMessage = {
      id: Date.now(),
      text: newMessage,
      sender: 'user',
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMessage]);
    setNewMessage('');
    setIsLoading(true);
    setBackendError('');
    try {
      const token = getToken();
      if (!token) throw new Error('No authentication token found');
      const response = await axiosWithRetry(() => axios.post('/api/chat/send', {
        content: newMessage,
        conversationId: conversationId
      }, {
        headers: { 'Authorization': `Bearer ${token}` }
      }));
      const claudeResponse = {
        id: Date.now() + 1,
        text: response.data.message.content,
        sender: 'claude',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, claudeResponse]);
    } catch (error) {
      setBackendError('Error sending message: ' + (error.response?.data?.message || error.message));
      const errorMessage = {
        id: Date.now() + 1,
        text: 'Sorry, I encountered an error processing your message. Please try again.',
        sender: 'system',
        error: true,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="chat-container">
      {!backendReady && (
        <div className="backend-status error">{backendError || 'Connecting to backend...'}</div>
      )}
      {backendError && backendReady && (
        <div className="backend-status error">{backendError}</div>
      )}
      <div className="messages-container">
        {messages.length === 0 ? (
          <div className="empty-chat">
            <p>Start a conversation with Claude. How are you feeling today?</p>
          </div>
        ) : (
          messages.map(message => (
            <div 
              key={message.id} 
              className={`message ${message.sender} ${message.error ? 'error' : ''}`}
            >
              <div className="message-content">{message.text}</div>
              <div className="message-timestamp">
                {new Date(message.timestamp).toLocaleTimeString()}
              </div>
            </div>
          ))
        )}
        {isLoading && (
          <div className="message claude loading">
            <div className="typing-indicator">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      
      <form onSubmit={handleSendMessage} className="message-input-form">
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type your message..."
          disabled={isLoading || !backendReady}
          className="message-input"
        />
        <button 
          type="submit" 
          disabled={isLoading || !backendReady || !newMessage.trim()}
          className="send-button"
        >
          {isLoading ? 'Sending...' : 'Send'}
        </button>
      </form>
    </div>
  );
};

export default ChatInterface; 