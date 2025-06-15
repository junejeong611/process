import React, { useState } from 'react';
import './ConversationCard.css';

const ConversationCard = ({ 
  conversation, 
  onClick,
  isSelected = false, 
  isSelectMode = false, 
  onSelect, 
  onDelete 
}) => {
  const [isDeleting, setIsDeleting] = useState(false);

  // Enhanced date formatting with emotional context
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const diffHours = Math.ceil(diffTime / (1000 * 60 * 60));
    const diffMinutes = Math.ceil(diffTime / (1000 * 60));
    
    if (diffMinutes < 5) return 'just now';
    if (diffMinutes < 60) return `${diffMinutes} minutes ago`;
    if (diffHours < 24) return `${diffHours} hours ago`;
    if (diffDays === 1) return 'yesterday';
    if (diffDays === 2) return 'day before yesterday';
    if (diffDays <= 7) return `${diffDays - 1} days ago`;
    if (diffDays <= 30) return `${Math.ceil(diffDays / 7)} weeks ago`;
    if (diffDays <= 365) return `${Math.ceil(diffDays / 30)} months ago`;
    
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
  };

  // Enhanced message truncation with emotional context
  const truncateMessage = (message) => {
    if (!message) return 'ready to continue your conversation...';
    
    // Remove excessive whitespace and line breaks
    const cleanMessage = message.replace(/\s+/g, ' ').trim();
    
    if (cleanMessage.length <= 120) return cleanMessage;
    
    // Try to cut at a sentence boundary
    const sentences = cleanMessage.split(/[.!?]+/);
    let truncated = sentences[0];
    
    if (truncated.length > 120) {
      // If first sentence is too long, cut at word boundary
      const words = cleanMessage.split(' ');
      truncated = words.slice(0, 20).join(' ');
    }
    
    return truncated + '...';
  };

  // Get mood indicator with enhanced emotional context
  const getMoodIndicator = () => {
    const mood = conversation.mood;
    if (!mood) return null;

    const moodConfig = {
      anxious: { emoji: '😰', color: 'var(--anxious)', label: 'feeling anxious' },
      peaceful: { emoji: '😌', color: 'var(--peaceful)', label: 'feeling peaceful' },
      excited: { emoji: '😊', color: 'var(--excited)', label: 'feeling excited' },
      reflective: { emoji: '🤔', color: 'var(--reflective)', label: 'reflecting' },
      grateful: { emoji: '🙏', color: 'var(--grateful)', label: 'feeling grateful' },
      overwhelmed: { emoji: '😵', color: 'var(--overwhelmed)', label: 'feeling overwhelmed' },
      hopeful: { emoji: '🌟', color: 'var(--excited)', label: 'feeling hopeful' },
      sad: { emoji: '😢', color: 'var(--anxious)', label: 'feeling sad' },
      angry: { emoji: '😤', color: 'var(--overwhelmed)', label: 'feeling angry' },
      calm: { emoji: '😊', color: 'var(--peaceful)', label: 'feeling calm' }
    };

    const config = moodConfig[mood.toLowerCase()] || { 
      emoji: '💭', 
      color: 'var(--text-muted)', 
      label: mood 
    };

    return (
      <div 
        className="mood-indicator" 
        style={{ background: config.color }}
        title={config.label}
        aria-label={config.label}
      >
        <span className="mood-emoji">{config.emoji}</span>
        <span className="mood-text">{mood}</span>
      </div>
    );
  };

  // Get conversation themes/tags
  const getThemes = () => {
    if (!conversation.themes || conversation.themes.length === 0) return null;
    
    return (
      <div className="conversation-themes">
        {conversation.themes.slice(0, 2).map((theme, index) => (
          <span key={index} className="theme-tag">
            {theme}
          </span>
        ))}
        {conversation.themes.length > 2 && (
          <span className="theme-more">
            +{conversation.themes.length - 2}
          </span>
        )}
      </div>
    );
  };

  // Handle card clicks with accessibility
  const handleCardClick = (e) => {
    if (isSelectMode) {
      e.preventDefault();
      onSelect && onSelect();
      // Announce selection change
      const action = isSelected ? 'deselected' : 'selected';
      announceToScreenReader(`conversation ${action}`);
    } else {
      onClick && onClick();
    }
  };

  // Screen reader announcements
  const announceToScreenReader = (message) => {
    const announcement = document.createElement('div');
    announcement.setAttribute('aria-live', 'polite');
    announcement.setAttribute('aria-atomic', 'true');
    announcement.className = 'sr-only';
    announcement.textContent = message;
    document.body.appendChild(announcement);
    setTimeout(() => document.body.removeChild(announcement), 1000);
  };

  // Get conversation type with enhanced context
  const getConversationType = () => {
    return conversation.type || 'text';
  };

  // Get conversation stats with emotional context
  const getConversationStats = () => {
    const messageCount = conversation.messageCount || conversation.messages?.length || 0;
    const duration = conversation.duration;
    const breakthrough = conversation.hasBreakthrough;
    
    return { messageCount, duration, breakthrough };
  };

  const { messageCount, duration, breakthrough } = getConversationStats();
  const conversationType = getConversationType();
  const moodIndicator = getMoodIndicator();
  const themes = getThemes();

  return (
    <article 
      className={`conversation-card ${isSelected ? 'selected' : ''} ${isSelectMode ? 'select-mode' : ''} ${conversationType}`}
      onClick={handleCardClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleCardClick(e);
        }
      }}
      aria-label={`
        ${conversationType} conversation from ${formatDate(conversation.lastMessageTime || conversation.updatedAt)}.
        ${conversation.title || 'Untitled conversation'}.
        ${messageCount} message${messageCount !== 1 ? 's' : ''}.
        ${conversation.mood ? `Mood: ${conversation.mood}.` : ''}
        ${breakthrough ? 'Contains breakthrough moment.' : ''}
        ${isSelectMode ? (isSelected ? 'Selected.' : 'Not selected.') : 'Click to view.'}
      `}
    >
      {/* Selection checkbox for bulk operations */}
      {isSelectMode && (
        <div className="selection-checkbox">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={onSelect}
            onClick={(e) => e.stopPropagation()}
            aria-label={`${isSelected ? 'Deselect' : 'Select'} conversation from ${formatDate(conversation.lastMessageTime || conversation.updatedAt)}`}
          />
        </div>
      )}

      {/* Main conversation content */}
      <div className="conversation-content">
        {/* Header with type badge, mood, and date */}
        <div className="conversation-header">
          <div className="conversation-meta-left">
            <span className={`type-badge ${conversationType}`}>
              <span className="type-icon" aria-hidden="true">
                {conversationType === 'voice' ? '🎤' : '💬'}
              </span>
              <span className="type-text">{conversationType}</span>
            </span>
            
            {moodIndicator}
            
            {breakthrough && (
              <div className="breakthrough-indicator" title="Contains breakthrough moment" aria-label="Contains breakthrough moment">
                <span className="breakthrough-icon">✨</span>
                <span className="breakthrough-text">breakthrough</span>
              </div>
            )}
          </div>
          
          <div className="conversation-date">
            <time dateTime={conversation.lastMessageTime || conversation.updatedAt}>
              {formatDate(conversation.lastMessageTime || conversation.updatedAt)}
            </time>
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

        {/* Themes/Tags */}
        {themes}

        {/* Conversation metadata */}
        <div className="conversation-meta-bottom">
          <span className="message-count" aria-label={`${messageCount} messages in conversation`}>
            <span className="meta-icon" aria-hidden="true">💬</span>
            {messageCount} message{messageCount !== 1 ? 's' : ''}
          </span>
          
          {duration && (
            <span className="conversation-duration" aria-label={`Conversation lasted ${Math.round(duration / 60)} minutes`}>
              <span className="meta-icon" aria-hidden="true">⏱️</span>
              {Math.round(duration / 60)} min
            </span>
          )}

          {conversation.insights && (
            <span className="insights-count" aria-label={`${conversation.insights} insights gained`}>
              <span className="meta-icon" aria-hidden="true">💡</span>
              {conversation.insights} insight{conversation.insights !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>
    </article>
  );
};

export default ConversationCard;