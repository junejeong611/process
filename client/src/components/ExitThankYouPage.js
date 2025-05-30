import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './ExitThankYouPage.css';

const HeartIcon = () => (
  <svg width="72" height="72" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
    <defs>
      <linearGradient id="thankyouHeartGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#4A90E2" stopOpacity="0.9" />
        <stop offset="100%" stopColor="#6BA3F5" stopOpacity="1" />
      </linearGradient>
    </defs>
    <path
      d="M100 170c0 0-60-40-60-85 0-25 20-45 45-45 15 0 28 8 35 20 7-12 20-20 35-20 25 0 45 20 45 45 0 45-60 85-60 85z"
      fill="url(#thankyouHeartGradient)"
    />
  </svg>
);

function getTimeOfDayGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'morning';
  if (hour < 18) return 'afternoon';
  return 'evening';
}

const mainMessages = [
  "Thank you for taking time to process your emotions here 💙",
  "Your feelings matter, and so do you 🌟",
  "Every conversation is a step forward in your journey 🌱",
  "Remember, seeking support shows strength 💙"
];

const closingMessages = [
  "Take care of yourself today",
  "You're doing great by prioritizing your mental health 🌟",
  "Remember to be gentle with yourself 💙",
  "Your emotional wellness journey matters 🌱"
];

const professionalHelpReminder =
  "If you ever need more support, consider reaching out to a mental health professional.";

const timeOfDayMessages = {
  morning: "Wishing you a gentle start to your day ☀️",
  afternoon: "Hope your afternoon brings you peace 🌤️",
  evening: "Wishing you a restful evening and self-kindness 🌙"
};

const prefersReducedMotion = () => {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
};

const ExitThankYouPage = ({ sessionLength, topics }) => {
  const [visible, setVisible] = useState(true);
  const [exiting, setExiting] = useState(false);
  const [showTitle, setShowTitle] = useState(false);
  const [showSupport, setShowSupport] = useState(false);
  const [showBody, setShowBody] = useState([false, false, false]);
  const [progress, setProgress] = useState(0);
  const [loading, setLoading] = useState(false);
  const timerRef = useRef();
  const progressRef = useRef();
  const navigate = useNavigate();

  // Pick random main and closing messages
  const [mainMsg] = useState(() => mainMessages[Math.floor(Math.random() * mainMessages.length)]);
  const [closeMsg] = useState(() => closingMessages[Math.floor(Math.random() * closingMessages.length)]);
  const timeOfDay = getTimeOfDayGreeting();
  const timeMsg = timeOfDayMessages[timeOfDay];

  // Staggered text appearance
  useEffect(() => {
    if (prefersReducedMotion()) {
      setShowTitle(true);
      setShowSupport(true);
      setShowBody([true, true, true]);
      return;
    }
    const t1 = setTimeout(() => setShowTitle(true), 120);
    const t2 = setTimeout(() => setShowSupport(true), 350);
    const t3 = setTimeout(() => setShowBody([true, false, false]), 450);
    const t4 = setTimeout(() => setShowBody([true, true, false]), 650);
    const t5 = setTimeout(() => setShowBody([true, true, true]), 850);
    return () => {
      clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); clearTimeout(t5);
    };
  }, []);

  // Progress bar animation
  useEffect(() => {
    if (prefersReducedMotion()) {
      setProgress(100);
      return;
    }
    let start = Date.now();
    const duration = 4500;
    function animate() {
      const elapsed = Date.now() - start;
      setProgress(Math.min(100, (elapsed / duration) * 100));
      if (elapsed < duration) {
        progressRef.current = requestAnimationFrame(animate);
      } else {
        setProgress(100);
      }
    }
    animate();
    return () => cancelAnimationFrame(progressRef.current);
  }, []);

  // Auto exit after delay
  useEffect(() => {
    timerRef.current = setTimeout(() => {
      setExiting(true);
      setTimeout(() => {
        setLoading(true);
        setTimeout(() => {
          setVisible(false);
          try {
            navigate('/options');
          } catch (e) {}
        }, prefersReducedMotion() ? 0 : 400);
      }, prefersReducedMotion() ? 0 : 1000);
    }, 4500);
    return () => clearTimeout(timerRef.current);
  }, [navigate]);

  if (!visible) return null;

  const handleContinue = () => {
    setExiting(true);
    setTimeout(() => {
      setLoading(true);
      setTimeout(() => {
        setVisible(false);
        try {
          navigate('/options');
        } catch (e) {}
      }, prefersReducedMotion() ? 0 : 400);
    }, prefersReducedMotion() ? 0 : 1000);
  };

  return (
    <div
      className={`exit-thankyou-bg${exiting ? ' exit-fade-out' : ' exit-fade-in'}`}
      role="dialog"
      aria-modal="true"
      aria-label="Session Ended Thank You"
    >
      <div className="exit-thankyou-card" tabIndex={0} aria-labelledby="thankyou-title" aria-describedby="thankyou-desc">
        <div className="exit-thankyou-progress">
          <div className="exit-thankyou-progress-bar" style={{ width: `${progress}%` }} />
        </div>
        <div className="exit-thankyou-heart"><HeartIcon /></div>
        <h1 className="exit-thankyou-title" id="thankyou-title" style={{opacity: showTitle ? 1 : 0}}>{mainMsg}</h1>
        <div className="exit-thankyou-support" id="thankyou-desc" style={{opacity: showSupport ? 1 : 0}}>
          <p style={{opacity: showBody[0] ? 1 : 0}}>{closeMsg}</p>
          <p style={{opacity: showBody[1] ? 1 : 0}}>{timeMsg}</p>
          <p style={{fontSize: '15px', color: '#4A90E2', marginTop: 12, opacity: showBody[2] ? 0.85 : 0}}>{professionalHelpReminder}</p>
        </div>
        <button
          className="exit-thankyou-continue"
          onClick={handleContinue}
          aria-label="Continue"
        >Continue</button>
        {loading && (
          <div className="exit-thankyou-loading" aria-label="Loading...">
            <svg width="36" height="36" viewBox="0 0 50 50" style={{display:'block'}} aria-hidden="true"><circle cx="25" cy="25" r="20" fill="none" stroke="#4A90E2" strokeWidth="5" strokeDasharray="31.4 31.4" strokeLinecap="round"><animateTransform attributeName="transform" type="rotate" from="0 25 25" to="360 25 25" dur="0.8s" repeatCount="indefinite"/></circle></svg>
          </div>
        )}
      </div>
    </div>
  );
};

export default ExitThankYouPage; 