import React, { useState, useRef, useEffect } from 'react';
import Navbar from './navigation/Navbar';
import PulsingHeart from './PulsingHeart';
import { useVoice, VOICE_STATUSES } from '../contexts/VoiceContext';
import VoiceErrorBoundary from './VoiceErrorBoundary';
import './VoicePage.css';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

// Toolbar icons (simple SVGs for demo)
const MicIcon = ({ active }) => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
    <rect
      x="9"
      y="3"
      width="6"
      height="10"
      rx="3"
      fill={active ? '#4A90E2' : '#fff'}
    />
    <path
      d="M6 11v1a6 6 0 0 0 12 0v-1M12 18v3M9 21h6"
      stroke={active ? '#4A90E2' : '#fff'}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
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

// Helper: Retry wrapper for axios requests
const axiosWithRetry = async (axiosCall, retries = 3, delay = 1000) => {
  for (let i = 0; i < retries; i++) {
    try {
      return await axiosCall();
    } catch (err) {
      if (i === retries - 1) throw err;
      await new Promise(res => setTimeout(res, delay));
    }
  }
};

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
    aiReturn,
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
  const audioRef = useRef(null);
  const [showExitModal, setShowExitModal] = useState(false);
  const [pendingExit, setPendingExit] = useState(false);
  const [showMicTooltip, setShowMicTooltip] = useState(false);
  const [conversationId, setConversationId] = useState(null);
  const [speechResult, setSpeechResult] = useState(null);
  const [isSpeak, setIsSpeak] = useState(false);
  

  const navigate = useNavigate();

  const getToken = () => {
    return localStorage.getItem('token') || sessionStorage.getItem('token');
  };
  // Create Conversation
  useEffect(() => {
    const createConversation = async () => {
      try {
        const token = getToken();
        if (!token) {
          console.log("not logged in")
          return;
        }
        const res = await fetch('/api/chat/conversations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`} ,
          body: JSON.stringify({}),
        });
        const data = await res.json();
        setConversationId(data.id);
        console.log('Created conversation:', data.id);
      } catch (err) {
        console.error('Failed to create conversation:', err);
      }
    };
  
    createConversation();
  }, []);

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
    const callClaude = async () => {
      try {
        const token = getToken();
        if (!token) {
          console.log("not logged in")
          return;
        }
        const response = await axiosWithRetry(() =>
          axios.post('/api/chat/send', { content: speechResult.transcript, conversationId: conversationId }, {
            headers: { 'Content-Type': 'application/json' , 'Authorization': `Bearer ${token}` },
          })
        );
        dispatch(actions.setAiResponse(response.data.message.content)); // adjust if key is different
        dispatch(actions.setStatus(VOICE_STATUSES.SPEAKING));
        setSpokenIndex(0);
        setIsTransitioning(false);
        setSpeechResult(null);
      } catch (error) {
        console.error('Request failed:', {
          message: error.message,
          status: error.response?.status,
          data: error.response?.data,
        });

        dispatch(actions.setError(error.message, 'API_ERROR', true));
        setIsTransitioning(false);
        setSpeechResult(null);
      }
    };
  
    if (status === VOICE_STATUSES.PROCESSING && currentTranscript) {
      setIsTransitioning(true);
      callClaude();
      
    }
  
    if (status === VOICE_STATUSES.IDLE) {
      dispatch(actions.setAiResponse(''));
      dispatch(actions.setAiReturn(''));
      dispatch(actions.setTranscript(''));
      setSpokenIndex(0);
    }
  }, [status, currentTranscript, dispatch, actions]);
  
  //play audio
  async function playAndWait(audio) {
    return new Promise((resolve) => {
      audio.onended = () => resolve();
      audio.play();
    });
  }

  // CallElevenLabs
  useEffect(() => {
    const speakWithElevenLabs = async () => {
      try {
        const token = getToken();
        if (!token) {
          console.warn("No token available");
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
              responseType: 'blob', // Important to get audio data
            }
          )
        );
       
        const audioBlob = new Blob([response.data], { type: 'audio/mpeg' });
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);
        audioRef.current = audio;
        console.log(isSpeak)
        console.log(status)
      
        setIsSpeak(true);
        dispatch(actions.setAiReturn(aiResponse));
        await playAndWait(audio);
        

        dispatch(actions.setStatus(VOICE_STATUSES.IDLE));
        setIsSpeak(false);
        dispatch(actions.setAiResponse(''));
        dispatch(actions.setAiReturn(''));
        dispatch(actions.setTranscript(''));
      } catch (err) {
        console.error("TTS playback failed", err);
        setIsSpeak(false);
        dispatch(actions.setError(err.message || 'TTS failed', 'AUDIO_ERROR', true));
        dispatch(actions.setStatus(VOICE_STATUSES.IDLE));
        dispatch(actions.setAiResponse(''));
        dispatch(actions.setAiReturn(''));
        dispatch(actions.setTranscript(''));
      }
    };
  
    if (status === VOICE_STATUSES.SPEAKING && aiResponse) {
      speakWithElevenLabs();
    }
  }, [status, aiResponse, dispatch, actions]);
  

  // Update live region for accessibility
  useEffect(() => {
    if (liveRegionRef.current && aiReturn) {
      liveRegionRef.current.textContent = aiReturn;
    }
  }, [aiReturn]);

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
          // const result = await mockSpeechToText(audioBlob);
          
          const formData = new FormData();
          formData.append('audio', audioBlob, 'recording.wav');

          const response = await fetch('/api/v1/voicerecord', {
            method: 'POST',
            body: formData,
          });

          if (!response.ok) {
            throw new Error('Server returned an error while transcribing.');
          }

          const result = await response.json();
          setSpeechResult(result)


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

    if (status === VOICE_STATUSES.IDLE || status === VOICE_STATUSES.ERROR || (status === VOICE_STATUSES.SPEAKING && isSpeak)) {
      if(status === VOICE_STATUSES.SPEAKING && isSpeak) {
        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current = null;
        }
        setIsSpeak(false);
        dispatch(actions.setAiResponse(''));
        dispatch(actions.setAiReturn(''));
        dispatch(actions.setTranscript(''));
      }
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
  
  const getHeartState = (status, isSpeak) => {
    if (status === VOICE_STATUSES.SPEAKING) {
      return isSpeak ? VOICE_STATUSES.SPEAKING : VOICE_STATUSES.PROCESSING;
    }
    return status;
  };
  // Render AI response with word highlighting
  // const renderAiText = () => {
  //   if (loading || status === VOICE_STATUSES.PROCESSING) {
  //     return <span className="ai-loading">...</span>;
  //   }
    
  //   if (error) {
  //     return <span className="ai-error">{error.message}</span>;
  //   }
    
  //   if (!aiResponse) return null;
    
  //   const words = aiResponse.split(' ');
  //   return words.map((word, i) => (
  //     <span
  //       key={i}
  //       className={
  //         i < spokenIndex 
  //           ? 'spoken' 
  //           : i === spokenIndex 
  //           ? 'speaking' 
  //           : ''
  //       }
  //       aria-current={i === spokenIndex ? 'true' : undefined}
  //     >
  //       {word + ' '}
  //     </span>
  //   ));
  // };

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
        if(isSpeak)
          return 'Speaking...';
        else
          return 'Processing...';
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
            {/* Status Message */}
            <div className="voice-status" id="voice-status" aria-live="polite">
              {getStatusMessage()}
            </div>
  
            {/* Pulsing Heart */}
            <PulsingHeart
              key={getHeartState(status,isSpeak)} // force remount on state change
              state={getHeartState(status,isSpeak)}
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
  
          {/* Toolbar */}
          <aside className="voice-toolbar" aria-label="Toolbar">
            <button
              className="toolbar-btn"
              aria-label={isRecording ? 'Stop microphone' : 'Start microphone'}
              aria-pressed={isRecording}
              onClick={handleMicToggle}
              disabled={isTransitioning}
              tabIndex={0}
            >
              <MicIcon active={status === VOICE_STATUSES.LISTENING} />
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
  
        {/* Exit Confirmation Modal */}
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