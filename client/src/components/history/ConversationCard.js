import React from 'react';
import './ConversationCard.css';

const ConversationCard = ({ conversation, onClick }) => {
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  const truncateMessage = (message) => {
    if (!message) return 'No messages yet';
    return message.length > 50 ? message.substring(0, 50) + '...' : message;
  };

  return (
    <div className="conversation-card" onClick={onClick}>
      <div className="conversation-header">
        <h3 className="conversation-title">
          {conversation.title || 'Untitled Conversation'}
        </h3>
        <span className="conversation-date">
          {formatDate(conversation.lastMessageTime || conversation.updatedAt)}
        </span>
      </div>
      <p className="conversation-preview">
        {truncateMessage(conversation.lastMessage)}
      </p>
    </div>
  );
};

export default ConversationCard; 