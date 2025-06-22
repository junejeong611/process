import React, { useState, useEffect, useRef } from 'react';
import { CSSTransition, TransitionGroup } from 'react-transition-group';
import './AnimatedSubtitles.css';

const AnimatedSubtitles = ({ subtitles, audioPlayer, isResponding }) => {
    const [currentLineIndex, setCurrentLineIndex] = useState(0);
    const [activeWordIndex, setActiveWordIndex] = useState(-1);
    const animationFrameId = useRef(null);

    const lines = React.useMemo(() => {
        if (!subtitles || subtitles.length === 0) return [];
        
        const generatedLines = [];
        let currentLine = [];
        let lineWordCount = 0;
        const maxWordsPerLine = 7; 

        subtitles.forEach(word => {
            currentLine.push(word);
            lineWordCount++;
            if (lineWordCount >= maxWordsPerLine || /[.?!]/.test(word.text)) {
                generatedLines.push(currentLine);
                currentLine = [];
                lineWordCount = 0;
            }
        });

        if (currentLine.length > 0) {
            generatedLines.push(currentLine);
        }
        
        return generatedLines;
    }, [subtitles]);

    useEffect(() => {
        if (!isResponding) {
            // Reset state when AI is not responding
            setCurrentLineIndex(0);
            setActiveWordIndex(-1);
            cancelAnimationFrame(animationFrameId.current);
            return;
        }

        const update = () => {
            if (!audioPlayer.current) {
                animationFrameId.current = requestAnimationFrame(update);
                return;
            }

            const currentTime = audioPlayer.current.currentTime;
            let foundActiveWord = false;

            for (let i = 0; i < lines.length; i++) {
                const line = lines[i];
                for (let j = 0; j < line.length; j++) {
                    const word = line[j];
                    if (currentTime >= word.startTime && currentTime <= word.endTime) {
                        if (i !== currentLineIndex) {
                            setCurrentLineIndex(i);
                        }
                        setActiveWordIndex(j);
                        foundActiveWord = true;
                        break;
                    }
                }
                if (foundActiveWord) break;
            }
            
            animationFrameId.current = requestAnimationFrame(update);
        };

        animationFrameId.current = requestAnimationFrame(update);

        return () => {
            cancelAnimationFrame(animationFrameId.current);
        };

    }, [isResponding, lines, audioPlayer, currentLineIndex]);


    if (!isResponding || lines.length === 0) {
        return null;
    }

    return (
        <div className="animated-subtitles-container">
            <TransitionGroup>
                {lines.map((line, lineIndex) => 
                    lineIndex === currentLineIndex && (
                    <CSSTransition
                        key={lineIndex}
                        timeout={300}
                        classNames="line"
                    >
                        <p className="subtitle-line">
                            {line.map((word, wordIndex) => {
                                const isSpoken = wordIndex < activeWordIndex;
                                const isActive = wordIndex === activeWordIndex;
                                return (
                                    <span 
                                        key={wordIndex}
                                        className={`subtitle-word ${isActive ? 'active' : ''} ${isSpoken ? 'spoken' : ''}`}
                                    >
                                        {word.text}
                                    </span>
                                );
                            })}
                        </p>
                    </CSSTransition>
                ))}
            </TransitionGroup>
        </div>
    );
};

export default AnimatedSubtitles; 