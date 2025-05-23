import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './OptionsPage.css';
import { toast } from 'react-toastify';

const HeartIcon = () => (
  <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
    <path d="M24 41s-13-8.35-13-17.5C11 15.57 15.57 11 21 11c2.54 0 4.99 1.19 6.5 3.09C29.99 12.19 32.44 11 35 11c5.43 0 10 4.57 10 12.5C47 32.65 34 41 24 41z" fill="#7bb6fa"/>
  </svg>
);

const options = [
  {
    key: 'voice',
    title: 'voice mode',
    subtitle: "let it all out, i'm here to listen",
    to: '/coming-soon',
    icon: (
      <svg width="24" height="24" fill="none" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 3a4 4 0 0 1 4 4v5a4 4 0 0 1-8 0V7a4 4 0 0 1 4-4zm6 9a1 1 0 1 1 2 0 8 8 0 0 1-16 0 1 1 0 1 1 2 0 6 6 0 0 0 12 0zm-6 7a7.97 7.97 0 0 0 6.32-3H5.68A7.97 7.97 0 0 0 12 19zm-1 2h2v2h-2v-2z" fill="#6b7a90"/></svg>
    ),
  },
  {
    key: 'text',
    title: 'text mode',
    subtitle: 'take your time, express at your own pace',
    to: '/conversation',
    icon: (
      <svg width="24" height="24" fill="none" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M4 4h16v2H4V4zm0 4h16v2H4V8zm0 4h10v2H4v-2zm0 4h7v2H4v-2z" fill="#6b7a90"/></svg>
    ),
  },
];

const ChevronIcon = () => (
  <svg width="24" height="24" fill="none" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M9.29 6.71a1 1 0 0 1 1.42 0l4 4a1 1 0 0 1 0 1.42l-4 4a1 1 0 1 1-1.42-1.42L12.59 12l-3.3-3.29a1 1 0 0 1 0-1.42z" fill="#7bb6fa"/></svg>
);

const OptionsPage = () => {
  const navigate = useNavigate();
  const [loadingKey, setLoadingKey] = useState(null);

  React.useEffect(() => {
    document.title = "Options - Process";
    const meta = document.createElement('meta');
    meta.name = 'description';
    meta.content = "Choose your support mode on Process: voice or text.";
    document.head.appendChild(meta);
    return () => { document.head.removeChild(meta); };
  }, []);

  const handleCardClick = async (key, to) => {
    setLoadingKey(key);
    try {
      // Analytics tracking (replace with real analytics as needed)
      window?.gtag?.('event', 'select_mode', { mode: key });
      console.log('User selected mode:', key);
      await new Promise(res => setTimeout(res, 250)); // brief delay for feedback
      navigate(to);
    } catch (err) {
      toast.error('Navigation failed. Please try again.');
      setLoadingKey(null);
    }
  };

  const handleKeyDown = (e, key, to) => {
    if ((e.key === 'Enter' || e.key === ' ') && !loadingKey) {
      handleCardClick(key, to);
    }
  };

  return (
    <main className="options-main" role="main">
      <div className="options-center">
        <div className="options-heart" aria-hidden="true">
          <HeartIcon />
        </div>
        <h1 className="options-title" tabIndex={0}>how's your day?</h1>
        <div className="options-cards">
          {options.map(opt => (
            <div
              key={opt.key}
              className={`options-card${loadingKey === opt.key ? ' loading' : ''}`}
              tabIndex={0}
              role="button"
              aria-label={opt.title + ': ' + opt.subtitle}
              aria-busy={loadingKey === opt.key}
              onClick={() => !loadingKey && handleCardClick(opt.key, opt.to)}
              onKeyDown={e => handleKeyDown(e, opt.key, opt.to)}
              style={loadingKey === opt.key ? { pointerEvents: 'none', transform: 'scale(0.98)', boxShadow: '0 2px 8px rgba(60,90,130,0.07)' } : {}}
            >
              <div className="options-card-content">
                <span className="options-card-title">{opt.title}</span>
                <span className="options-card-subtitle">{opt.subtitle}</span>
              </div>
              <span className="options-card-chevron">
                {loadingKey === opt.key ? (
                  <span className="options-card-spinner" aria-label="loading" />
                ) : (
                  <ChevronIcon />
                )}
              </span>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
};

export default OptionsPage; 