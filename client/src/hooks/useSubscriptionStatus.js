import { useState, useEffect } from 'react';
import { getSubscriptionStatus } from '../services/subscription';

export function useSubscriptionStatus() {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    
    console.log('useSubscriptionStatus - Starting API call');
    
    getSubscriptionStatus()
      .then(data => {
        console.log('useSubscriptionStatus - API Response:', data);
        if (isMounted) {
          setStatus(data);
          setLoading(false);
        }
      })
      .catch(err => {
        console.error('useSubscriptionStatus - API Error:', err);
        if (isMounted) {
          setError(err);
          setLoading(false);
        }
      });
      
    return () => { isMounted = false; };
  }, []);

  return { status, loading, error };
}