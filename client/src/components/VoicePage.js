import React, { useState, useRef, useEffect } from 'react';
import Navbar from './navigation/Navbar';
import PulsingHeart from './PulsingHeart';
import { useVoice, VOICE_STATUSES } from '../contexts/VoiceContext';
import VoiceErrorBoundary from './VoiceErrorBoundary';
import './VoicePage.css';
import { useNavigate } from 'react-router-dom';

// Toolbar icons (simple SVGs for demo)
const MicIcon = ({ active }) => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
    <path 
      d="M12 15a3 3 0 0 0 3-3V7a3 3 0 0 0-6 0v5a3 3 0 0 0 3 3zm5-3a1 1 0 1 0-2 0 5 5 0 0 1-10 0 1 1 0 1 0-2 0 7 7 0 0 0 14 0zM11 19h2v2h-2v-2z" 
      fill={active ? '#4A90E2' : '#6b7a90'} 
    />
  </svg>
);

const AttachIcon = () => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
    <path 
      d="M17 7v7a5 5 0 0 1-10 0V7a3 3 0 0 1 6 0v7a1 1 0 0 1-2 0V7h-2v7a3 3 0 0 0 6 0V7a5 5 0 0 0-10 0v7a7 7 0 0 0 14 0V7h-2z" 
      fill="#6b7a90" 
    />
  </svg>
);

const MinimizeIcon = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
    <rect x="5" y="11" width="14" height="2" rx="1" fill="#6b7a90"/>
  </svg>
);

const CloseIcon = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
    <path d="M6 6l12 12M6 18L18 6" stroke="#dc3545" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

// Mock API functions
const mockSpeechToText = (audioBlob) =>
  new Promise((resolve, reject) => {
    setTimeout(() => {
      if (Math.random() < 0.1) {
        reject(new Error('Mock: Speech-to-text service unavailable'));
      } else {
        resolve({ transcript: 'I\'ve been feeling really anxious lately about work and life in general.' });
      }
    }, 1500);
  });

const mockClaudeResponse = (transcript) =>
  new Promise((resolve, reject) => {
    setTimeout(() => {
      if (Math.random() < 0.05) {
        reject(new Error('Mock: AI service temporarily unavailable'));
      } else {
        const responses = [
          "I hear you, and I want you to know that feeling anxious is completely valid. Many people experience anxiety about work and life. Would you like to talk about what specifically is making you feel this way?",
          "Thank you for sharing that with me. Anxiety can feel overwhelming, but you're not alone in this. What aspect of work or life is weighing on you most right now?",
          "I'm glad you're reaching out. It takes courage to acknowledge these feelings. Remember that it's okay to feel anxious - it's a natural human response. What would feel most helpful for you right now?",
          "Your feelings are important and valid. Anxiety about work and life is more common than you might think. Would it help to explore some strategies for managing these feelings together?"
        ];
        resolve(responses[Math.floor(Math.random() * responses.length)]);
      }
    }, 2000);
  });

// Blue-themed confirmation modal
function BlueConfirmModal({ open, onConfirm, onCancel, message }) {
  if (!open) return null;
  return (
    <div className="blue-modal-backdrop" tabIndex={-1}>
      <div className="blue-modal" role="dialog" aria-modal="true" aria-labelledby="blue-modal-title">
        <div className="blue-modal-title" id="blue-modal-title">End Conversation</div>
        <div className="blue-modal-message">{message}</div>
        <div className="blue-modal-actions">
          <button className="blue-modal-btn confirm" onClick={onConfirm} autoFocus>Yes, end</button>
          <button className="blue-modal-btn cancel" onClick={onCancel}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

const VoicePage = () => {
  // Use the custom hook from enhanced context
  const { 
    status, 
    isRecording,
    currentTranscript,
    aiResponse,
    error,
    loading,
    dispatch,
    actions
  } = useVoice();

  // Local state for UI interactions
  const [spokenIndex, setSpokenIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const liveRegionRef = useRef(null);
  const timersRef = useRef([]);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const [showExitModal, setShowExitModal] = useState(false);
  const [pendingExit, setPendingExit] = useState(false);
  const [showMicTooltip, setShowMicTooltip] = useState(false);

  const navigate = useNavigate();

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      timersRef.current.forEach(timer => clearTimeout(timer));
      // Stop any ongoing recording
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  // Handle status changes and simulate API workflow
  useEffect(() => {
    if (status === VOICE_STATUSES.PROCESSING && currentTranscript) {
      setIsTransitioning(true);
      
      // Simulate Claude AI processing
      mockClaudeResponse(currentTranscript)
        .then(response => {
          dispatch(actions.setAiResponse(response));
          dispatch(actions.setStatus(VOICE_STATUSES.SPEAKING));
          setSpokenIndex(0);
          setIsTransitioning(false);
        })
        .catch(error => {
          dispatch(actions.setError(error.message, 'API_ERROR', true));
          setIsTransitioning(false);
        });
    }
    
    if (status === VOICE_STATUSES.IDLE) {
      dispatch(actions.setAiResponse(''));
      dispatch(actions.setTranscript(''));
      setSpokenIndex(0);
    }
  }, [status, currentTranscript, dispatch, actions]);

  // Handle TTS word-by-word highlighting
  useEffect(() => {
    if (status === VOICE_STATUSES.SPEAKING && aiResponse) {
      const words = aiResponse.split(' ');
      if (spokenIndex < words.length) {
        const timer = setTimeout(() => {
          setSpokenIndex(spokenIndex + 1);
          
          // When finished speaking, return to idle
          if (spokenIndex + 1 >= words.length) {
            const finishTimer = setTimeout(() => {
              dispatch(actions.setStatus(VOICE_STATUSES.IDLE));
            }, 1000);
            timersRef.current.push(finishTimer);
          }
        }, 350);
        
        timersRef.current.push(timer);
        return () => clearTimeout(timer);
      }
    }
  }, [status, aiResponse, spokenIndex, dispatch, actions]);

  // Update live region for accessibility
  useEffect(() => {
    if (liveRegionRef.current && aiResponse) {
      liveRegionRef.current.textContent = aiResponse;
    }
  }, [aiResponse]);

  // Start recording function
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        
        // Stop all tracks to free up microphone
        stream.getTracks().forEach(track => track.stop());
        
        // Process the audio
        try {
          dispatch(actions.setStatus(VOICE_STATUSES.PROCESSING));
          const result = await mockSpeechToText(audioBlob);
          dispatch(actions.setTranscript(result.transcript));
        } catch (error) {
          dispatch(actions.setError(error.message, 'API_ERROR', true));
        }
      };

      mediaRecorderRef.current.start();
      dispatch(actions.setRecording(true));
      dispatch(actions.setStatus(VOICE_STATUSES.LISTENING));

    } catch (error) {
      if (error.name === 'NotAllowedError') {
        dispatch(actions.setError(
          'Microphone access denied. Please allow microphone access to use voice features.',
          'PERMISSION_DENIED',
          true
        ));
      } else {
        dispatch(actions.setError(error.message, 'AUDIO_ERROR', true));
      }
    }
  };

  // Stop recording function
  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      dispatch(actions.setRecording(false));
    }
  };

  // Main mic toggle handler
  const handleMicToggle = () => {
    if (isTransitioning) return;
    
    if (status === VOICE_STATUSES.IDLE || status === VOICE_STATUSES.ERROR) {
      startRecording();
    } else if (status === VOICE_STATUSES.LISTENING) {
      stopRecording();
    } else {
      // Reset to idle for other states
      dispatch(actions.setStatus(VOICE_STATUSES.IDLE));
    }
  };

  const handleAttachment = () => {
    console.log('Attachment feature coming soon!');
  };

  const handleMinimize = () => {
    if (window.electronAPI) {
      window.electronAPI.minimize();
    } else {
      console.log('Minimize window');
    }
  };

  const handleClose = () => {
    if (window.electronAPI) {
      window.electronAPI.close();
    } else {
      console.log('Close window');
    }
  };

  // End chat handler for exit button
  const handleEndChat = () => {
    stopRecording();
    if (currentTranscript || aiResponse) {
      setShowExitModal(true);
      setPendingExit(true);
      return;
    }
    navigate('/exit-thanks');
  };

  const confirmExit = () => {
    setShowExitModal(false);
    setPendingExit(false);
    navigate('/exit-thanks');
  };

  const cancelExit = () => {
    setShowExitModal(false);
    setPendingExit(false);
  };

  // Render AI response with word highlighting
  const renderAiText = () => {
    if (loading || status === VOICE_STATUSES.PROCESSING) {
      return <span className="ai-loading">...</span>;
    }
    
    if (error) {
      return <span className="ai-error">{error.message}</span>;
    }
    
    if (!aiResponse) return null;
    
    const words = aiResponse.split(' ');
    return words.map((word, i) => (
      <span
        key={i}
        className={
          i < spokenIndex 
            ? 'spoken' 
            : i === spokenIndex 
            ? 'speaking' 
            : ''
        }
        aria-current={i === spokenIndex ? 'true' : undefined}
      >
        {word + ' '}
      </span>
    ));
  };

  // Status messages
  const getStatusMessage = () => {
    switch (status) {
      case VOICE_STATUSES.IDLE:
        return 'Tap to start listening...';
      case VOICE_STATUSES.LISTENING:
        return 'Listening...';
      case VOICE_STATUSES.PROCESSING:
        return 'Processing...';
      case VOICE_STATUSES.SPEAKING:
        return 'Speaking...';
      case VOICE_STATUSES.ERROR:
        return 'Something went wrong. Tap to try again.';
      default:
        return 'Tap to start listening...';
    }
  };

  return (
    <VoiceErrorBoundary>
      <div className="voice-bg">
        <Navbar />
        <main className="voice-main" role="main">
          <section className="voice-center" aria-label="Voice interaction area">
            <div className="voice-status" id="voice-status" aria-live="polite">
              {getStatusMessage()}
            </div>
            <PulsingHeart
              state={status}
              onClick={handleMicToggle}
              size={window.innerWidth < 600 ? 150 : 200}
              disabled={isTransitioning}
              className="voice-heart"
            />
            {/* Blue glow connector between heart and mic button */}
            <div className="heart-mic-glow" aria-hidden="true"></div>
            <div
              className="voice-ai-text"
              aria-live="polite"
              aria-atomic="false"
              ref={liveRegionRef}
              tabIndex={0}
            >
              {renderAiText()}
            </div>
            {/* Bottom Microphone Button */}
            <div style={{ position: 'relative', width: 'fit-content', margin: '0 auto' }}>
              <button
                className={`bottom-mic-button${status === VOICE_STATUSES.LISTENING ? ' active' : ''}`}
                onClick={handleMicToggle}
                aria-label={status === VOICE_STATUSES.LISTENING ? 'Stop recording' : 'Start recording'}
                disabled={isTransitioning}
                type="button"
                tabIndex={0}
                onMouseEnter={() => setShowMicTooltip(true)}
                onMouseLeave={() => setShowMicTooltip(false)}
                onFocus={() => setShowMicTooltip(true)}
                onBlur={() => setShowMicTooltip(false)}
              >
                <MicIcon active={status === VOICE_STATUSES.LISTENING} />
                {(loading || status === VOICE_STATUSES.PROCESSING) && (
                  <span className="mic-spinner" aria-label="Loading" />
                )}
              </button>
              {showMicTooltip && status !== VOICE_STATUSES.LISTENING && (
                <span className="mic-tooltip" role="tooltip">Tap to record</span>
              )}
            </div>
          </section>
          
          <aside className="voice-toolbar" aria-label="Toolbar">
            <button
              className="toolbar-btn"
              aria-label={isRecording ? 'Stop microphone' : 'Start microphone'}
              aria-pressed={isRecording}
              onClick={handleMicToggle}
              disabled={isTransitioning}
              tabIndex={0}
            >
              <MicIcon active={isRecording} />
            </button>
            
            <button
              className="toolbar-btn"
              aria-label="Attach file"
              onClick={handleAttachment}
              tabIndex={0}
            >
              <AttachIcon />
            </button>
            
            <div className="toolbar-window-controls">
              <button
                className="toolbar-btn"
                aria-label="Minimize window"
                onClick={handleMinimize}
                tabIndex={0}
              >
                <MinimizeIcon />
              </button>
              
              <button
                className="toolbar-btn"
                aria-label="Close window"
                onClick={handleClose}
                tabIndex={0}
              >
                <CloseIcon />
              </button>
            </div>
          </aside>
        </main>
        {/* Bottom Right Exit Button */}
        <button
          className="exit-button"
          aria-label="End conversation and exit"
          onClick={handleEndChat}
          type="button"
          tabIndex={0}
        >
          <CloseIcon />
        </button>
        <BlueConfirmModal
          open={showExitModal}
          onConfirm={confirmExit}
          onCancel={cancelExit}
          message="Are you sure you want to end this conversation?"
        />
      </div>
    </VoiceErrorBoundary>
  );
};

export default VoicePage;