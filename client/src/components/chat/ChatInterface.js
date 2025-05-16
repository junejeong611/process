import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import './ChatInterface.css';

const ChatInterface = () => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState(null);
  const messagesEndRef = useRef(null);
  
  // Create a new conversation when component mounts
  useEffect(() => {
    const createNewConversation = async () => {
      try {
        console.log('Creating new conversation...');
        const token = localStorage.getItem('token');
        if (!token) {
          console.error('No authentication token found');
          return;
        }

        const response = await axios.post('/api/chat/conversations', {}, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        console.log('Conversation created:', response.data);
        setConversationId(response.data._id);
      } catch (error) {
        console.error('Error creating conversation:', error.response?.data || error.message);
      }
    };

    createNewConversation();
  }, []);

  // Load messages when conversationId changes
  useEffect(() => {
    const loadMessages = async () => {
      if (!conversationId) {
        console.log('No conversation ID available');
        return;
      }

      try {
        console.log('Loading messages for conversation:', conversationId);
        const token = localStorage.getItem('token');
        if (!token) {
          console.error('No authentication token found');
          return;
        }

        const response = await axios.get(`/api/chat/messages/${conversationId}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        console.log('Messages loaded:', response.data);
        setMessages(response.data);
      } catch (error) {
        console.error('Error loading messages:', error.response?.data || error.message);
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
    
    if (!newMessage.trim() || !conversationId) {
      console.log('Cannot send message:', { 
        hasMessage: !!newMessage.trim(), 
        hasConversationId: !!conversationId 
      });
      return;
    }
    
    // Add user message to chat
    const userMessage = {
      id: Date.now(),
      text: newMessage,
      sender: 'user',
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setNewMessage('');
    setIsLoading(true);
    
    try {
      console.log('Sending message:', { 
        content: newMessage, 
        conversationId: conversationId 
      });
      
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await axios.post('/api/chat/send', {
        content: newMessage,
        conversationId: conversationId
      }, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      console.log('Message sent successfully:', response.data);
      
      // Add Claude's response to chat
      const claudeResponse = {
        id: Date.now() + 1,
        text: response.data.message.content,
        sender: 'claude',
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, claudeResponse]);
    } catch (error) {
      console.error('Error sending message:', error.response?.data || error.message);
      
      // Add error message
      const errorMessage = {
        id: Date.now() + 1,
        text: 'Sorry, I encountered an error processing your message. Please try again.',
        sender: 'claude',
        error: true,
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="chat-interface">
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
              <div className="message-time">
                {new Date(message.timestamp).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit'
                })}
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
      
      <form className="message-form" onSubmit={handleSendMessage}>
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type your message..."
          disabled={isLoading || !conversationId}
        />
        <button 
          type="submit" 
          disabled={isLoading || !newMessage.trim() || !conversationId}
        >
          Send
        </button>
      </form>
    </div>
  );
};

export default ChatInterface; 