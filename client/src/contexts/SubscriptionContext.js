import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getSubscriptionStatus } from '../services/subscription';

const CACHE_KEY = 'subscriptionStatusCache';
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

const SubscriptionContext = createContext();

export const useSubscription = () => useContext(SubscriptionContext);

export const SubscriptionProvider = ({ children }) => {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Debug logging
  useEffect(() => {
    console.log('[SubscriptionContext] status:', status);
    console.log('[SubscriptionContext] loading:', loading);
    console.log('[SubscriptionContext] error:', error);
  }, [status, loading, error]);

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
    setLoading(true);
    setError(null);
    try {
      const data = await getSubscriptionStatus();
      setStatus(data); // Store the full object
      saveToCache(data); // Cache the full object
      setLoading(false);
      return data;
    } catch (err) {
      setError(err);
      setLoading(false);
      return null;
    }
  }, []);

  // On mount, try cache first
  useEffect(() => {
    const cachedStatus = loadFromCache();
    if (cachedStatus) {
      setStatus(cachedStatus);
      setLoading(false);
    } else {
      fetchStatus();
    }
    // eslint-disable-next-line
  }, [fetchStatus]);

  // Allow manual refresh (e.g., after checkout)
  const forceRefresh = async () => {
    await fetchStatus();
  };

  return (
    <SubscriptionContext.Provider value={{ status, setStatus, loading, error, forceRefresh }}>
      {children}
    </SubscriptionContext.Provider>
  );
}; 