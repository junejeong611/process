import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import ConversationCard from './ConversationCard';
import './ChatHistoryPage.css';
import { toast } from 'react-toastify';

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
  const deleteTimeoutRef = useRef(null);
  const searchInputRef = useRef(null);
  const abortControllerRef = useRef(null);

  // Enhanced loading stages with better messaging
  const loadingMessages = {
    initial: "connecting to your conversations...",
    processing: "organizing your history...",
    finalizing: "almost ready..."
  };

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
    fetchConversations();
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
  }, []);

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

  // Enhanced fetch with better error handling and retry logic
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
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache'
        },
        signal: abortControllerRef.current.signal
      });

      clearTimeout(timeoutId);
      cleanupLoading();

      if (!response.ok) {
        if (response.status === 401) {
          // Handle authentication error
          localStorage.removeItem('token');
          sessionStorage.removeItem('token');
          navigate('/login');
          return;
        }
        
        // Enhanced error type detection
        if (response.status >= 500) {
          setErrorType('server');
        } else if (response.status === 429) {
          setErrorType('rateLimit');
        } else if (response.status === 403) {
          setErrorType('forbidden');
        } else if (response.status === 404) {
          setErrorType('notFound');
        } else {
          setErrorType('general');
        }
        
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText || response.statusText}`);
      }

      const data = await response.json();
      console.log('API Response:', data);
      
      if (data.success) {
        const conversationsData = data.conversations || [];
        setConversations(conversationsData);
        console.log(`Loaded ${conversationsData.length} conversations`);
        setRetryCount(0);
        
        // Success feedback for screen readers
        if (conversationsData.length === 0) {
          toast.info('No conversations found. Start your first chat!');
        } else {
          console.log(`Successfully loaded ${conversationsData.length} conversations`);
        }
      } else {
        throw new Error(data.message || 'Failed to load conversations');
      }
    } catch (err) {
      if (err.name === 'AbortError') {
        // Ignore abort errors caused by cleanup/unmount
        return;
      }
      console.error('Fetch Error:', err);
      // Enhanced error categorization with user-friendly messages
      if (err.message.includes('Failed to fetch') || !isOnline) {
        setErrorType('network');
        setError('Network error. Please check your internet connection.');
      } else if (err.message.includes('429')) {
        setErrorType('rateLimit');
        setError('Too many requests. Please wait a moment before trying again.');
      } else if (err.message.includes('5')) {
        setErrorType('server');
        setError('Our servers are temporarily unavailable. Please try again in a moment.');
      } else if (err.message.includes('403')) {
        setErrorType('forbidden');
        setError('Access denied. Please log in again.');
      } else if (err.message.includes('404')) {
        setErrorType('notFound');
        setError('Conversations not found. This might be a new account.');
      } else {
        setErrorType('general');
        setError(err.message || 'Something went wrong loading your conversations.');
      }
    } finally {
      setLoading(false);
    }
  }, [navigate, isOnline, simulateLoadingStages]);

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
    const allIds = new Set(filteredAndSortedConversations.map(c => c._id));
    setSelectedConversations(allIds);
    toast.success(`Selected all ${allIds.size} conversations`);
  }, []);

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

  // Enhanced loading state with better UX and proper centering
  if (loading) {
    return (
      <>
        {/* Main content still renders but is overlaid by loading */}
        <div className="main-content-wrapper">
          <div className="chat-history-container">
            <div className="chat-history-inner">
              {/* Content placeholder while loading */}
            </div>
          </div>
        </div>
        
        {/* Full-screen loading overlay */}
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
      </>
    );
  }

  // Enhanced error state with better support messaging
  if (error) {
    const getErrorConfig = () => {
      switch (errorType) {
        case 'network':
          return {
            icon: '🌐',
            title: 'Connection Issue',
            message: 'Having trouble connecting. Your conversations are safe and secure.',
            supportText: 'Network issues happen - this isn\'t your fault. Your data is protected.',
            actionText: 'Check Connection & Retry'
          };
        case 'server':
          return {
            icon: '⚠️',
            title: 'Server Temporarily Unavailable',
            message: 'Our servers are taking a quick break. Please try again in a moment.',
            supportText: 'Technical difficulties are temporary. Your conversations remain safe.',
            actionText: 'Try Again'
          };
        case 'timeout':
          return {
            icon: '⏱️',
            title: 'Request Timed Out',
            message: 'The request took longer than expected. Let\'s try again.',
            supportText: 'Sometimes connections need a little more time. Your patience is appreciated.',
            actionText: 'Retry Now'
          };
        case 'rateLimit':
          return {
            icon: '🛑',
            title: 'Taking a Moment',
            message: 'Please wait a moment before trying again. We\'re protecting your data.',
            supportText: 'Taking breaks is important for both you and our systems.',
            actionText: 'Wait & Retry'
          };
        case 'forbidden':
          return {
            icon: '🔒',
            title: 'Access Issue',
            message: 'Please log in again to access your conversations.',
            supportText: 'Your privacy and security are our top priorities.',
            actionText: 'Log In Again'
          };
        case 'notFound':
          return {
            icon: '🆕',
            title: 'Fresh Start',
            message: 'No conversations found yet. Ready to begin your journey?',
            supportText: 'Every conversation starts somewhere. You\'re in the right place.',
            actionText: 'Start First Chat'
          };
        default:
          return {
            icon: '💙',
            title: 'Something Unexpected Happened',
            message: error,
            supportText: 'Technical problems don\'t affect your progress or wellbeing.',
            actionText: 'Try Again'
          };
      }
    };

    const errorConfig = getErrorConfig();
    const canRetry = retryCount < 3 && errorType !== 'forbidden' && errorType !== 'notFound';
    const isOfflineError = !isOnline;

    return (
      <div className="main-content-wrapper">
        <div className="chat-history-container">
          <div className="chat-history-inner">
            <div className="error-container">
              <div className="error-content" role="alert">
                <div className="error-icon" role="img" aria-label="Error indication">
                  {isOfflineError ? '📡' : errorConfig.icon}
                </div>
                <h2 className="error-title">
                  {isOfflineError ? 'You\'re Offline' : errorConfig.title}
                </h2>
                <p className="error-message">
                  {isOfflineError ? 
                    'Please check your internet connection and try again.' : 
                    errorConfig.message
                  }
                </p>
                
                <div className="error-support-actions-row">
                  <div className="error-support">
                    <div className="support-icon">💙</div>
                    <p className="support-text">
                      {isOfflineError ? 
                        'Connection issues are common - your wellbeing matters more than perfect connectivity.' : 
                        errorConfig.supportText
                      }
                    </p>
                  </div>
                  
                  {(canRetry || isOfflineError || errorType === 'forbidden') && (
                    <button 
                      onClick={
                        isOfflineError ? () => window.location.reload() :
                        errorType === 'forbidden' ? () => navigate('/login') :
                        errorType === 'notFound' ? () => navigate('/chat') :
                        handleRetry
                      }
                      className="retry-button"
                      disabled={!canRetry && !isOfflineError && errorType !== 'forbidden' && errorType !== 'notFound'}
                      aria-label={`${errorConfig.actionText}${retryCount > 0 ? ` (Attempt ${retryCount + 1}/3)` : ''}`}
                    >
                      {retryCount > 0 && !isOfflineError && errorType !== 'forbidden' && errorType !== 'notFound' && (
                        <span className="retry-count">
                          {retryCount + 1}/3
                        </span>
                      )}
                      <span>{errorConfig.actionText}</span>
                    </button>
                  )}
                </div>

                {/* Retry limit message */}
                {retryCount >= 3 && !isOfflineError && errorType !== 'forbidden' && errorType !== 'notFound' && (
                  <div className="retry-limit-message">
                    <p>
                      Maximum retry attempts reached. Try refreshing the page or contact our support team if the issue persists. 
                      Your conversations are safe.
                    </p>
                  </div>
                )}
              </div>
            </div>
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
            <Link to="/options" className="back-link" aria-label="Back to options">
              <span className="back-icon">←</span>
              <span className="back-text">back</span>
            </Link>
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
                  className="action-button"
                  disabled={selectedConversations.size === filteredAndSortedConversations.length}
                  aria-label={`Select all ${filteredAndSortedConversations.length} conversations`}
                >
                  select all
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
                      Ready to start your journey? Your first conversation is just a click away.
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