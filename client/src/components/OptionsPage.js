/* global gtag */
import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import Icon from './Icon';
import './OptionsPage.css';
import { toast } from 'react-toastify';

// Using standardized Icon component instead of inline SVGs

const options = [
  {
    key: 'voice',
    title: 'voice mode',
    subtitle: "let it all out, I'm here to listen",
    description: 'speak freely and express your emotions through voice',
    to: '/voice',
    icon: <Icon name="voice" size={28} color="#6ea8fe" className="icon-voice" />,
    gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: '#667eea'
  },
  {
    key: 'text',
    title: 'text mode',
    subtitle: 'take your time, express at your own pace',
    description: 'write and reflect through thoughtful conversation',
    to: '/conversation',
    icon: <Icon name="chat" size={28} color="#6edc7d" className="icon-chat" />,
    gradient: 'linear-gradient(135deg, #4caf50 0%, #81c784 100%)',
    color: '#4caf50'
  },
];

// Using standardized Icon component for chevron

const OptionsPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [loadingKey, setLoadingKey] = useState(null);
  // (User menu bar state and logic removed)

  // Remove userName, userMenuRef, setShowUserMenu, setIsLoggingOut, and related useEffects

  // Keep only the effects and logic relevant to OptionsPage itself
  useEffect(() => {
    if (location.state?.message) {
      toast.success(location.state.message);
      // Clear the state to prevent showing the message again
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  useEffect(() => {
    document.title = "Dashboard - Process";
    // Remove existing meta tags
    const existingMetas = document.querySelectorAll('meta[name="description"], meta[name="keywords"]');
    existingMetas.forEach(meta => meta.remove());
    // Add new meta tags
    const meta = document.createElement('meta');
    meta.name = 'description';
    meta.content = 'Choose your support mode on Process: voice or text conversation for emotional support.';
    document.head.appendChild(meta);
    const keywords = document.createElement('meta');
    keywords.name = 'keywords';
    keywords.content = 'emotional support, voice therapy, text therapy, mental health, process';
    document.head.appendChild(keywords);
    return () => {
      const metas = document.querySelectorAll('meta[name="description"], meta[name="keywords"]');
      metas.forEach(meta => meta.remove());
    };
  }, []);

  const handleCardClick = async (key, to) => {
    if (loadingKey) return;
    setLoadingKey(key);
    try {
      // Analytics tracking
      if (typeof gtag !== 'undefined') {
        gtag('event', 'select_mode', {
          'event_category': 'navigation',
          'event_label': key,
          'value': 1
        });
      }
      // Brief delay for visual feedback
      await new Promise(resolve => setTimeout(resolve, 300));
      navigate(to);
    } catch (err) {
      console.error('Navigation error:', err);
      toast.error('Navigation failed. Please try again.');
      setLoadingKey(null);
    }
  };

  return (
    <main className="options-main" role="main">
      <div className="options-center">
        <div className="options-inner">
          <div className="options-heart" aria-hidden="true">
            <img src="/logo.svg" alt="Process Logo" width="48" height="48" />
          </div>
          <div className="greeting-section">
            <h1 className="options-greeting">Welcome!</h1>
            <p className="options-title">how are you feeling today?</p>
          </div>
          <div className="options-cards">
            {options.map((opt, index) => (
              <div
                key={opt.key}
                className={`app-card options-card ${loadingKey === opt.key ? 'loading' : ''}`}
                tabIndex={0}
                role="button"
                aria-label={`${opt.title}: ${opt.subtitle}`}
                aria-busy={loadingKey === opt.key}
                aria-describedby={`card-desc-${opt.key}`}
                data-mode={opt.key}
                onClick={() => handleCardClick(opt.key, opt.to)}
                onKeyDown={(e) => handleCardClick(opt.key, opt.to)}
                style={{
                  '--card-color': opt.color,
                  '--card-gradient': opt.gradient,
                  animationDelay: `${index * 100}ms`
                }}
              >
                <div className="options-card-icon">
                  {opt.icon}
                </div>
                <div className="options-card-content">
                  <span className="options-card-title">{opt.title}</span>
                  <span className="options-card-subtitle">{opt.subtitle}</span>
                  <span className="options-card-description" id={`card-desc-${opt.key}`}>
                    {opt.description}
                  </span>
                </div>
                <button className="options-card-action" tabIndex="-1" aria-hidden="true" type="button" style={{ pointerEvents: 'none', background: 'none', border: 'none' }}>
                  {loadingKey === opt.key ? (
                    <div className="options-card-spinner" aria-label="loading" />
                  ) : (
                    <Icon name="chevronRight" size={18} />
                  )}
                </button>
              </div>
            ))}
          </div>
          <div className="options-footer">
            <p className="support-text">
              need immediate help? <Link to="/crisis-support" className="crisis-link">crisis support</Link>
            </p>
          </div>
        </div>
      </div>
    </main>
  );
};

export default OptionsPage;