import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import ConversationCard from './ConversationCard';
import './ChatHistoryPage.css';
import { toast } from 'react-toastify';

// Constants
const ITEMS_PER_PAGE = 10;

// Cache for conversations data
let conversationsCache = null;
let lastFetchTime = 0;
const CACHE_DURATION = 30000; // 30 seconds

const ChatHistoryPage = () => {
  // State management
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingStage, setLoadingStage] = useState('initial');
  const [error, setError] = useState('');
  const [errorType, setErrorType] = useState('');
  const [sortOrder, setSortOrder] = useState('newest');
  const [filterType, setFilterType] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedConversations, setSelectedConversations] = useState(new Set());
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  
  // Refs
  const navigate = useNavigate();
  const location = useLocation();
  const deleteTimeoutRef = useRef(null);
  const searchInputRef = useRef(null);
  const abortControllerRef = useRef(null);

  // Enhanced loading stages with better messaging
  const loadingMessages = {
    initial: "connecting to your conversations...",
    processing: "organizing your history...",
    finalizing: "almost ready..."
  };

  // Memoized filtered and sorted conversations for performance
  const filteredAndSortedConversations = React.useMemo(() => {
    return conversations
      .filter(conversation => {
        // Type filter
        if (filterType === 'voice' && conversation.type !== 'voice') return false;
        if (filterType === 'text' && conversation.type !== 'text') return false;
        
        // Search filter
        if (searchQuery.trim()) {
          const query = searchQuery.toLowerCase();
          return (
            conversation.title?.toLowerCase().includes(query) ||
            conversation.lastMessage?.toLowerCase().includes(query) ||
            conversation.summary?.toLowerCase().includes(query) ||
            conversation.tags?.some(tag => tag.toLowerCase().includes(query))
          );
        }
        
        return true;
      })
      .sort((a, b) => {
        const dateA = new Date(a.lastMessageTime || a.updatedAt || a.createdAt);
        const dateB = new Date(b.lastMessageTime || b.updatedAt || b.createdAt);
        return sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
      });
  }, [conversations, filterType, searchQuery, sortOrder]);

  // Network status monitoring
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Initialize component
  useEffect(() => {
    const shouldFetch = !conversationsCache || (Date.now() - lastFetchTime > CACHE_DURATION);
    
    if (shouldFetch) {
      fetchConversations();
    } else {
      setConversations(conversationsCache);
      setLoading(false);
    }

    document.title = 'Chat History - Your Safe Space';
    
    // Focus management for accessibility
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
    
    return () => {
      // Cleanup any pending requests
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [location.key]); // Re-run when navigation occurs

  // Enhanced loading sequence with realistic timing
  const simulateLoadingStages = useCallback(() => {
    setLoadingStage('initial');
    
    const timer1 = setTimeout(() => setLoadingStage('processing'), 900);
    const timer2 = setTimeout(() => setLoadingStage('finalizing'), 1800);
    
    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, []);

  // Enhanced keyboard shortcuts with accessibility
  useEffect(() => {
    const handleKeyPress = (e) => {
      // Escape key handling
      if (e.key === 'Escape') {
        if (showDeleteConfirm) {
          setShowDeleteConfirm(false);
        } else if (isSelectMode) {
          setIsSelectMode(false);
          setSelectedConversations(new Set());
        } else if (searchQuery) {
          setSearchQuery('');
        }
        return;
      }
      
      // Ctrl/Cmd + A for select all (only in select mode)
      if ((e.ctrlKey || e.metaKey) && e.key === 'a' && isSelectMode) {
        e.preventDefault();
        const allIds = new Set(filteredAndSortedConversations.map(c => c._id));
        setSelectedConversations(allIds);
        toast.info(`Selected ${allIds.size} conversations`);
        return;
      }
      
      // Delete key for selected conversations
      if (e.key === 'Delete' && selectedConversations.size > 0 && !showDeleteConfirm) {
        setShowDeleteConfirm(true);
        return;
      }
      
      // Ctrl/Cmd + F for search focus
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        if (searchInputRef.current) {
          searchInputRef.current.focus();
          searchInputRef.current.select();
        }
        return;
      }
      
      // Enter to confirm actions
      if (e.key === 'Enter' && showDeleteConfirm) {
        handleDeleteSelected();
        return;
      }
    };
    
    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [isSelectMode, selectedConversations, showDeleteConfirm, searchQuery]);

  // Enhanced fetch with better error handling
  const fetchConversations = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      setErrorType('');
      
      const cleanupLoading = simulateLoadingStages();
      
      // Cancel any existing request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }

      // Create new abort controller
      abortControllerRef.current = new AbortController();
      const timeoutId = setTimeout(() => abortControllerRef.current.abort(), 20000);

      const response = await fetch('/api/chat/conversations', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        signal: abortControllerRef.current.signal
      });

      clearTimeout(timeoutId);
      cleanupLoading();

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || `HTTP ${response.status}`);
      }
      
      if (data.success) {
        const sortedConversations = (data.conversations || []).sort((a, b) => 
          new Date(b.lastMessageTime || b.updatedAt || b.createdAt) - 
          new Date(a.lastMessageTime || a.updatedAt || a.createdAt)
        );
        setConversations(sortedConversations);
        conversationsCache = sortedConversations;
        lastFetchTime = Date.now();
        setError('');
        setErrorType('');
        setRetryCount(0);
      } else {
        throw new Error(data.message || 'Failed to load conversations');
      }
    } catch (err) {
      if (err.name === 'AbortError') {
        return;
      }
      
      console.error('Fetch Error:', err);
      
      if (!navigator.onLine) {
        setErrorType('network');
        setError('Network error. Please check your internet connection.');
      } else if (err.message.includes('401')) {
        navigate('/login');
      } else {
        setErrorType('general');
        setError('Something went wrong. Please try refreshing the page.');
      }
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  // Enhanced retry with exponential backoff
  const handleRetry = useCallback(() => {
    if (retryCount < 3) {
      setRetryCount(prev => prev + 1);
      
      // Exponential backoff: 1s, 2s, 4s
      const delay = Math.pow(2, retryCount) * 1000;
      
      toast.info(`Retrying in ${delay/1000} second${delay > 1000 ? 's' : ''}...`);
      
      setTimeout(() => {
        fetchConversations();
      }, delay);
    } else {
      toast.error('Maximum retry attempts reached. Please refresh the page or contact support.');
    }
  }, [retryCount, fetchConversations]);

  // Filter and sort handlers with validation
  const handleSortChange = useCallback((e) => {
    const newSortOrder = e.target.value;
    setSortOrder(newSortOrder);
    console.log(`Sort order changed to: ${newSortOrder}`);
  }, []);

  const handleFilterChange = useCallback((e) => {
    const newFilterType = e.target.value;
    setFilterType(newFilterType);
    console.log(`Filter changed to: ${newFilterType}`);
  }, []);

  const handleSearchChange = useCallback((e) => {
    const newSearchQuery = e.target.value;
    setSearchQuery(newSearchQuery);
    
    // Clear selection when searching
    if (newSearchQuery && selectedConversations.size > 0) {
      setSelectedConversations(new Set());
    }
  }, [selectedConversations.size]);

  // Selection mode handlers
  const toggleSelectMode = useCallback(() => {
    const newSelectMode = !isSelectMode;
    setIsSelectMode(newSelectMode);
    setSelectedConversations(new Set());
    
    toast.info(newSelectMode ? 'Selection mode enabled' : 'Selection mode disabled');
  }, [isSelectMode]);

  const toggleConversationSelection = useCallback((conversationId) => {
    const newSelected = new Set(selectedConversations);
    if (newSelected.has(conversationId)) {
      newSelected.delete(conversationId);
    } else {
      newSelected.add(conversationId);
    }
    setSelectedConversations(newSelected);
  }, [selectedConversations]);

  const selectAllConversations = useCallback(() => {
    if (selectedConversations.size === filteredAndSortedConversations.length) {
      // If all are selected, clear selection
      setSelectedConversations(new Set());
      toast.info('Selection cleared');
    } else {
      // Otherwise select all
      const allIds = new Set(filteredAndSortedConversations.map(c => c._id));
      setSelectedConversations(allIds);
      toast.success(`Selected all ${allIds.size} conversations`);
    }
  }, [filteredAndSortedConversations, selectedConversations]);

  const clearSelection = useCallback(() => {
    setSelectedConversations(new Set());
    toast.info('Selection cleared');
  }, []);

  // Enhanced delete with better UX
  const handleDeleteSelected = useCallback(async () => {
    if (selectedConversations.size === 0) {
      toast.warning('No conversations selected');
      return;
    }
    
    setIsDeleting(true);
    const conversationIds = Array.from(selectedConversations);
    
    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      
      console.log('Deleting conversations:', conversationIds);

      const response = await fetch('/api/chat/conversations/bulk-delete', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ conversationIds })
      });

      let data;
      try {
        data = await response.json();
      } catch (jsonErr) {
        console.error('Failed to parse JSON from bulk-delete response:', jsonErr);
        data = { success: false, message: 'Invalid server response' };
      }

      console.log('Bulk delete API response:', data);

      if (response.ok && data.success) {
        // Update local state optimistically
        setConversations(prev => 
          prev.filter(conv => !selectedConversations.has(conv._id))
        );
        
        setSelectedConversations(new Set());
        setIsSelectMode(false);
        
        const deletedCount = conversationIds.length;
        toast.success(
          `Successfully deleted ${deletedCount} conversation${deletedCount !== 1 ? 's' : ''}`
        );
      } else {
        throw new Error(data.message || 'Failed to delete conversations');
      }
    } catch (err) {
      console.error('Delete Error:', err);
      toast.error(err.message || 'Failed to delete conversations. Please try again.');
      
      // Optionally refresh the list to ensure consistency
      setTimeout(() => {
        fetchConversations();
      }, 1000);
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  }, [selectedConversations, fetchConversations]);

  // Delete a single conversation by ID
  const handleDeleteSingle = useCallback(async (conversationId) => {
    setIsDeleting(true);
    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      const response = await fetch(`/api/chat/conversations/${conversationId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      let data;
      try {
        data = await response.json();
      } catch (jsonErr) {
        console.error('Failed to parse JSON from delete response:', jsonErr);
        data = { success: false, message: 'Invalid server response' };
      }
      if (response.ok && data.success) {
        setConversations(prev => prev.filter(conv => conv._id !== conversationId));
        toast.success('Conversation deleted successfully');
      } else {
        throw new Error(data.message || 'Failed to delete conversation');
      }
    } catch (err) {
      console.error('Delete Error:', err);
      toast.error(err.message || 'Failed to delete conversation. Please try again.');
      setTimeout(() => {
        fetchConversations();
      }, 1000);
    } finally {
      setIsDeleting(false);
    }
  }, [fetchConversations]);

  // Enhanced conversation navigation
  const handleConversationClick = useCallback((conversationId) => {
    if (!isSelectMode) {
      navigate(`/chat-history/${conversationId}`);
    }
  }, [isSelectMode, navigate]);

  // Get appropriate error icon based on category
  const getErrorIcon = (errorType) => {
    switch (errorType) {
      case 'network': return '⚡';
      case 'rateLimit': return '⏰';
      case 'server': return '🔧';
      case 'forbidden': return '🔐';
      case 'notFound': return '🔍';
      default: return '⚠';
    }
  };

  // Get error title based on type
  const getErrorTitle = (errorType) => {
    switch (errorType) {
      case 'network': return 'connection problem';
      case 'rateLimit': return 'too many attempts';
      case 'server': return 'server error';
      case 'forbidden': return 'access denied';
      case 'notFound': return 'not found';
      default: return 'something went wrong';
    }
  };

  // Enhanced loading state with better UX and proper centering
  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-content">
          <div className="loading-spinner" role="status" aria-label="Loading your conversations">
            <div className="spinner-circle"></div>
          </div>
          <p className="loading-text" aria-live="polite">
            {loadingMessages[loadingStage]}
          </p>
        </div>
      </div>
    );
  }

  // Enhanced error state with better support messaging
  if (error) {
    return (
      <div className="error-message-container">
        <div className="error-message">
          <div className="error-content">
            <span className="error-icon">⚠</span>
            <h3 className="error-title">application error</h3>
            <p className="error-text">
              we encountered an error while loading your conversations. please try refreshing the page.
            </p>
            <button onClick={() => window.location.reload()} className="retry-button">
              refresh page
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="main-content-wrapper">
      <div className="chat-history-container">
        <div className="chat-history-inner">
          {/* Enhanced Header */}
          <header className="chat-history-header">
            <div className="header-center">
              <h1 className="page-title">your conversations</h1>
              <p className="page-subtitle">
                {conversations.length} conversation{conversations.length !== 1 ? 's' : ''}
                {filteredAndSortedConversations.length !== conversations.length && 
                  ` (${filteredAndSortedConversations.length} shown)`
                }
              </p>
            </div>
            <div className="header-actions">
              <button
                onClick={toggleSelectMode}
                className={`action-button ${isSelectMode ? 'active' : ''}`}
                aria-label={isSelectMode ? 'Exit selection mode' : 'Enter selection mode'}
                aria-pressed={isSelectMode}
              >
                {isSelectMode ? 'cancel' : 'select'}
              </button>
            </div>
          </header>

          {/* Enhanced Search and Controls */}
          <div className="search-and-controls">
            <div className="search-section">
              <div className="search-input-wrapper">
                <span className="search-icon" aria-hidden="true">🔍</span>
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="search conversations..."
                  value={searchQuery}
                  onChange={handleSearchChange}
                  className="search-input"
                  aria-label="Search conversations"
                  aria-describedby="search-help"
                />
                {searchQuery && (
                  <button
                    className="clear-action"
                    onClick={() => setSearchQuery('')}
                    aria-label="Clear search"
                    type="button"
                  >
                    ×
                  </button>
                )}
              </div>
              <div id="search-help" className="sr-only">
                Search through your conversation titles, messages, and summaries
              </div>
            </div>
            
            <div className="filter-controls">
              <div className="control-group">
                <label htmlFor="filter-type" className="control-label">filter:</label>
                <select
                  id="filter-type"
                  value={filterType}
                  onChange={handleFilterChange}
                  className="control-select"
                  aria-describedby="filter-help"
                >
                  <option value="all">all conversations</option>
                  <option value="voice">voice only</option>
                  <option value="text">text only</option>
                </select>
                <div id="filter-help" className="sr-only">
                  Filter conversations by type
                </div>
              </div>
              
              <div className="control-group">
                <label htmlFor="sort-order" className="control-label">sort:</label>
                <select
                  id="sort-order"
                  value={sortOrder}
                  onChange={handleSortChange}
                  className="control-select"
                  aria-describedby="sort-help"
                >
                  <option value="newest">newest first</option>
                  <option value="oldest">oldest first</option>
                </select>
                <div id="sort-help" className="sr-only">
                  Sort conversations by date
                </div>
              </div>
            </div>
          </div>

          {/* Enhanced Selection Controls - Right Aligned, Above Conversations */}
          {isSelectMode && (
            <div className="selection-controls" role="toolbar" aria-label="Selection actions">
              <div className="selection-actions">
                {selectedConversations.size > 0 && (
                  <span className="selection-info" aria-live="polite">
                    {selectedConversations.size} selected
                  </span>
                )}
                <button
                  onClick={selectAllConversations}
                  className={`action-button select-all ${selectedConversations.size === filteredAndSortedConversations.length ? 'active' : ''}`}
                  aria-label={`${selectedConversations.size === filteredAndSortedConversations.length ? 'Deselect' : 'Select'} all ${filteredAndSortedConversations.length} conversations`}
                >
                  {selectedConversations.size === filteredAndSortedConversations.length ? 'deselect all' : 'select all'}
                </button>
                <button
                  onClick={clearSelection}
                  className="action-button secondary"
                  disabled={selectedConversations.size === 0}
                  aria-label="Clear selection"
                >
                  clear
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="action-button danger"
                  disabled={selectedConversations.size === 0}
                  aria-label={`Delete ${selectedConversations.size} selected conversations`}
                >
                  delete
                  {selectedConversations.size > 0 && (
                    <span className="selection-count-badge" aria-hidden="true">
                      {selectedConversations.size}
                    </span>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Enhanced Conversations List */}
          <main className="conversations-list" role="main">
            {filteredAndSortedConversations.length === 0 ? (
              <div className="empty-state">
                {searchQuery.trim() ? (
                  <>
                    <div className="empty-icon" aria-hidden="true">🔍</div>
                    <h3 className="empty-title">no conversations found</h3>
                    <p className="empty-message">
                      Try adjusting your search or filter criteria. Your conversations are here when you need them.
                    </p>
                    <button
                      onClick={() => {
                        setSearchQuery('');
                        setFilterType('all');
                      }}
                      className="pill-button"
                      aria-label="Clear all filters and search"
                    >
                      clear filters
                    </button>
                  </>
                ) : (
                  <>
                    <div className="empty-icon" aria-hidden="true">💬</div>
                    <h3 className="empty-title">no conversations yet</h3>
                    <p className="empty-message">
                      ready to start your journey? your first conversation is just a click away
                    </p>
                    <div className="empty-actions">
                      <Link to="/voice" className="pill-button" aria-label="Start voice conversation">
                        start voice chat
                      </Link>
                      <Link to="/chat" className="pill-button" aria-label="Start text conversation">
                        start text chat
                      </Link>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div 
                className="conversations-grid"
                role="grid" 
                aria-label={`${filteredAndSortedConversations.length} conversations`}
              >
                {filteredAndSortedConversations.map((conversation, index) => (
                  <ConversationCard
                    key={conversation._id}
                    conversation={conversation}
                    isSelected={selectedConversations.has(conversation._id)}
                    isSelectMode={isSelectMode}
                    onSelect={() => toggleConversationSelection(conversation._id)}
                    onClick={() => handleConversationClick(conversation._id)}
                    onDelete={() => handleDeleteSingle(conversation._id)}
                    index={index}
                    aria-rowindex={index + 1}
                  />
                ))}
              </div>
            )}
          </main>

          {/* Enhanced Delete Confirmation Modal */}
          {showDeleteConfirm && (
            <div 
              className="modal-overlay" 
              onClick={() => setShowDeleteConfirm(false)}
              role="dialog"
              aria-modal="true"
              aria-labelledby="delete-modal-title"
              aria-describedby="delete-modal-description"
            >
              <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                  <h3 id="delete-modal-title" className="modal-title">
                    confirm deletion
                  </h3>
                </div>
                <div className="modal-body">
                  <p id="delete-modal-description" className="modal-message">
                    Are you sure you want to delete {selectedConversations.size} conversation{selectedConversations.size !== 1 ? 's' : ''}? 
                    This action cannot be undone, but your growth and progress continue.
                  </p>
                </div>
                <div className="modal-actions">
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    className="modal-button secondary"
                    aria-label="Cancel deletion"
                  >
                    cancel
                  </button>
                  <button
                    onClick={handleDeleteSelected}
                    className="modal-button primary"
                    disabled={isDeleting}
                    aria-label={`Confirm deletion of ${selectedConversations.size} conversations`}
                  >
                    {isDeleting ? 'deleting...' : 'delete'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatHistoryPage;