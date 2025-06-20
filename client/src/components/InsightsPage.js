import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import './InsightsPage.css';

// Lazy load heavy components
const EmotionalTimelineChart = React.lazy(() => import('./analytics/EmotionalTimelineChart'));
const EmotionDistributionChart = React.lazy(() => import('./analytics/EmotionDistributionChart'));

// Helper functions
const getToken = () => localStorage.getItem('token') || sessionStorage.getItem('token');
const getUserId = () => {
  try {
    const token = getToken();
    if (!token) return null;
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.userId || null;
  } catch (e) {
    console.error('Error extracting userId from token:', e);
    return null;
  }
};

// Default affirmations when no insights available
const DEFAULT_AFFIRMATIONS = [
  "i am enough just as i am",
  "i am worthy of love and kindness",
  "i have the strength to face challenges",
  "i am learning and healing every day",
  "i am safe in this moment",
  "i deserve joy and peace",
  "i am not alone in my experiences",
  "i am capable of growth and change"
];

const WeeklySummary = React.memo(() => {
  const userId = useMemo(() => getUserId(), []);
  
  const { data: summary, isLoading, error, refetch } = useQuery({
    queryKey: ['weekly-summary', userId],
    queryFn: async () => {
      const token = getToken();
      const response = await fetch(`/api/insights/${userId}/weekly-summary`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const result = await response.json();
      if (!result.success) throw new Error('failed to load weekly summary');
      return result.data;
    }
  });

  if (isLoading) {
    return <div className="chart-loading">loading weekly summary...</div>;
  }

  if (error) {
    return (
      <div className="error-container">
        <div className="error-card">
          <div className="error-icon-lock">
            <svg width="48" height="48" fill="none" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" stroke="#e53e3e" strokeWidth="1.5" />
                <path d="M12 7v6" stroke="#e53e3e" strokeWidth="1.5" strokeLinecap="round" />
                <circle cx="12" cy="16" r="1" fill="#e53e3e" />
            </svg>
          </div>
          <h3 className="error-title-text">could not load summary</h3>
          <p className="error-message-text">{error.message}</p>
          <div className="error-actions">
            <button className="refresh-button-centered" onClick={() => refetch()}>
              try again
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!summary) {
    return <div className="chart-error">no summary data available.</div>;
  }

  return (
    <>
      <div className="section-header-simple">
        <h3>Weekly Emotional Summary</h3>
      </div>
      <div className="weekly-summary-grid">
        <div className="summary-stats">
          <div className="stat-card">
            <div className="stat-value conversations">{summary.totalConversations}</div>
            <div className="stat-label">conversations</div>
          </div>
          <div className="stat-card">
            <div className="stat-value mood">{summary.averageMoodScore}</div>
            <div className="stat-label">avg mood</div>
          </div>
          <div className="stat-card">
            <div className="stat-value improvement">
              {summary.improvementFromLastWeek > 0 ? '+' : ''}{summary.improvementFromLastWeek}%
            </div>
            <div className="stat-label">improvement</div>
          </div>
          <div className="stat-card">
            <div className="stat-value triggers">
              {summary.triggerReduction > 0 ? '-' : ''}{summary.triggerReduction}%
            </div>
            <div className="stat-label">triggers</div>
          </div>
        </div>
      </div>
      <div className="weekly-insights">
        <h4>Key Insights This Week</h4>
        <div className="insights-list">
          {summary.insights.map((insight, index) => (
            <div key={index} className="insight-item">
              <div className="insight-bullet"></div>
              <p>{insight}</p>
            </div>
          ))}
        </div>
      </div>
    </>
  );
});

const InsightsContent = () => {
  const [activeTab, setActiveTab] = useState('insights');
  const [expandedSections, setExpandedSections] = useState({
    triggers: false,
    beliefs: false,
    affirmations: false
  });
  const [practiceMode, setPracticeMode] = useState(false);
  const [currentAffirmationIndex, setCurrentAffirmationIndex] = useState(0);
  
  const userId = useMemo(() => getUserId(), []);

  const { data: insights, isLoading, error, refetch, isFetching, dataUpdatedAt } = useQuery({
    queryKey: ['insights', userId],
    queryFn: async () => {
      const token = getToken();
      const response = await fetch(`/api/insights/${userId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const result = await response.json();
      if (!result.success) throw new Error('Failed to load insights');
      return result.data;
    }
  });

  const practiceAffirmations = useMemo(() => {
    if (insights?.insights?.affirmations?.length > 0) {
      return insights.insights.affirmations.map(item => 
        typeof item === 'string' ? item : item.text || item.affirmation || item.content
      ).filter(Boolean);
    }
    return DEFAULT_AFFIRMATIONS;
  }, [insights]);

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const startPractice = () => {
    setPracticeMode(true);
    setCurrentAffirmationIndex(0);
  };

  const nextAffirmation = () => {
    setCurrentAffirmationIndex(prev => 
      (prev + 1) % practiceAffirmations.length
    );
  };

  const exitPractice = () => {
    setPracticeMode(false);
    setCurrentAffirmationIndex(0);
  };

  const hasEnoughData = insights?.messages?.length >= 5;

  const lastUpdatedText = dataUpdatedAt
    ? `Last updated: ${new Date(dataUpdatedAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
      })}`
    : 'Recently';

  if (isLoading) {
    return (
      <div className="loading-state">
        <div className="loading-spinner" />
        <p>Generating insights from your conversations...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-container">
        <div className="error-card">
          <div className="error-icon-lock">
            <svg width="48" height="48" fill="none" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" stroke="#e53e3e" strokeWidth="1.5" />
                <path d="M12 7v6" stroke="#e53e3e" strokeWidth="1.5" strokeLinecap="round" />
                <circle cx="12" cy="16" r="1" fill="#e53e3e" />
            </svg>
          </div>
          <h3 className="error-title-text">application error</h3>
          <p className="error-message-text">{error.message || 'something went wrong. please refresh the page.'}</p>
          <div className="error-actions">
            <button className="refresh-button-centered" onClick={() => refetch()}>
              refresh page
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Practice mode view
  if (practiceMode) {
    const currentAffirmation = practiceAffirmations[currentAffirmationIndex];
    return (
      <div className="insights-page practice-mode">
        <div className="practice-container">
          <div className="practice-header">
            <div className="back-navigation">
              <Link to="#" onClick={exitPractice} className="back-link" aria-label="Back to insights">
                <span className="back-icon">&#8592;</span> back
              </Link>
            </div>
            <h2>Daily Affirmation Practice</h2>
            <p>Take a moment to breathe and repeat this affirmation</p>
          </div>
          
          <div className="affirmation-card">
            <div className="affirmation-text">"{currentAffirmation}"</div>
            <div className="affirmation-meta">
              <span className="affirmation-counter">
                {currentAffirmationIndex + 1} of {practiceAffirmations.length}
              </span>
            </div>
          </div>
          
          <div className="practice-actions">
            <button className="next-affirmation-button" onClick={nextAffirmation}>
              Next Affirmation
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24">
                <path stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M5 12h14m-7-7l7 7-7 7"/>
              </svg>
            </button>
          </div>
          
          <div className="practice-tip">
            <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
            </svg>
            <span>Repeat this affirmation aloud or silently. Let yourself truly feel and believe these words.</span>
          </div>
        </div>
      </div>
    );
  }

  // Insufficient data view
  if (!hasEnoughData) {
    return (
      <div className="insights-page">
        <div className="insights-header">
          <h1>Your Emotional Insights</h1>
          <p>understanding your emotional patterns</p>
        </div>
        
        <div className="insufficient-data-state">
          <div className="insufficient-data-card">
            <div className="insufficient-data-icon">
              <svg width="64" height="64" fill="none" viewBox="0 0 24 24">
                <path stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
              </svg>
            </div>
            <h3>Keep Sharing to Unlock Insights</h3>
            <p>
              We need a few more conversations to generate meaningful insights about your emotional patterns. 
              Keep chatting with me to help build a picture of your emotional journey.
            </p>
            <div className="progress-indicator">
              <div className="progress-bar">
                <div 
                  className="progress-fill" 
                  style={{ width: `${Math.min((insights?.messages?.length || 0) / 5 * 100, 100)}%` }}
                />
              </div>
              <span className="progress-text">
                {insights?.messages?.length || 0} of 5 conversations needed
              </span>
            </div>
            <div className="insufficient-data-actions">
              <button 
                className="start-conversation-button"
                onClick={() => window.location.href = '/chat'}
              >
                Continue Chatting
                <svg width="16" height="16" fill="none" viewBox="0 0 24 24">
                  <path stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M5 12h14m-7-7l7 7-7 7"/>
                </svg>
              </button>
              <button 
                className="practice-affirmations-button secondary"
                onClick={startPractice}
              >
                Practice Daily Affirmations
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Main insights view
  const lastUpdated = insights?.messages?.[0]?.createdAt 
    ? new Date(insights.messages[0].createdAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long', 
        day: 'numeric'
      })
    : 'Recently';

  return (
    <div className="insights-page">
      {/* Header */}
      <div className="insights-header">
        <div className="header-top-row">
          <div className="header-content">
            <h1>Your Emotional Insights</h1>
            <p>understanding your emotional patterns</p>
            <span className="last-updated">{lastUpdatedText}</span>
          </div>
          
          <div className="header-actions">
            <button 
              className="practice-button primary"
              onClick={startPractice}
            >
              <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
              </svg>
              Practice Affirmations
            </button>
            <button 
              className={`refresh-button ${isFetching ? 'refreshing' : ''}`}
              onClick={() => refetch()}
              disabled={isFetching}
            >
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24">
                <path stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M1 4v6h6M23 20v-6h-6"/>
                <path stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"/>
              </svg>
              {isFetching ? 'Refreshing...' : 'Refresh Insights'}
            </button>
          </div>
        </div>
        
        {/* Tab Navigation */}
        <div className="tab-navigation">
          <button
            onClick={() => setActiveTab('insights')}
            className={`tab-button ${activeTab === 'insights' ? 'active' : ''}`}
          >
            Insights & Affirmations
          </button>
          <button
            onClick={() => setActiveTab('analytics')}
            className={`tab-button ${activeTab === 'analytics' ? 'active' : ''}`}
          >
            Analytics & Trends
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="insights-content">
        {activeTab === 'insights' ? (
          <>
            {/* Trigger Themes Section */}
            <div className="insights-section">
              <div 
                className="section-header"
                onClick={() => toggleSection('triggers')}
              >
                <div className="section-title">
                  <div className="section-icon triggers">
                    <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                    </svg>
                  </div>
                  <div>
                    <h2>Trigger Themes</h2>
                    <p>Emotional patterns that activate your responses</p>
                  </div>
                </div>
                <div className={`expand-icon ${expandedSections.triggers ? 'expanded' : ''}`}>
                  <svg width="20" height="20" fill="none" viewBox="0 0 24 24">
                    <path stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M6 9l6 6 6-6"/>
                  </svg>
                </div>
              </div>
              
              {expandedSections.triggers && (
                <div className="section-content">
                  {insights?.insights?.triggerThemes?.length > 0 ? (
                    <div className="insights-grid">
                      {insights.insights.triggerThemes.map((trigger, index) => (
                        <div key={index} className="insight-card trigger-card">
                          <h4>{trigger.theme || trigger.title || 'Emotional Trigger'}</h4>
                          <p>{trigger.explanation || trigger.description || trigger.text || trigger}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="no-insights">
                      <p>No specific trigger themes identified yet. As we chat more, we'll better understand your emotional patterns.</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Affirmations Section */}
            <div className="insights-section">
              <div 
                className="section-header"
                onClick={() => toggleSection('affirmations')}
              >
                <div className="section-title">
                  <div className="section-icon affirmations">
                    <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                    </svg>
                  </div>
                  <div>
                    <h2>Healing Affirmations</h2>
                    <p>Positive statements to counter negative beliefs</p>
                  </div>
                </div>
                <div className={`expand-icon ${expandedSections.affirmations ? 'expanded' : ''}`}>
                  <svg width="20" height="20" fill="none" viewBox="0 0 24 24">
                    <path stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M6 9l6 6 6-6"/>
                  </svg>
                </div>
              </div>
              
              {expandedSections.affirmations && (
                <div className="section-content">
                  {insights?.insights?.affirmations?.length > 0 ? (
                    <div className="insights-grid">
                      {insights.insights.affirmations.map((affirmation, index) => (
                        <div key={index} className="insight-card affirmation-card">
                          <div className="affirmation-text">
                            "{typeof affirmation === 'string' ? affirmation : affirmation.text || affirmation.affirmation || affirmation.content}"
                          </div>
                          {affirmation.explanation && (
                            <p className="affirmation-explanation">{affirmation.explanation}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="no-insights">
                      <p>Personalized affirmations will appear here based on your conversations. You can still practice with general affirmations above.</p>
                    </div>
                  )}
                  
                  <div className="section-action">
                    <button 
                      className="practice-section-button"
                      onClick={startPractice}
                    >
                      Practice These Affirmations
                      <svg width="16" height="16" fill="none" viewBox="0 0 24 24">
                        <path stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M5 12h14m-7-7l7 7-7 7"/>
                      </svg>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Summary Section */}
            {insights?.insights?.summary && (
              <div className="insights-section">
                <div className="section-content">
                  <div className="insights-summary">
                    <h3>Summary</h3>
                    <p>{insights.insights.summary}</p>
                  </div>
                </div>
              </div>
            )}
          </>
        ) : (
          // Analytics Content
          <React.Suspense fallback={<div className="loading-state">Loading analytics...</div>}>
            {/* Weekly Summary */}
            <div className="insights-section">
              <WeeklySummary />
            </div>

            {/* Emotional Timeline Chart */}
            <div className="insights-section">
              <EmotionalTimelineChart />
            </div>

            {/* Emotional Distribution Chart */}
            <div className="insights-section">
              <EmotionDistributionChart />
            </div>
          </React.Suspense>
        )}
      </div>
    </div>
  );
};

const InsightsPage = () => {
  return (
    <div className="insights-page">
      <div className="insights-content">
        <React.Suspense fallback={
          <div className="loading-state">
            <div className="loading-spinner" />
            <p>Loading insights...</p>
          </div>
        }>
          <InsightsContent />
        </React.Suspense>
      </div>
    </div>
  );
};

export default InsightsPage; 