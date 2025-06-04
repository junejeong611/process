import { useState, useEffect } from 'react';
import { getSubscriptionStatus } from '../services/subscription';

export function useSubscriptionStatus() {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    getSubscriptionStatus()
      .then(data => {
        if (isMounted) {
          setStatus(data);
          setLoading(false);
        }
      })
      .catch(err => {
        if (isMounted) {
          setError(err);
          setLoading(false);
        }
      });
    return () => { isMounted = false; };
  }, []);

  return { status, loading, error };
}