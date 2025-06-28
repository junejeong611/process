import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import './VoicePage.css';
import PulsingHeart from './PulsingHeart';
import UnifiedStreamingService from '../services/streamingService';
import useCreateConversation from '../utils/useCreateConversation';
import AnimatedSubtitles from './chat/AnimatedSubtitles';

const traumaGreetings = [
  "you are safe here, ready when you are",
  "take your time, I'm here to listen",
  "I'm here for you",
  "this is a judgment-free space",
  "how are you feeling now?"
];

const VoicePage = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [isResponding, setIsResponding] = useState(false);
  const [isFallbackActive, setIsFallbackActive] = useState(false);
  const [fallbackText, setFallbackText] = useState('');
  const [subtitles, setSubtitles] = useState([]);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const audioPlayerRef = useRef(null); // For <audio> element
  const audioQueueRef = useRef([]); // To queue blobs for playback
  const subtitleQueueRef = useRef([]); // To queue completed subtitle sentences
  const isPlayingRef = useRef(false);
  
  // --- Web Audio API Refs ---
  const audioContextRef = useRef(null);
  const decodedAudioQueueRef = useRef([]);
  const nextStartTimeRef = useRef(0);
  const isPlayingAudioRef = useRef(false);
  const pendingSubtitleLinesRef = useRef([]); // Buffer for subtitle lines (not used in new logic)
  const currentSentenceRef = useRef([]); // Buffer for current sentence words
  // -------------------------

  const { conversationId, createConversation, loading: creatingConversation } = useCreateConversation('voice');
  const streamingServiceRef = useRef(null);
  const [greeting, setGreeting] = useState(traumaGreetings[0]);

  const getAudioContext = () => {
    if (!audioContextRef.current) {
        const context = new (window.AudioContext || window.webkitAudioContext)();
        audioContextRef.current = context;
    }
    return audioContextRef.current;
  };
  
  const schedulePlayback = useCallback(() => {
    if (decodedAudioQueueRef.current.length === 0) {
      isPlayingAudioRef.current = false;
      setIsResponding(false); // Finished playing all buffered audio
      return;
    }

    isPlayingAudioRef.current = true;
    const audioContext = getAudioContext();
    const bufferToPlay = decodedAudioQueueRef.current.shift();

    const source = audioContext.createBufferSource();
    source.buffer = bufferToPlay;
    source.connect(audioContext.destination);

    const currentTime = audioContext.currentTime;
    const overlap = 0.1; // 100ms overlap

    let startTime;
    // If it's the first chunk, or if there was a long delay receiving chunks, play immediately.
    if (nextStartTimeRef.current === 0 || currentTime > nextStartTimeRef.current) {
      startTime = currentTime;
    } else {
      startTime = nextStartTimeRef.current;
    }

    source.start(startTime);
    // Schedule the next chunk to start before this one ends.
    nextStartTimeRef.current = startTime + bufferToPlay.duration - overlap;

    source.onended = schedulePlayback; // When this chunk finishes, schedule the next one.
  }, []);

  useEffect(() => {
    return () => {
      mediaRecorderRef.current?.stop();
      streamingServiceRef.current?.close();
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
      }
    };
  }, []);

  // NOTE: For perfect sync, the backend must send each audio chunk and its corresponding subtitle sentence together, or provide explicit timing info for each. Currently, we pair by order of arrival, which is only an approximation.

  const processAudioSubtitleQueue = useCallback(() => {
    if (isPlayingRef.current) return;
    if (audioQueueRef.current.length === 0 || subtitleQueueRef.current.length === 0) return;
    isPlayingRef.current = true;
    const audioBlob = audioQueueRef.current.shift();
    const subtitle = subtitleQueueRef.current.shift();
    console.log('[processAudioSubtitleQueue] Playing audio and showing subtitle:', subtitle);
    setSubtitles([subtitle]);
    const url = URL.createObjectURL(audioBlob);
    if (audioPlayerRef.current && audioPlayerRef.current.src) {
      URL.revokeObjectURL(audioPlayerRef.current.src);
    }
    audioPlayerRef.current.src = url;
    audioPlayerRef.current.play().catch(e => console.error("Audio playback failed:", e));
    setIsResponding(true);
  }, []);

  const handleAudioEnd = useCallback(() => {
    isPlayingRef.current = false;
    setSubtitles([]);
    console.log('[handleAudioEnd] Audio ended, clearing subtitle. Queues:', audioQueueRef.current.length, subtitleQueueRef.current.length);
    if (audioQueueRef.current.length > 0 && subtitleQueueRef.current.length > 0) {
      setTimeout(() => {
        processAudioSubtitleQueue();
      }, 50);
    } else {
      setIsResponding(false);
    }
  }, [processAudioSubtitleQueue]);

  useEffect(() => {
    const audioPlayer = new Audio();
    audioPlayerRef.current = audioPlayer;
    audioPlayer.addEventListener('ended', handleAudioEnd);
    return () => {
      mediaRecorderRef.current?.stop();
      streamingServiceRef.current?.close();
      if (audioPlayerRef.current) {
        audioPlayer.removeEventListener('ended', handleAudioEnd);
        if (audioPlayerRef.current.src) {
          URL.revokeObjectURL(audioPlayerRef.current.src);
        }
      }
    };
  }, [handleAudioEnd]);

  const startUnifiedStream = useCallback((text, convoId) => {
    if (!convoId) {
      console.error("Cannot start stream without a conversation ID.");
      setIsResponding(false);
      return;
    }
    setSubtitles([]);
    audioQueueRef.current = [];
    subtitleQueueRef.current = [];
    isPlayingRef.current = false;
    setIsFallbackActive(false);
    setFallbackText('');
    streamingServiceRef.current = new UnifiedStreamingService({
      onAudioChunk: (audioChunk) => {
        // Only push when paired with subtitle
        audioQueueRef.current.push(new Blob([audioChunk], { type: 'audio/mpeg' }));
      },
      onSubtitleChunk: (subtitleSentence) => {
        // Only push when paired with audio
        subtitleQueueRef.current.push(subtitleSentence);
        processAudioSubtitleQueue();
      },
      onStreamEnd: () => {
        setIsResponding(false);
      },
      onFallback: (message) => {
        console.warn('Voice stream fallback:', message);
        setIsFallbackActive(true);
        setFallbackText("I'm having a little trouble with my voice, so I'll type my response here...");
      },
      onError: (error) => {
        console.error('Voice streaming error:', error);
        setIsResponding(false);
        isPlayingRef.current = false;
        setSubtitles([]);
      },
      onTextChunk: (textChunk) => {
        if (isFallbackActive) {
          setFallbackText(prev => prev === "I'm having a little trouble with my voice, so I'll type my response here..." ? textChunk : prev + textChunk);
        }
      },
    });
    streamingServiceRef.current.start('voice', {
      conversationId: convoId,
      content: text,
      enableSubtitles: true
    });
  }, [isFallbackActive, processAudioSubtitleQueue]);

  const handleTranscriptionAndStream = async (audioBlob) => {
    setIsResponding(true);
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    if (!token) {
        console.error("No auth token found");
        setIsResponding(false);
        return;
    }
    
    let convoId = conversationId;
    try {
      if (!convoId) {
        const newConvo = await createConversation();
        if (!newConvo || !newConvo._id) {
          throw new Error("Failed to create conversation.");
        }
        convoId = newConvo._id;
      }
      
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.webm');
      
      const transcriptionResponse = await axios.post('/api/v1/voicerecord', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${token}`
        }
      });
      const { transcript } = transcriptionResponse.data;

      if (transcript) {
        setIsResponding(true); // Set responding true immediately
        startUnifiedStream(transcript, convoId);
      } else {
        setIsResponding(false);
      }
    } catch (error) {
      console.error('Transcription or streaming error:', error);
      setIsResponding(false);
    }
  };

  const startRecording = async () => {
    console.log('startRecording called');
    if (isResponding) {
      console.log('startRecording aborted: isResponding is true');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      console.log('Microphone stream obtained', stream);
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];
      
      recorder.ondataavailable = event => {
        audioChunksRef.current.push(event.data);
      };

      recorder.onstop = () => {
        console.log('MediaRecorder stopped');
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        handleTranscriptionAndStream(audioBlob);
      };

      recorder.start(1000);
      setIsRecording(true);
      console.log('MediaRecorder started');
    } catch (err) {
      console.error('Error starting recording:', err);
      if (mediaRecorderRef.current?.stream) {
          mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      }
    }
  };

  const stopRecording = () => {
    console.log('stopRecording called');
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      // The onstop handler will be invoked, which releases the mic tracks
      setIsRecording(false);
      console.log('MediaRecorder stop requested');
    } else {
      console.log('stopRecording: no active recording');
    }
  };

  const buttonText = () => {
    if (creatingConversation) return "initializing...";
    if (isRecording) return "stop recording";
    if (isResponding) return "ai is responding...";
    return "start recording";
  }

  useEffect(() => {
    // Cycle through greetings using localStorage
    const key = 'voicepage_greeting_idx';
    let idx = parseInt(localStorage.getItem(key) || '0', 10);
    if (isNaN(idx) || idx < 0 || idx >= traumaGreetings.length) idx = 0;
    setGreeting(traumaGreetings[idx]);
    const nextIdx = (idx + 1) % traumaGreetings.length;
    localStorage.setItem(key, nextIdx.toString());
  }, []);

  // Add a log in the render to see subtitle state changes
  console.log('[VoicePage render] subtitles:', subtitles, 'isResponding:', isResponding);

  return (
    <div className="voice-bg">
      <div className="voice-main-centered">
        <div className="voice-center">
          <div className="voice-title-status-container">
            <div className={`voice-greeting ${(!isRecording && !isResponding) ? 'show' : 'hide'}`}>{greeting}</div>
            <div className={`voice-status ${(isRecording || isResponding) ? 'show' : 'hide'}`}>{isRecording ? 'recording...' : isResponding ? 'responding...' : ''}</div>
          </div>
          <div className={`voice-heart-container${isRecording || isResponding ? ' active' : ''}`}> {/* active is not styled in CSS, but keep for logic */}
            <PulsingHeart />
          </div>
          <button 
            onClick={() => {
              console.log('Mic button clicked, isRecording:', isRecording, 'isResponding:', isResponding, 'creatingConversation:', creatingConversation);
              if (isRecording) stopRecording(); else startRecording();
            }}
            className="bottom-mic-button"
            disabled={isResponding || creatingConversation}
            aria-label={
              creatingConversation
                ? "initializing"
                : isRecording
                ? "stop recording"
                : isResponding
                ? "ai is responding"
                : "start recording"
            }
          >
            {creatingConversation ? (
              <span className="mic-spinner" />
            ) : (
              <svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="12" cy="10" r="4" />
                <line x1="12" y1="14" x2="12" y2="19" />
                <line x1="9" y1="19" x2="15" y2="19" />
              </svg>
            )}
          </button>
          <AnimatedSubtitles subtitles={subtitles} audioPlayer={audioPlayerRef} isResponding={isResponding} />
          {isFallbackActive && (
            <div className="fallback-text-container">
                <p>{fallbackText}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VoicePage;