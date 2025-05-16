import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import './ChatInterface.css';

const ChatInterface = () => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState(null);
  const messagesEndRef = useRef(null);
  
  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  const handleSendMessage = async (e) => {
    e.preventDefault();
    
    if (!newMessage.trim()) return;
    
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
      let currentConversationId = conversationId;
      if (!currentConversationId) {
        // Create a new conversation first
        const convRes = await axios.post('/api/chat/conversations', {});
        currentConversationId = convRes.data.conversationId;
        setConversationId(currentConversationId);
      }
      // Send the message with conversationId
      const response = await axios.post('/api/chat/send', {
        content: newMessage,
        conversationId: currentConversationId
      });
      
      // Add Claude's response to chat
      const claudeResponse = {
        id: Date.now() + 1,
        text: response.data.message.content || response.data.message,
        sender: 'claude',
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, claudeResponse]);
    } catch (error) {
      console.error('Error sending message to Claude:', error);
      
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
          disabled={isLoading}
        />
        <button 
          type="submit" 
          disabled={isLoading || !newMessage.trim()}
        >
          Send
        </button>
      </form>
    </div>
  );
};

export default ChatInterface; 