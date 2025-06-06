import React, { createContext, useReducer, useEffect, useContext, useCallback, useRef } from 'react';
import { openDB } from 'idb';

// Types and constants
const VOICE_STATUSES = {
  IDLE: 'idle',
  LISTENING: 'listening',
  PROCESSING: 'processing',
  SPEAKING: 'speaking',
  ERROR: 'error'
};

const ERROR_TYPES = {
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  NETWORK_ERROR: 'NETWORK_ERROR',
  API_ERROR: 'API_ERROR',
  AUDIO_ERROR: 'AUDIO_ERROR',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR'
};

const initialState = {
  status: VOICE_STATUSES.IDLE,
  isRecording: false,
  hasPermission: null,
  currentTranscript: '',
  aiResponse: '',
  aiReturned: '',
  conversationHistory: [],
  error: null,
  userSettings: {
    voiceSpeed: 1.0,
    autoPlay: true,
    theme: 'light',
    language: 'en-US',
    maxHistoryItems: 100,
    enableNotifications: true,
  },
  loading: false,
  isOnline: navigator.onLine,
  apiStatus: {
    stt: null, // 'connected' | 'error' | null
    claude: null,
    tts: null
  }
};

const VoiceContext = createContext(null);

// Enhanced IndexedDB helpers
const DB_NAME = 'voiceApp';
const DB_VERSION = 2;
const SETTINGS_STORE = 'settings';
const HISTORY_STORE = 'history';
const CACHE_STORE = 'cache';

let dbInstance = null;

async function getDB() {
  if (dbInstance) return dbInstance;
  
  try {
    dbInstance = await openDB(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion, newVersion, transaction) {
        // Settings store
        if (!db.objectStoreNames.contains(SETTINGS_STORE)) {
          db.createObjectStore(SETTINGS_STORE);
        }
        
        // History store with index
        if (!db.objectStoreNames.contains(HISTORY_STORE)) {
          const historyStore = db.createObjectStore(HISTORY_STORE, { 
            keyPath: 'id',
            autoIncrement: true 
          });
          historyStore.createIndex('timestamp', 'timestamp');
        }
        
        // Cache store for offline functionality
        if (!db.objectStoreNames.contains(CACHE_STORE)) {
          db.createObjectStore(CACHE_STORE);
        }
      },
      blocked() {
        console.warn('Database upgrade blocked. Please close other tabs.');
      },
      blocking() {
        console.warn('Database is blocking a newer version.');
      }
    });
    return dbInstance;
  } catch (error) {
    console.error('Failed to open IndexedDB:', error);
    throw new Error('Database initialization failed');
  }
}

async function saveToDB(store, key, value) {
  try {
    const db = await getDB();
    await db.put(store, value, key);
  } catch (error) {
    console.error(`Failed to save to ${store}:`, error);
  }
}

async function loadFromDB(store, key) {
  try {
    const db = await getDB();
    return await db.get(store, key);
  } catch (error) {
    console.error(`Failed to load from ${store}:`, error);
    return null;
  }
}

async function getAllFromDB(store, limit = null) {
  try {
    const db = await getDB();
    const transaction = db.transaction(store, 'readonly');
    const objectStore = transaction.objectStore(store);
    
    if (limit) {
      return await objectStore.getAll(null, limit);
    }
    return await objectStore.getAll();
  } catch (error) {
    console.error(`Failed to get all from ${store}:`, error);
    return [];
  }
}

async function clearStore(store) {
  try {
    const db = await getDB();
    await db.clear(store);
  } catch (error) {
    console.error(`Failed to clear ${store}:`, error);
  }
}

// Enhanced reducer with better error handling
function voiceReducer(state, action) {
  switch (action.type) {
    case 'SET_STATUS':
      return { 
        ...state, 
        status: action.status,
        // Clear error when returning to idle
        error: action.status === VOICE_STATUSES.IDLE ? null : state.error
      };
      
    case 'SET_RECORDING':
      return { ...state, isRecording: action.isRecording };
      
    case 'SET_PERMISSION':
      return { ...state, hasPermission: action.hasPermission };
      
    case 'SET_TRANSCRIPT':
      return { ...state, currentTranscript: action.transcript };
      
    case 'SET_AI_RESPONSE':
      return { ...state, aiResponse: action.response };

    case 'SET_AI_RETURN':
      return { ...state, aiReturn: action.response };
      
    case 'ADD_HISTORY': {
      const newEntry = {
        ...action.entry,
        id: Date.now(),
        timestamp: new Date().toISOString()
      };
      
      const newHistory = [newEntry, ...state.conversationHistory]
        .slice(0, state.userSettings.maxHistoryItems);
      
      // Save to IndexedDB asynchronously
      saveToDB(HISTORY_STORE, 'conversations', newHistory).catch(console.error);
      
      return { ...state, conversationHistory: newHistory };
    }
    
    case 'SET_HISTORY':
      return { ...state, conversationHistory: action.history || [] };
      
    case 'CLEAR_HISTORY':
      clearStore(HISTORY_STORE).catch(console.error);
      return { ...state, conversationHistory: [] };
      
    case 'SET_ERROR':
      return { 
        ...state, 
        error: {
          type: action.errorType || ERROR_TYPES.UNKNOWN_ERROR,
          message: action.message,
          timestamp: new Date().toISOString(),
          retry: action.retry || false
        },
        status: VOICE_STATUSES.ERROR
      };
      
    case 'CLEAR_ERROR':
      return { ...state, error: null };
      
    case 'SET_SETTINGS': {
      const newSettings = { ...state.userSettings, ...action.settings };
      saveToDB(SETTINGS_STORE, 'userSettings', newSettings).catch(console.error);
      return { ...state, userSettings: newSettings };
    }
    
    case 'SET_LOADING':
      return { ...state, loading: action.loading };
      
    case 'SET_ONLINE_STATUS':
      return { ...state, isOnline: action.isOnline };
      
    case 'SET_API_STATUS':
      return { 
        ...state, 
        apiStatus: { 
          ...state.apiStatus, 
          [action.service]: action.status 
        } 
      };
      
    case 'RESET_STATE':
      return { 
        ...initialState, 
        userSettings: state.userSettings,
        conversationHistory: action.keepHistory ? state.conversationHistory : []
      };
      
    default:
      console.warn(`Unknown action type: ${action.type}`);
      return state;
  }
}

// Custom hook for using voice context
export function useVoice() {
  const context = useContext(VoiceContext);
  if (!context) {
    throw new Error('useVoice must be used within a VoiceProvider');
  }
  return context;
}

// Action creators for better type safety and consistency
export const voiceActions = {
  setStatus: (status) => ({ type: 'SET_STATUS', status }),
  setRecording: (isRecording) => ({ type: 'SET_RECORDING', isRecording }),
  setPermission: (hasPermission) => ({ type: 'SET_PERMISSION', hasPermission }),
  setTranscript: (transcript) => ({ type: 'SET_TRANSCRIPT', transcript }),
  setAiResponse: (response) => ({ type: 'SET_AI_RESPONSE', response }), //loaded at the same time as voice
  setAiReturn: (response) => ({ type: 'SET_AI_RETURN', response }), 
  addHistory: (entry) => ({ type: 'ADD_HISTORY', entry }),
  setHistory: (history) => ({ type: 'SET_HISTORY', history }),
  clearHistory: () => ({ type: 'CLEAR_HISTORY' }),
  setError: (message, errorType, retry = false) => ({ 
    type: 'SET_ERROR', 
    message, 
    errorType, 
    retry 
  }),
  clearError: () => ({ type: 'CLEAR_ERROR' }),
  setSettings: (settings) => ({ type: 'SET_SETTINGS', settings }),
  setLoading: (loading) => ({ type: 'SET_LOADING', loading }),
  setOnlineStatus: (isOnline) => ({ type: 'SET_ONLINE_STATUS', isOnline }),
  setApiStatus: (service, status) => ({ type: 'SET_API_STATUS', service, status }),
  resetState: (keepHistory = false) => ({ type: 'RESET_STATE', keepHistory })
};

export function VoiceProvider({ children }) {
  const [state, dispatch] = useReducer(voiceReducer, initialState);
  const initializationRef = useRef(false);
  const cleanupRef = useRef([]);

  // Enhanced initialization with error handling
  useEffect(() => {
    if (initializationRef.current) return;
    initializationRef.current = true;

    async function initializeApp() {
      try {
        dispatch(voiceActions.setLoading(true));

        // Load settings
        const settings = await loadFromDB(SETTINGS_STORE, 'userSettings');
        if (settings) {
          dispatch(voiceActions.setSettings(settings));
        }

        // Load conversation history
        const history = await loadFromDB(HISTORY_STORE, 'conversations');
        if (history && Array.isArray(history)) {
          dispatch(voiceActions.setHistory(history));
        }

        // Check microphone permission
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          try {
            const stream = await navigator.mediaDevices.getUserMedia({ 
              audio: true 
            });
            stream.getTracks().forEach(track => track.stop());
            dispatch(voiceActions.setPermission(true));
          } catch (error) {
            if (error.name === 'NotAllowedError') {
              dispatch(voiceActions.setPermission(false));
            }
          }
        }

      } catch (error) {
        console.error('Initialization error:', error);
        dispatch(voiceActions.setError(
          'Failed to initialize app',
          ERROR_TYPES.UNKNOWN_ERROR
        ));
      } finally {
        dispatch(voiceActions.setLoading(false));
      }
    }

    initializeApp();
  }, []);

  // Online/offline status monitoring
  useEffect(() => {
    const handleOnline = () => dispatch(voiceActions.setOnlineStatus(true));
    const handleOffline = () => dispatch(voiceActions.setOnlineStatus(false));

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    cleanupRef.current.push(() => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    });

    return () => {
      cleanupRef.current.forEach(cleanup => cleanup());
    };
  }, []);

  // Enhanced context value with helper methods
  const contextValue = {
    ...state,
    dispatch,
    actions: voiceActions,
    
    // Helper methods
    addConversation: useCallback((userMessage, aiResponse) => {
      dispatch(voiceActions.addHistory({
        userMessage,
        aiResponse,
        timestamp: new Date().toISOString()
      }));
    }, []),

    updateSettings: useCallback((newSettings) => {
      dispatch(voiceActions.setSettings(newSettings));
    }, []),

    clearAllData: useCallback(async () => {
      try {
        await clearStore(HISTORY_STORE);
        await clearStore(CACHE_STORE);
        dispatch(voiceActions.resetState(false));
      } catch (error) {
        console.error('Failed to clear data:', error);
      }
    }, []),

    retry: useCallback(() => {
      if (state.error?.retry) {
        dispatch(voiceActions.clearError());
        dispatch(voiceActions.setStatus(VOICE_STATUSES.IDLE));
      }
    }, [state.error]),

    // Export conversation history
    exportHistory: useCallback(async () => {
      try {
        const history = await getAllFromDB(HISTORY_STORE);
        const dataStr = JSON.stringify(history, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `voice-history-${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        
        URL.revokeObjectURL(url);
      } catch (error) {
        console.error('Export failed:', error);
        dispatch(voiceActions.setError(
          'Failed to export history',
          ERROR_TYPES.UNKNOWN_ERROR
        ));
      }
    }, [])
  };

  return (
    <VoiceContext.Provider value={contextValue}>
      {children}
    </VoiceContext.Provider>
  );
}

// Export constants for use in components
export { VOICE_STATUSES, ERROR_TYPES };
export default VoiceContext;