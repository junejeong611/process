import React, { useState, useEffect, useRef } from 'react';
import { CSSTransition, TransitionGroup } from 'react-transition-group';
import './AnimatedSubtitles.css';

const AnimatedSubtitles = ({ subtitles }) => {
  if (!subtitles || subtitles.length === 0) {
    return null;
  }
  console.log('[AnimatedSubtitles] Rendering:', subtitles[0]);
  return (
    <div className="animated-subtitles-container">
      {subtitles.map((line, idx) => (
        <p className="subtitle-line" key={line.text || line || idx}>{line.text || line}</p>
      ))}
    </div>
  );
};

export default AnimatedSubtitles; 