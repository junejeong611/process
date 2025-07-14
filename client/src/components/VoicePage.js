import React, { useState, useRef, useEffect, useCallback } from 'react';
import Navbar from './navigation/Navbar';
import PulsingHeart from './PulsingHeart';
import { useVoice, VOICE_STATUSES } from '../contexts/VoiceContext';
import VoiceErrorBoundary from './VoiceErrorBoundary';
import Icon from './Icon';
import './VoicePage.css';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import ErrorCard from './ErrorCard';
import { categorizeError } from '../utils/errorUtils';
import AuthErrorCard from './AuthErrorCard';

// Enhanced microphone icon using the standardized Icon component
const MicIcon = ({ active, size = 32 }) => (
  <Icon 
    name={active ? "micActive" : "mic"} 
    size={size}
    style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))' }}
  />
);

// Helper: Enhanced retry with gentle feedback
const axiosWithRetry = async (axiosCall, retries = 3, baseDelay = 1000) => {
  for (let i = 0; i < retries; i++) {
    try {
      return await axiosCall();
    } catch (err) {
      if (i === retries - 1) throw err;
      const delay = baseDelay * Math.pow(1.5, i); // Gentle exponential backoff
      await new Promise(res => setTimeout(res, delay));
    }
  }
};

// Gentle confirmation modal with trauma-informed language
function GentleConfirmModal({ open, onConfirm, onCancel, message }) {
  useEffect(() => {
    if (open) {
      // Focus management for accessibility
      const confirmBtn = document.querySelector('.gentle-modal .primary-action');
      if (confirmBtn) {
        setTimeout(() => confirmBtn.focus(), 150);
      }
    }
  }, [open]);

  if (!open) return null;
  
  return (
    <div className="gentle-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <div className="gentle-modal">
        <div className="gentle-modal-title" id="modal-title">take a moment</div>
        <div className="gentle-modal-message">{message}</div>
        <div className="gentle-modal-actions">
          <button 
            className="gentle-modal-btn primary-action" 
            onClick={onConfirm}
            aria-describedby="modal-title"
          >
            yes, i'm ready
          </button>
          <button 
            className="gentle-modal-btn secondary-action" 
            onClick={onCancel}
          >
            stay here
          </button>
        </div>
      </div>
    </div>
  );
}

const VoicePage = () => {
  const { 
    status, 
    isRecording,
    currentTranscript,
    aiResponse,
    aiReturn,
    error,
    loading,
    dispatch,
    actions
  } = useVoice();

  // State management
  const [spokenIndex, setSpokenIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [showExitModal, setShowExitModal] = useState(false);
  const [conversationId, setConversationId] = useState(null);
  const [speechResult, setSpeechResult] = useState(null);
  const [isSpeak, setIsSpeak] = useState(false);
  const [showMicTooltip, setShowMicTooltip] = useState(false);

  // Refs for cleanup and accessibility
  const liveRegionRef = useRef(null);
  const timersRef = useRef([]);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const audioRef = useRef(null);

  const navigate = useNavigate();

  const getToken = useCallback(() => {
    return localStorage.getItem('token') || sessionStorage.getItem('token');
  }, []);

  // Enhanced error handling with gentle, trauma-informed messages
  const handleError = useCallback((error, context = '') => {
    console.error(`Error in ${context}:`, error);
    
    let userMessage = 'something unexpected happened. take your time - you can try again whenever you feel ready.';
    
    if (error.name === 'NotAllowedError') {
      userMessage = 'microphone access is needed for voice features. you can enable it in your browser settings when you feel comfortable.';
    } else if (error.message?.includes('network') || error.message?.includes('Network')) {
      userMessage = 'having trouble connecting right now. your conversation is safe - please check your connection when you\'re ready.';
    } else if (error.message?.includes('speech') || error.message?.includes('transcrib')) {
      userMessage = 'having trouble understanding your voice right now. this happens sometimes - feel free to try speaking again.';
    } else if (error.message?.includes('AI') || error.message?.includes('service')) {
      userMessage = 'our response system is taking a break. you\'re doing nothing wrong - please try again in a moment.';
    }
    
    dispatch(actions.setError(userMessage, error.name || 'GENERAL_ERROR', true));
  }, [dispatch, actions]);

  // Create conversation
  useEffect(() => {
    const createConversation = async () => {
      try {
        const token = getToken();
        if (!token) {
          console.log("No authentication token found");
          return;
        }
        const res = await fetch('/api/chat/conversations', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json', 
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ type: 'voice' }),
        });
        const data = await res.json();
        setConversationId(data.id);
        console.log('Created conversation:', data.id);
      } catch (err) {
        console.error('Failed to create conversation:', err);
        handleError(err, 'conversation creation');
      }
    };
  
    createConversation();
  }, [getToken, handleError]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      timersRef.current.forEach(timer => clearTimeout(timer));
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  // Handle status changes and API workflow
  useEffect(() => {
    const processTranscript = async () => {
      try {
        const token = getToken();
        if (!token) {
          console.log("Authentication required");
          return;
        }
        
        setIsTransitioning(true);
        
        const response = await axiosWithRetry(() =>
          axios.post('/api/chat/send', { 
            content: speechResult.transcript, 
            conversationId: conversationId 
          }, {
            headers: { 
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}` 
            },
          })
        );
        
        dispatch(actions.setAiResponse(response.data.message.content));
        dispatch(actions.setStatus(VOICE_STATUSES.SPEAKING));
        setSpokenIndex(0);
        setIsTransitioning(false);
        setSpeechResult(null);
      } catch (error) {
        console.error('Request failed:', error);
        handleError(error, 'AI response');
        setIsTransitioning(false);
        setSpeechResult(null);
      }
    };
  
    if (status === VOICE_STATUSES.PROCESSING && speechResult?.transcript) {
      processTranscript();
    }
  
    if (status === VOICE_STATUSES.IDLE) {
      dispatch(actions.setAiResponse(''));
      dispatch(actions.setAiReturn(''));
      dispatch(actions.setTranscript(''));
      setSpokenIndex(0);
    }
  }, [status, speechResult, conversationId, dispatch, actions, getToken, handleError]);
  
  // Audio playback helper
  async function playAndWait(audio) {
    return new Promise((resolve) => {
      audio.onended = () => {
        console.log('Audio playback ended');
        resolve();
      };
      audio.onerror = (e) => {
        console.error('Audio playback error:', e);
        resolve();
      };
      audio.play().then(() => {
        console.log('Audio playback started');
      }).catch((err) => {
        console.error('Audio play() promise rejected:', err);
        resolve();
      });
    });
  }

  // Cleanup on navigation
  useEffect(() => {
    return () => {
      dispatch(actions.setStatus(VOICE_STATUSES.IDLE));
      dispatch(actions.setAiResponse(''));
      dispatch(actions.setAiReturn(''));
      dispatch(actions.setTranscript(''));
      setIsSpeak(false);
    };
  }, [dispatch, actions]);

  // Text-to-speech with ElevenLabs
  useEffect(() => {
    let audio;

    const speakWithElevenLabs = async () => {
      try {
        const token = getToken();
        if (!token) {
          console.warn("No authentication token");
          return;
        }

        const response = await axiosWithRetry(() =>
          axios.post(
            '/api/chat/elevenlabs',
            { text: aiResponse },
            {
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
              },
              responseType: 'blob',
              timeout: 30000, // 30 second timeout
            }
          )
        );

        const audioBlob = new Blob([response.data], { type: 'audio/mpeg' });
        const audioUrl = URL.createObjectURL(audioBlob);
        audio = new Audio(audioUrl);
        audioRef.current = audio;

        setIsSpeak(true);
        dispatch(actions.setAiReturn(aiResponse));
        await playAndWait(audio);

        // Clean up
        URL.revokeObjectURL(audioUrl);
        dispatch(actions.setStatus(VOICE_STATUSES.IDLE));
        setIsSpeak(false);
        dispatch(actions.setAiResponse(''));
        dispatch(actions.setAiReturn(''));
        dispatch(actions.setTranscript(''));
      } catch (err) {
        console.error("TTS playback failed", err);
        setIsSpeak(false);
        handleError(err, 'voice playback');
        dispatch(actions.setStatus(VOICE_STATUSES.IDLE));
        dispatch(actions.setAiResponse(''));
        dispatch(actions.setAiReturn(''));
        dispatch(actions.setTranscript(''));
      }
    };

    if (status === VOICE_STATUSES.SPEAKING && aiResponse && !isSpeak) {
      speakWithElevenLabs();
    }

    // No cleanup here!
  }, [status, aiResponse, isSpeak, dispatch, actions, getToken, handleError]);

  // Only pause audio on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        console.log('Pausing audio due to unmount');
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
    };
  }, []);

  // Update live region for screen readers
  useEffect(() => {
    if (liveRegionRef.current && aiReturn) {
      liveRegionRef.current.textContent = aiReturn;
    }
  }, [aiReturn]);

  // Start recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      // Try 'audio/webm' for better compatibility
      let options = { mimeType: 'audio/webm' };
      if (!MediaRecorder.isTypeSupported(options.mimeType)) {
        options = {};
      }
      mediaRecorderRef.current = new MediaRecorder(stream, options);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        
        // Stop all tracks to free up microphone
        stream.getTracks().forEach(track => track.stop());
        
        try {
          dispatch(actions.setStatus(VOICE_STATUSES.PROCESSING));
          
          const formData = new FormData();
          formData.append('audio', audioBlob, 'recording.webm');

          const response = await fetch('/api/v1/voicerecord', {
            method: 'POST',
            body: formData,
          });

          if (!response.ok) {
            throw new Error('unable to process your voice right now. please try again when you\'re ready.');
          }

          const result = await response.json();
          setSpeechResult(result);
          dispatch(actions.setTranscript(result.transcript));
        } catch (error) {
          handleError(error, 'voice processing');
        }
      };

      mediaRecorderRef.current.start();
      dispatch(actions.setRecording(true));
      dispatch(actions.setStatus(VOICE_STATUSES.LISTENING));

    } catch (error) {
      handleError(error, 'microphone access');
    }
  };

  // Stop recording
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      dispatch(actions.setRecording(false));
    }
  }, [dispatch, actions]);

  const handleMicToggle = useCallback(() => {
    if (status === VOICE_STATUSES.LISTENING) {
      stopRecording();
    } else {
      startRecording();
    }
  }, [status, stopRecording, startRecording]);

  const getHeartState = (status, isSpeak) => {
    if (status === VOICE_STATUSES.SPEAKING && isSpeak) {
      return 'speaking';
    } else if (status === VOICE_STATUSES.LISTENING) {
      return 'listening';
    } else if (status === VOICE_STATUSES.PROCESSING) {
      return 'processing';
    } else if (status === VOICE_STATUSES.IDLE) {
      return 'idle';
    }
    return 'idle';
  };

  const getStatusMessage = () => {
    switch (status) {
      case VOICE_STATUSES.SPEAKING:
        return "sharing a response...";
      case VOICE_STATUSES.LISTENING:
        return "i'm listening...";
      case VOICE_STATUSES.PROCESSING:
        return "processing...";
      case VOICE_STATUSES.IDLE:
      default:
        return "tap to start listening...";
    }
  };

  const confirmExit = () => {
    setShowExitModal(false);
    dispatch(actions.setStatus(VOICE_STATUSES.IDLE));
    dispatch(actions.setAiResponse(''));
    dispatch(actions.setAiReturn(''));
    dispatch(actions.setTranscript(''));
    setIsSpeak(false);
  };

  const cancelExit = () => {
    setShowExitModal(false);
  };

  const handleRetry = () => {
    // This function is not yet implemented in the original code,
    // but it's part of the new ErrorCard component's expected behavior.
    // For now, it will just log a message.
    console.log("Retry button clicked. No specific retry logic implemented yet.");
    // In a real scenario, you might re-initialize the conversation or
    // re-attempt the last failed API call.
  };

  return (
    <VoiceErrorBoundary>
      <div className="voice-bg">
        <main className="voice-main voice-main-centered" role="main">
          <section className="voice-center" aria-label="Voice interaction area">
            {/* Error Header (gentle, only if error) */}
            {error && (
              <div className="error-container">
                <AuthErrorCard />
              </div>
            )}
            {/* Status Message (hide if error) */}
            {!error && (
              <div className={`voice-status${status ? ' ' + status : ''}`} id="voice-status" aria-live="polite">
                {getStatusMessage()}
              </div>
            )}

            {/* Pulsing Heart */}
            <PulsingHeart
              key={getHeartState(status, isSpeak)}
              state={getHeartState(status, isSpeak)}
              onClick={handleMicToggle}
              size={typeof window !== 'undefined' && window.innerWidth < 600 ? 150 : 200}
              disabled={isTransitioning}
              className="voice-heart"
            />

            {/* Glow line */}
            <div className="heart-mic-glow" aria-hidden="true"></div>

            {/* AI Response */}
            <div
              className="voice-ai-text"
              aria-live="polite"
              aria-atomic="false"
              ref={liveRegionRef}
              tabIndex={0}
            >
              {/* {renderAiText()} */}
            </div>

            {/* Bottom Mic Button */}
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
        </main>
        {/* Gentle Exit Confirmation Modal */}
        <GentleConfirmModal
          open={showExitModal}
          onConfirm={confirmExit}
          onCancel={cancelExit}
          message="would you like to end this conversation? your progress and insights are valuable."
        />
        {/* Screen reader announcements */}
        <div className="sr-only" aria-live="polite" id="status-announcer">
          {/* This will announce status changes to screen readers */}
        </div>
      </div>
    </VoiceErrorBoundary>
  );
};

export default VoicePage;