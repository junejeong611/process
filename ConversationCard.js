import React from 'react';
import './ConversationCard.css';

const ConversationCard = ({ 
  conversation, 
  onClick,
  isSelected = false, 
  isSelectMode = false, 
  onSelect 
}) => {
  // Enhanced date formatting
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return 'today';
    if (diffDays === 2) return 'yesterday';
    if (diffDays <= 7) return `${diffDays - 1} days ago`;
    if (diffDays <= 30) return `${Math.ceil(diffDays / 7)} weeks ago`;
    
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
  };

  // Enhanced message truncation
  const truncateMessage = (message) => {
    if (!message) return 'no messages yet';
    return message.length > 120 ? message.substring(0, 120) + '...' : message;
  };

  // Handle card clicks
  const handleCardClick = (e) => {
    if (isSelectMode) {
      e.preventDefault();
      onSelect && onSelect();
    } else {
      onClick && onClick();
    }
  };

  // Get conversation type
  const getConversationType = () => {
    return conversation.type || 'text';
  };

  // Get conversation stats
  const getConversationStats = () => {
    const messageCount = conversation.messageCount || conversation.messages?.length || 0;
    const duration = conversation.duration;
    
    return { messageCount, duration };
  };

  const { messageCount, duration } = getConversationStats();

  return (
    <div 
      className={`conversation-card ${isSelected ? 'selected' : ''} ${isSelectMode ? 'select-mode' : ''}`}
      onClick={handleCardClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleCardClick(e);
        }
      }}
      aria-label={`Conversation from ${formatDate(conversation.lastMessageTime || conversation.updatedAt)}`}
    >
      {/* Selection checkbox for bulk operations */}
      {isSelectMode && (
        <div className="selection-checkbox">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={onSelect}
            onClick={(e) => e.stopPropagation()}
            aria-label={`Select conversation from ${formatDate(conversation.lastMessageTime || conversation.updatedAt)}`}
          />
        </div>
      )}

      {/* Main conversation content */}
      <div className="conversation-content">
        {/* Header with type badge and date */}
        <div className="conversation-header">
          <div className="conversation-type">
            <span className={`type-badge ${getConversationType()}`}>
              {getConversationType() === 'voice' ? '🎤' : '💬'} 
              {getConversationType()}
            </span>
          </div>
          
          <div className="conversation-date">
            {formatDate(conversation.lastMessageTime || conversation.updatedAt)}
          </div>
        </div>

        {/* Title */}
        <h3 className="conversation-title">
          {conversation.title || 'untitled conversation'}
        </h3>

        {/* Message preview */}
        <p className="conversation-preview">
          {truncateMessage(conversation.lastMessage)}
        </p>

        {/* Conversation metadata */}
        <div className="conversation-meta">
          <span className="message-count">
            {messageCount} message{messageCount !== 1 ? 's' : ''}
          </span>
          
          {duration && (
            <span className="conversation-duration">
              {Math.round(duration / 60)} min
            </span>
          )}

          {conversation.mood && (
            <span className="conversation-mood">
              {conversation.mood}
            </span>
          )}
        </div>
      </div>

      {/* Action buttons (only show when not in select mode) */}
      {/* Remove the conversation-actions div that contains the delete button */}
    </div>
  );
};

export default ConversationCard; 