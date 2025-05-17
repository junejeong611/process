import React, { useEffect, useState } from 'react';
import axios from '../utils/axiosWithRetry';

const BackendConnectionCheck = ({ children }) => {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    const checkBackend = async () => {
      setError('');
      for (let i = 0; i < 20; i++) {
        try {
          const res = await axios.get('/api/health');
          if (res.status === 200 && res.data.status === 'ok') {
            if (!cancelled) setReady(true);
            return;
          }
        } catch (err) {
          // ignore, will retry
        }
        await new Promise(res => setTimeout(res, 1000));
      }
      if (!cancelled) setError('Unable to connect to backend. Please try again later.');
    };
    checkBackend();
    return () => { cancelled = true; };
  }, []);

  if (error) return <div style={{color: 'red', padding: 20, textAlign: 'center'}}>{error}</div>;
  if (!ready) return <div style={{padding: 20, textAlign: 'center'}}>Connecting to backend...</div>;
  return children;
};

export default BackendConnectionCheck; 