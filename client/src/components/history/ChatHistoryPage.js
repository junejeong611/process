import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import ConversationCard from './ConversationCard';
import './ChatHistoryPage.css';
import { toast } from 'react-toastify';

const ChatHistoryPage = () => {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sortOrder, setSortOrder] = useState('newest');
  const [filterType, setFilterType] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedConversations, setSelectedConversations] = useState(new Set());
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  
  const navigate = useNavigate();
  const deleteTimeoutRef = useRef(null);

  // Export function (standalone implementation)
  const exportHistory = async () => {
    try {
      const dataStr = JSON.stringify(conversations, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `chat-history-${new Date().toISOString().split('T')[0]}.json`;
      link.click();
      
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
      throw error;
    }
  };

  useEffect(() => {
    fetchConversations();
    document.title = 'Chat History - Process';
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e) => {
      // Escape to exit select mode or close modals
      if (e.key === 'Escape') {
        if (showDeleteConfirm || showExportModal) {
          setShowDeleteConfirm(false);
          setShowExportModal(false);
        } else if (isSelectMode) {
          setIsSelectMode(false);
          setSelectedConversations(new Set());
        }
      }
      
      // Ctrl/Cmd + A to select all
      if ((e.ctrlKey || e.metaKey) && e.key === 'a' && isSelectMode) {
        e.preventDefault();
        const allIds = new Set(filteredAndSortedConversations.map(c => c.id));
        setSelectedConversations(allIds);
      }
      
      // Delete key to delete selected
      if (e.key === 'Delete' && selectedConversations.size > 0) {
        setShowDeleteConfirm(true);
      }
    };
    
    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [isSelectMode, selectedConversations, showDeleteConfirm, showExportModal]);

  const fetchConversations = async () => {
    try {
      setLoading(true);
      setError('');
      
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch('/api/chat/conversations', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        if (response.status === 401) {
          navigate('/login');
          return;
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('API Response:', data);
      
      if (data.success) {
        setConversations(data.conversations || []);
        setRetryCount(0);
      } else {
        throw new Error(data.message || 'Failed to load conversations');
      }
    } catch (err) {
      console.error('Fetch Error:', err);
      
      if (err.name === 'AbortError') {
        setError('Request timed out. Please check your connection.');
      } else if (err.message.includes('Failed to fetch')) {
        setError('Network error. Please check your internet connection.');
      } else {
        setError(err.message || 'Failed to load conversations');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = () => {
    if (retryCount < 3) {
      setRetryCount(prev => prev + 1);
      fetchConversations();
    } else {
      toast.error('Maximum retry attempts reached. Please refresh the page.');
    }
  };

  const handleSortChange = (e) => {
    setSortOrder(e.target.value);
  };

  const handleFilterChange = (e) => {
    setFilterType(e.target.value);
  };

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
  };

  const toggleSelectMode = () => {
    setIsSelectMode(!isSelectMode);
    setSelectedConversations(new Set());
  };

  const toggleConversationSelection = (conversationId) => {
    const newSelected = new Set(selectedConversations);
    if (newSelected.has(conversationId)) {
      newSelected.delete(conversationId);
    } else {
      newSelected.add(conversationId);
    }
    setSelectedConversations(newSelected);
  };

  const selectAllConversations = () => {
    const allIds = new Set(filteredAndSortedConversations.map(c => c.id));
    setSelectedConversations(allIds);
  };

  const clearSelection = () => {
    setSelectedConversations(new Set());
  };

  const handleDeleteSelected = async () => {
    if (selectedConversations.size === 0) return;
    
    setIsDeleting(true);
    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      const conversationIds = Array.from(selectedConversations);

      const response = await fetch('/api/chat/conversations/bulk-delete', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ conversationIds })
      });

      const data = await response.json();

      if (data.success) {
        // Remove deleted conversations from state
        setConversations(prev => 
          prev.filter(conv => !selectedConversations.has(conv.id))
        );
        setSelectedConversations(new Set());
        setIsSelectMode(false);
        toast.success(`${conversationIds.length} conversation(s) deleted successfully`);
      } else {
        throw new Error(data.message || 'Failed to delete conversations');
      }
    } catch (err) {
      console.error('Delete Error:', err);
      toast.error(err.message || 'Failed to delete conversation');
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleExportHistory = async () => {
    try {
      await exportHistory();
      toast.success('Chat history exported successfully');
      setShowExportModal(false);
    } catch (err) {
      console.error('Export Error:', err);
      toast.error('Failed to export chat history');
    }
  };

  const handleDeleteSingle = async (conversationId) => {
    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      const response = await fetch(`/api/chat/conversations/${conversationId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      if (data.success) {
        setConversations(prev => prev.filter(conv => conv.id !== conversationId));
        toast.success('Conversation deleted successfully');
      } else {
        throw new Error(data.message || 'Failed to delete conversation');
      }
    } catch (err) {
      console.error('Delete Error:', err);
      toast.error(err.message || 'Failed to delete conversation');
    }
  };

  // Filter and sort conversations
  const filteredAndSortedConversations = conversations
    .filter(conversation => {
      // Filter by type
      if (filterType === 'voice' && conversation.type !== 'voice') return false;
      if (filterType === 'text' && conversation.type !== 'text') return false;
      
      // Filter by search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        return (
          conversation.title?.toLowerCase().includes(query) ||
          conversation.lastMessage?.toLowerCase().includes(query) ||
          conversation.summary?.toLowerCase().includes(query)
        );
      }
      
      return true;
    })
    .sort((a, b) => {
      const dateA = new Date(a.lastMessageTime || a.createdAt);
      const dateB = new Date(b.lastMessageTime || b.createdAt);
      return sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
    });

  if (loading) {
    return (
      <div className="chat-history-container">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p className="loading-text">Loading your conversations...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="chat-history-container">
        <div className="error-container">
          <div className="error-icon">⚠️</div>
          <h2 className="error-title">Unable to Load Conversations</h2>
          <p className="error-message">{error}</p>
          <div className="error-actions">
            <button onClick={handleRetry} className="retry-button">
              Try Again
            </button>
            <Link to="/options" className="back-button">
              Back to Options
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="chat-history-container">
      {/* Header */}
      <header className="chat-history-header">
        <div className="header-main">
          <Link to="/options" className="back-link" aria-label="Back to options">
            <span className="back-icon">←</span>
            back
          </Link>
          <h1 className="page-title">your conversations</h1>
          <p className="page-subtitle">
            {conversations.length} conversation{conversations.length !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Action buttons */}
        <div className="header-actions">
          <button
            onClick={toggleSelectMode}
            className={`action-button ${isSelectMode ? 'active' : ''}`}
            aria-label={isSelectMode ? 'Exit select mode' : 'Enter select mode'}
          >
            {isSelectMode ? 'cancel' : 'select'}
          </button>
          
          <button
            onClick={() => setShowExportModal(true)}
            className="action-button secondary"
            disabled={conversations.length === 0}
          >
            export
          </button>
        </div>
      </header>

      {/* Controls */}
      <div className="controls-section">
        {/* Search */}
        <div className="search-container">
          <input
            type="text"
            placeholder="search conversations..."
            value={searchQuery}
            onChange={handleSearchChange}
            className="search-input"
            aria-label="Search conversations"
          />
          <span className="search-icon">🔍</span>
        </div>

        {/* Filters and Sort */}
        <div className="filter-controls">
          <div className="control-group">
            <label htmlFor="filter-type" className="control-label">filter:</label>
            <select
              id="filter-type"
              value={filterType}
              onChange={handleFilterChange}
              className="control-select"
            >
              <option value="all">all conversations</option>
              <option value="voice">voice only</option>
              <option value="text">text only</option>
            </select>
          </div>

          <div className="control-group">
            <label htmlFor="sort-order" className="control-label">sort:</label>
            <select
              id="sort-order"
              value={sortOrder}
              onChange={handleSortChange}
              className="control-select"
            >
              <option value="newest">newest first</option>
              <option value="oldest">oldest first</option>
            </select>
          </div>
        </div>
      </div>

      {/* Selection controls */}
      {isSelectMode && (
        <div className="selection-controls">
          <div className="selection-info">
            <span className="selected-count">
              {selectedConversations.size} selected
            </span>
          </div>
          
          <div className="selection-actions">
            <button
              onClick={selectAllConversations}
              className="selection-button"
              disabled={selectedConversations.size === filteredAndSortedConversations.length}
            >
              select all
            </button>
            
            <button
              onClick={clearSelection}
              className="selection-button"
              disabled={selectedConversations.size === 0}
            >
              clear
            </button>
            
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="selection-button danger"
              disabled={selectedConversations.size === 0}
            >
              delete ({selectedConversations.size})
            </button>
          </div>
        </div>
      )}

      {/* Conversations List */}
      <main className="conversations-list">
        {filteredAndSortedConversations.length === 0 ? (
          <div className="empty-state">
            {searchQuery.trim() ? (
              <>
                <div className="empty-icon">🔍</div>
                <h3 className="empty-title">no conversations found</h3>
                <p className="empty-message">
                  try adjusting your search or filter criteria
                </p>
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setFilterType('all');
                  }}
                  className="clear-filters-button"
                >
                  clear filters
                </button>
              </>
            ) : (
              <>
                <div className="empty-icon">💬</div>
                <h3 className="empty-title">no conversations yet</h3>
                <p className="empty-message">
                  start your first conversation to see it here
                </p>
                <Link to="/voice" className="start-conversation-button">
                  start voice chat
                </Link>
              </>
            )}
          </div>
        ) : (
          filteredAndSortedConversations.map(conversation => (
            <ConversationCard
              key={conversation.id}
              conversation={conversation}
              isSelected={selectedConversations.has(conversation.id)}
              isSelectMode={isSelectMode}
              onSelect={() => toggleConversationSelection(conversation.id)}
              onClick={() => {
                if (!isSelectMode) {
                  navigate(`/chat-history/${conversation.id}`);
                }
              }}
              onDelete={(conversationId) => handleDeleteSingle(conversationId)}
            />
          ))
        )}
      </main>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="modal-overlay" onClick={() => setShowDeleteConfirm(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">delete conversations?</h3>
            </div>
            
            <div className="modal-body">
              <p className="modal-message">
                are you sure you want to delete {selectedConversations.size} conversation
                {selectedConversations.size !== 1 ? 's' : ''}? this action cannot be undone.
              </p>
            </div>
            
            <div className="modal-actions">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="modal-button secondary"
                disabled={isDeleting}
              >
                cancel
              </button>
              
              <button
                onClick={handleDeleteSelected}
                className="modal-button danger"
                disabled={isDeleting}
              >
                {isDeleting ? 'deleting...' : 'delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Export Modal */}
      {showExportModal && (
        <div className="modal-overlay" onClick={() => setShowExportModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">export chat history</h3>
            </div>
            
            <div className="modal-body">
              <p className="modal-message">
                export all your conversations as a JSON file for backup or analysis.
              </p>
            </div>
            
            <div className="modal-actions">
              <button
                onClick={() => setShowExportModal(false)}
                className="modal-button secondary"
              >
                cancel
              </button>
              
              <button
                onClick={handleExportHistory}
                className="modal-button primary"
              >
                export
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatHistoryPage;