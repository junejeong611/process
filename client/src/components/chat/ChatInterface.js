import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import './ChatInterface.css';
import UnifiedStreamingService from '../../services/streamingService';
import useCreateConversation from '../../utils/useCreateConversation';
import ErrorCard from '../common/ErrorCard';

// Constants
const MAX_MESSAGE_LENGTH = 2000;
const SCROLL_DELAY = 100;
const UI_READY_DELAY = 800;
const AI_BUBBLE_DELAY = 900; // ms between AI bubbles

// Helper Functions
const generateMessageId = () => `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

const sanitizeMessage = (content) => {
  if (typeof content !== 'string') return '';
  return content.trim().substring(0, MAX_MESSAGE_LENGTH);
};

const categorizeError = (error) => {
  const errorLower = (error || '').toLowerCase();
  if (errorLower.includes('auth') || errorLower.includes('token')) return { type: 'auth', canRetry: true, severity: 'warning' };
  if (errorLower.includes('network') || errorLower.includes('connection') || errorLower.includes('timeout')) return { type: 'network', canRetry: true, severity: 'warning' };
  if (errorLower.includes('rate limit') || errorLower.includes('too many') || errorLower.includes('throttle')) return { type: 'rateLimit', canRetry: false, severity: 'warning' };
  if (errorLower.includes('server') || errorLower.includes('500') || errorLower.includes('503')) return { type: 'server', canRetry: true, severity: 'error' };
  if (errorLower.includes('validation') || errorLower.includes('invalid format')) return { type: 'validation', canRetry: true, severity: 'warning' };
  return { type: 'unknown', canRetry: true, severity: 'error' };
};

// Trauma-informed greetings for chat
const traumaGreetings = [
  "You're safe here. Ready when you are.",
  "Take your time—I'm here to listen.",
  "Whenever you're ready, I'm here for you.",
  "Your voice matters. Let's begin when you feel comfortable."
];

const ChatInterface = () => {
  // State Management
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [backendError, setBackendError] = useState('');
  const [uiReady, setUiReady] = useState(false);
  const [fallbackMessage, setFallbackMessage] = useState('');
  const { conversationId, createConversation, loading: creatingConversation } = useCreateConversation('text');
  const [errorCategory, setErrorCategory] = useState(null);

  // AI message queue and timer
  const aiBubbleQueue = useRef([]); // queue of { sender, content, id, timestamp, isFinal }
  const aiBubbleTimer = useRef(null);
  const isProcessingQueue = useRef(false);

  // Refs
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);
  const streamingServiceRef = useRef(null);
  const hasLoadedInitialMessages = useRef(false);
  
  // Memoized Values
  const charCount = useMemo(() => input.length, [input]);
  const isCharLimitWarning = useMemo(() => charCount > 1800, [charCount]);

  // Helper to get auth token
  const getToken = useCallback(() => localStorage.getItem('token') || sessionStorage.getItem('token'), []);

  // Effects
  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
    }
  }, [input]);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    const timer = setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, SCROLL_DELAY);
    return () => clearTimeout(timer);
  }, [messages, isLoading]);

  // Initialize conversation
  useEffect(() => {
    if (hasLoadedInitialMessages.current) {
      return;
    }
    hasLoadedInitialMessages.current = true;
    let isMounted = true;
    const initializeChat = async () => {
      try {
        let convoId = conversationId;
        if (!convoId) {
            const newConvo = await createConversation();
            console.log('Created new conversation:', newConvo);
            if (!newConvo || !newConvo._id) throw new Error("Failed to create conversation.");
            convoId = newConvo._id;
        }

        const token = getToken();
        if (!token) throw new Error('Authentication token not found.');
        
        // Load initial messages for the new conversation
        const messagesRes = await axios.get(`/api/v1/chat/messages/${convoId}`, {
          headers: { 'Authorization': `Bearer ${token}` },
          withCredentials: true
        });

        if(isMounted && messagesRes.data) {
           const loadedMessages = messagesRes.data.map(msg => ({
              id: msg._id || generateMessageId(),
              text: sanitizeMessage(msg.content),
              sender: msg.sender,
              timestamp: msg.createdAt || new Date().toISOString()
            }));
           // If there are no user or AI messages with non-empty content, add the cycling AI welcome message
           const hasUserOrAiMessage = loadedMessages.some(
             m => (m.sender === 'user' || m.sender === 'bot' || m.sender === 'ai') && m.text && m.text.trim() !== ''
           );
           if (!hasUserOrAiMessage) {
             // Cycle through greetings using localStorage
             const key = 'chat_greeting_idx';
             let idx = parseInt(localStorage.getItem(key) || '0', 10);
             if (isNaN(idx) || idx < 0 || idx >= traumaGreetings.length) idx = 0;
             const greeting = traumaGreetings[idx];
             const nextIdx = (idx + 1) % traumaGreetings.length;
             localStorage.setItem(key, nextIdx.toString());
             loadedMessages.push({
               id: generateMessageId(),
               sender: 'bot',
               content: greeting,
               timestamp: new Date().toISOString()
             });
           }
           setMessages(loadedMessages);
        }
        setTimeout(() => setUiReady(true), UI_READY_DELAY);

      } catch (err) {
        if (isMounted) {
          setBackendError('Failed to start a conversation. Please refresh the page.');
          setErrorCategory(categorizeError(err?.message || ''));
          console.error('Initialization error:', err);
          console.log('initializeChat error:', err);
        }
      }
    };
    initializeChat();
    return () => { isMounted = false; };
  }, [conversationId, createConversation, getToken]);
  
  useEffect(() => {
    return () => {
      if (streamingServiceRef.current) {
        streamingServiceRef.current.close();
      }
    };
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Helper to process the AI bubble queue
  const processAIBubbleQueue = useCallback(() => {
    if (isProcessingQueue.current) return;
    isProcessingQueue.current = true;
    const processNext = () => {
      if (aiBubbleQueue.current.length === 0) {
        isProcessingQueue.current = false;
        aiBubbleTimer.current = null;
        return;
      }
      const nextBubble = aiBubbleQueue.current.shift();
      setMessages(prev => [...prev, nextBubble]);
      aiBubbleTimer.current = setTimeout(processNext, AI_BUBBLE_DELAY);
    };
    processNext();
  }, []);

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (aiBubbleTimer.current) {
        clearTimeout(aiBubbleTimer.current);
        aiBubbleTimer.current = null;
      }
    };
  }, []);

  // Core Logic: Sending a message
  const handleSendMessage = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!input.trim() || isLoading) return;

    console.log('handleSendMessage called. conversationId:', conversationId, 'input:', input);

    const userMessage = { sender: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    setIsTyping(true);
    setFallbackMessage('');

    // Initialize the streaming service
    streamingServiceRef.current = new UnifiedStreamingService({
      onTextChunk: (textChunk) => {
        setIsTyping(false);
        setFallbackMessage('');
        let chunkText = '';
        if (typeof textChunk === 'object' && textChunk !== null) {
          chunkText = textChunk.content || textChunk.text || '';
        } else if (typeof textChunk === 'string') {
          chunkText = textChunk;
        }
        if (!chunkText) return;

        // Each chunk is already a complete sentence from the backend
        aiBubbleQueue.current.push({
          sender: 'bot',
          content: chunkText,
          id: generateMessageId(),
          timestamp: new Date().toISOString(),
          isFinal: true
        });
        processAIBubbleQueue();
      },
      onStreamEnd: () => {
        setIsLoading(false);
        setIsTyping(false);
        setFallbackMessage('');
      },
      onFallback: (message) => {
        setFallbackMessage(message);
        setIsTyping(false); // Stop typing indicator during fallback
      },
      onError: (error) => {
        console.error('Streaming error:', error);
        setMessages(prev => [...prev, { sender: 'bot', content: `sorry, something went wrong. please try again.` }]);
        setIsLoading(false);
        setIsTyping(false);
        setFallbackMessage('');
      }
    });

    streamingServiceRef.current.start('text', {
      conversationId,
      content: input,
    });
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Render Method
  return (
    <div className="improved-chat-interface">
      {creatingConversation && !backendError ? (
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <div>Starting conversation...</div>
        </div>
      ) : backendError ? (
        <div className="loading-state">
          <ErrorCard error={backendError} errorCategory={errorCategory} onRetry={() => window.location.reload()} retryCount={0} />
        </div>
      ) : (
        <>
          <header className="chat-header-enhanced">
            <div className="header-main">
              <div className="header-content">
                <h1 className="chat-title-enhanced">process</h1>
                <p className="chat-subtitle-enhanced">a safe place to feel and be heard</p>
              </div>
            </div>
            <div className="header-divider"></div>
          </header>
          <main className="chat-messages-enhanced" aria-live="polite">
            <div className="messages-list">
              {messages.map((msg, idx) => (
                <div key={msg.id || idx} className={`message-enhanced ${msg.sender}${msg.isError ? ' error' : ''}`.trim()}>
                  <div className="message-wrapper">
                    <div className="message-avatar">
                      {msg.sender === 'user' ? '🧑' : msg.sender === 'bot' ? '🤖' : '💬'}
                    </div>
                    <div className="message-bubble-enhanced">
                      <div className="message-content-enhanced">{msg.content || msg.text}</div>
                      <div className="message-meta">
                        <span className="message-time-enhanced">{msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString() : ''}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              {isTyping && (
                <div className="message-enhanced bot typing-message">
                  <div className="message-wrapper">
                    <div className="message-avatar">🤖</div>
                    <div className="message-bubble-enhanced typing-bubble">
                      <div className="typing-indicator-enhanced">
                        <span></span><span></span><span></span>
                      </div>
                      <span className="typing-text">typing...</span>
                    </div>
                  </div>
                </div>
              )}
              {fallbackMessage && <div className="fallback-indicator">{fallbackMessage}</div>}
              <div ref={messagesEndRef} />
            </div>
          </main>
          <footer className="chat-input-enhanced">
            <form onSubmit={handleSendMessage} className="input-form-enhanced">
              <div className="input-wrapper-enhanced">
                <textarea
                  ref={textareaRef}
                  className="message-input-enhanced"
                  placeholder="share what's on your mind..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  rows="1"
                  disabled={isLoading || !uiReady}
                  aria-label="Chat message input"
                />
                <button
                  type="submit"
                  className="send-button-enhanced"
                  disabled={!input.trim() || isLoading || !uiReady}
                  aria-label="Send message"
                >
                  <span className="send-label">Send</span>
                  {isLoading && <span className="spinner"></span>}
                </button>
              </div>
              <div className={`char-counter${isCharLimitWarning ? ' warning' : ''}`} aria-live="polite">
                {charCount} / {MAX_MESSAGE_LENGTH}
              </div>
              <div className="input-footer">
                <span className="input-hint-enhanced">Press Enter to send</span>
              </div>
            </form>
          </footer>
        </>
      )}
    </div>
  );
};

export default ChatInterface;