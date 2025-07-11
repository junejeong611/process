import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getSubscriptionStatus } from '../services/subscription';

const CACHE_KEY = 'subscriptionStatusCache';
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

export const SubscriptionContext = createContext({
  status: null,
  loading: true,
  trialEnd: null,
  currentPeriodEnd: null,
  cancelAtPeriodEnd: false,
  forceRefresh: () => {},
});

export const useSubscription = () => useContext(SubscriptionContext);

export const SubscriptionProvider = ({ children }) => {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('token') || sessionStorage.getItem('token'));
  const [trialEnd, setTrialEnd] = useState(null);
  const [currentPeriodEnd, setCurrentPeriodEnd] = useState(null);
  const [cancelAtPeriodEnd, setCancelAtPeriodEnd] = useState(false);

  // Watch for token changes (e.g., after login)
  useEffect(() => {
    const checkToken = () => {
      const newToken = localStorage.getItem('token') || sessionStorage.getItem('token');
      setToken(newToken);
    };
    window.addEventListener('storage', checkToken);
    // Also poll for token changes in this tab
    const interval = setInterval(checkToken, 1000);
    return () => {
      window.removeEventListener('storage', checkToken);
      clearInterval(interval);
    };
  }, []);

  // Debug logging
  useEffect(() => {
    console.log('[SubscriptionContext] status:', status);
    console.log('[SubscriptionContext] loading:', loading);
    console.log('[SubscriptionContext] error:', error);
    console.log('[SubscriptionContext] token:', token);
  }, [status, loading, error, token]);

  // Helper to load from cache
  const loadFromCache = () => {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (!cached) return null;
      const { status, timestamp } = JSON.parse(cached);
      if (Date.now() - timestamp < CACHE_TTL) {
        // Backward compatibility: if status is a string, convert to object
        if (typeof status === 'string') {
          console.warn('[SubscriptionContext] Cached status was a string, converting to object.');
          return { subscriptionStatus: status };
        }
        return status;
      }
      return null;
    } catch {
      return null;
    }
  };

  // Helper to save to cache
  const saveToCache = (statusObj) => {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify({ status: statusObj, timestamp: Date.now() }));
    } catch {}
  };

  // Fetch status from API and update cache
  const fetchStatus = useCallback(async () => {
    console.log('[SubscriptionContext] Fetching subscription status from backend...');
    setLoading(true);
    setError(null);
    try {
      const data = await getSubscriptionStatus();
      console.log('[SubscriptionContext] Fetched data:', data);
      // Store the full status object instead of just the string
      setStatus(data);
      setTrialEnd(data.trialEnd);
      setCurrentPeriodEnd(data.currentPeriodEnd);
      setCancelAtPeriodEnd(data.cancelAtPeriodEnd);
      saveToCache(data); // Cache the full object
    } catch (err) {
      console.error('[SubscriptionContext] Error fetching status:', err);
      // If error is 401 Unauthorized, treat as inactive (not an error)
      if (err && (err.status === 401 || err.response?.status === 401)) {
        setStatus({ subscriptionStatus: 'inactive' });
        setError(null);
      } else {
        setError('Failed to load subscription status.');
        setStatus({ subscriptionStatus: 'inactive' }); // Default to inactive object on error
      }
    } finally {
      setLoading(false);
    }
  }, [token]);

  // Always fetch latest status on mount and when token changes
  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  // Expose forceRefresh to always fetch latest status
  const forceRefresh = useCallback(() => {
    console.log('[SubscriptionContext] forceRefresh called!');
    fetchStatus();
  }, [fetchStatus]);

  return (
    <SubscriptionContext.Provider value={{ status, setStatus, loading, error, forceRefresh }}>
      {children}
    </SubscriptionContext.Provider>
  );
}; 