import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import './VoicePage.css';
import PulsingHeart from './PulsingHeart';
import UnifiedStreamingService from '../services/streamingService';
import useCreateConversation from '../utils/useCreateConversation';
import AnimatedSubtitles from './chat/AnimatedSubtitles';

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
  const isPlayingRef = useRef(false);
  
  // --- Web Audio API Refs ---
  const audioContextRef = useRef(null);
  const decodedAudioQueueRef = useRef([]);
  const nextStartTimeRef = useRef(0);
  const isPlayingAudioRef = useRef(false);
  // -------------------------

  const { conversationId, createConversation, loading: creatingConversation } = useCreateConversation('voice');
  const streamingServiceRef = useRef(null);

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

  const processAudioQueue = useCallback(() => {
    if (isPlayingRef.current || audioQueueRef.current.length === 0) {
      return;
    }

    isPlayingRef.current = true;
    const audioBlob = audioQueueRef.current.shift();
    const url = URL.createObjectURL(audioBlob);
    
    // Cleanup previous URL if it exists to prevent memory leaks
    if (audioPlayerRef.current && audioPlayerRef.current.src) {
        URL.revokeObjectURL(audioPlayerRef.current.src);
    }

    audioPlayerRef.current.src = url;
    audioPlayerRef.current.play().catch(e => console.error("Audio playback failed:", e));
    
    // setIsResponding should be true while playing
    setIsResponding(true); 
  }, []);


  const handleAudioEnd = useCallback(() => {
    isPlayingRef.current = false;
    // If there's more audio in the queue, play it
    if (audioQueueRef.current.length > 0) {
        processAudioQueue();
    } else {
        // Only set to false if the queue is empty
        setIsResponding(false);
        setSubtitles([]);
    }
  }, [processAudioQueue]);


  useEffect(() => {
    // Create an audio element and attach listeners
    const audioPlayer = new Audio();
    audioPlayerRef.current = audioPlayer;
    audioPlayer.addEventListener('ended', handleAudioEnd);

    return () => {
      // Cleanup
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
    isPlayingRef.current = false;
    setIsFallbackActive(false);
    setFallbackText('');
    
    let accumulatedAudio = [];

    streamingServiceRef.current = new UnifiedStreamingService({
      onAudioChunk: (audioChunk) => {
        accumulatedAudio.push(audioChunk);
      },
      onStreamEnd: () => {
        if (isFallbackActive) {
            setIsResponding(false);
            return;
        }

        if(accumulatedAudio.length > 0) {
            const audioBlob = new Blob(accumulatedAudio, { type: 'audio/mpeg' });
            audioQueueRef.current.push(audioBlob);
            processAudioQueue();
            accumulatedAudio = [];
        } else {
            // If no audio was ever queued, end the responding state.
            if(audioQueueRef.current.length === 0 && !isPlayingRef.current) {
                setIsResponding(false);
                setSubtitles([]);
            }
        }
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
        // This is where we'd handle the old text-only stream if needed
      },
       onSubtitleChunk: (subtitle) => {
         // New handler for word-level subtitles
         setSubtitles(prev => [...prev, subtitle]);
       },
    });

    streamingServiceRef.current.start('voice', {
      conversationId: convoId,
      content: text,
      enableSubtitles: true // New flag to request subtitles
    });
  }, [isFallbackActive, processAudioQueue]);


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
    if (isResponding) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];
      
      recorder.ondataavailable = event => {
        audioChunksRef.current.push(event.data);
      };

      recorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        handleTranscriptionAndStream(audioBlob);
        // We no longer stop all tracks here, as the microphone should be released
        // only after we are sure we are done with it.
        // Let's move track stopping to a more controlled place, e.g., after transcription.
      };

      recorder.start(1000);
      setIsRecording(true);
    } catch (err) {
      console.error('Error starting recording:', err);
      // Ensure microphone tracks are stopped on error
      if (mediaRecorderRef.current?.stream) {
          mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      }
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      // The onstop handler will be invoked, which releases the mic tracks
      setIsRecording(false);
    }
  };

  const buttonText = () => {
    if (creatingConversation) return "initializing...";
    if (isRecording) return "stop recording";
    if (isResponding) return "ai is responding...";
    return "start recording";
  }

  return (
    <div className="voice-page-container">
        <div className="status-indicator">
            {isRecording ? 'recording...' : isResponding ? 'responding...' : 'ready'}
        </div>
        <div className={`heart-container ${isRecording || isResponding ? 'active' : ''}`}>
            <PulsingHeart />
        </div>
        <AnimatedSubtitles subtitles={subtitles} audioPlayer={audioPlayerRef} isResponding={isResponding} />
      <button 
        onClick={isRecording ? stopRecording : startRecording}
        className="record-button"
        disabled={isResponding || creatingConversation}
      >
        {buttonText()}
      </button>
      {isFallbackActive && (
        <div className="fallback-text-container">
            <p>{fallbackText}</p>
        </div>
      )}
    </div>
  );
};

export default VoicePage;