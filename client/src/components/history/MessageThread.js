import React from 'react';
import './MessageThread.css';

const MessageThread = ({ messages }) => {
  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  return (
    <div className="message-thread">
      {messages.map((message, index) => (
        <div 
          key={message.id || index}
          className={`message ${message.sender === 'user' ? 'user-message' : 'bot-message'}`}
        >
          <div className="message-content">
            <div className="message-sender">
              {message.sender === 'user' ? 'You' : 'AI Assistant'}
            </div>
            <div className="message-text">
              {message.content}
            </div>
            <div className="message-timestamp">
              {formatTimestamp(message.timestamp)}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default MessageThread; 