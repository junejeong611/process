import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import './InsightsPage.css';
import { useQuery } from 'react-query';

// Lazy load heavy components
const EmotionalTimelineChart = React.lazy(() => import('./analytics/EmotionalTimelineChart'));
const EmotionDistributionChart = React.lazy(() => import('./analytics/EmotionDistributionChart'));

// Helper function to get auth token (real implementation)
const getToken = () => {
  return localStorage.getItem('token') || sessionStorage.getItem('token');
};

// Helper function to get user ID from JWT token (real implementation)
const getUserId = () => {
  try {
    const token = getToken();
    if (!token) return null;
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = JSON.parse(atob(parts[1]));
    // Use 'userId' as the field for user ID (matches your JWT structure)
    return payload.userId || null;
  } catch (e) {
    console.error('Error extracting userId from token:', e);
    return null;
  }
};

// Analytics mock data
const MOCK_TRIGGER_FREQUENCY_DATA = [
  { trigger: 'perfectionism', thisWeek: 12, lastWeek: 8, thisMonth: 45 },
  { trigger: 'social validation', thisWeek: 8, lastWeek: 10, thisMonth: 32 },
  { trigger: 'fear of failure', thisWeek: 6, lastWeek: 12, thisMonth: 28 },
  { trigger: 'comparison', thisWeek: 4, lastWeek: 6, thisMonth: 18 },
  { trigger: 'rejection', thisWeek: 3, lastWeek: 4, thisMonth: 15 }
];

const MOCK_EMOTIONAL_TIMELINE = [
  { date: '2024-06-10', anxiety: 7, sadness: 3, joy: 2, anger: 1 },
  { date: '2024-06-11', anxiety: 5, sadness: 4, joy: 4, anger: 2 },
  { date: '2024-06-12', anxiety: 6, sadness: 2, joy: 6, anger: 1 },
  { date: '2024-06-13', anxiety: 8, sadness: 5, joy: 1, anger: 3 },
  { date: '2024-06-14', anxiety: 4, sadness: 2, joy: 7, anger: 1 },
  { date: '2024-06-15', anxiety: 3, sadness: 1, joy: 8, anger: 0 },
  { date: '2024-06-16', anxiety: 6, sadness: 3, joy: 5, anger: 2 }
];

const MOCK_WEEKLY_SUMMARY = {
  totalConversations: 12,
  averageMoodScore: 6.2,
  improvementFromLastWeek: 8.5,
  mostActiveDay: 'wednesday',
  dominantEmotion: 'anxiety',
  triggerReduction: 15,
  insights: [
    "your anxiety levels decreased by 15% compared to last week",
    "perfectionism triggers increased, consider practicing self-compassion",
    "you had your best emotional day on friday - what made it special?"
  ]
};

const EMOTIONAL_DISTRIBUTION_DATA = [
  { emotion: 'anxiety', value: 35, color: '#f97316' },
  { emotion: 'sadness', value: 25, color: '#3b82f6' },
  { emotion: 'joy', value: 30, color: '#10b981' },
  { emotion: 'anger', value: 10, color: '#ef4444' }
];

// Sample affirmations for practice mode when no insights available
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

// Cache constants
const INSIGHTS_CACHE_KEY = 'insightsCache';
const WEEKLY_SUMMARY_CACHE_KEY = 'weeklySummaryCache';
const EMOTIONAL_TIMELINE_CACHE_KEY = 'emotionalTimelineCache';
const EMOTION_DISTRIBUTION_CACHE_KEY = 'emotionDistributionCache';
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

// Generic cache helpers
const loadFromCache = (key) => {
  try {
    const cached = localStorage.getItem(key);
    if (!cached) return null;
    const { data, timestamp } = JSON.parse(cached);
    if (Date.now() - timestamp < CACHE_TTL) {
      return data;
    }
    return null;
  } catch {
    return null;
  }
};

const saveToCache = (key, data) => {
  try {
    localStorage.setItem(key, JSON.stringify({ data, timestamp: Date.now() }));
  } catch {}
};

const WeeklySummary = React.memo(() => {
  const userId = useMemo(() => getUserId(), []);
  
  const { data: summary, isLoading, error } = useQuery(
    ['weekly-summary', userId],
    async () => {
      const token = getToken();
      const response = await fetch(`/api/insights/${userId}/weekly-summary`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const result = await response.json();
      if (!result.success) throw new Error('Failed to load weekly summary');
      return result.data;
    },
    {
      staleTime: 5 * 60 * 1000,
      cacheTime: 30 * 60 * 1000,
      retry: 2
    }
  );

  if (isLoading) {
    return <div className="chart-loading">Loading weekly summary...</div>;
  }

  if (error) {
    return <div className="chart-error">{error.message}</div>;
  }

  if (!summary) {
    return <div className="chart-error">No summary data available.</div>;
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

// EmotionalTimelineChart is now imported lazily at the top of the file

const EmotionDistributionChart = () => {
  const userId = useMemo(() => getUserId(), []);
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedPeriod, setSelectedPeriod] = useState('week');

  const fetchDistribution = useCallback(async (period, isRefresh = false) => {
    setLoading(true);
    setError('');
    try {
      // Try cache first if not refreshing
      if (!isRefresh) {
        const cacheKey = `${EMOTION_DISTRIBUTION_CACHE_KEY}_${period}`;
        const cachedData = loadFromCache(cacheKey);
        if (cachedData) {
          setData(cachedData);
          setLoading(false);
          return;
        }
      }

      const token = getToken();
      const response = await fetch(`/api/insights/${userId}/emotional-distribution?period=${period}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const result = await response.json();
      if (result.success) {
        setData(result.data);
        // Cache the result
        saveToCache(`${EMOTION_DISTRIBUTION_CACHE_KEY}_${period}`, result.data);
      } else {
        setError('Failed to load emotional distribution data');
      }
    } catch (err) {
      setError('Unable to load emotional distribution data');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchDistribution(selectedPeriod);
  }, [selectedPeriod, fetchDistribution]);

  if (loading) {
    return <div className="chart-loading">Loading emotional distribution...</div>;
  }
  if (error) {
    return <div className="chart-error">{error}</div>;
  }
  if (!data.length || data.every(e => e.value === 0)) {
    return (
      <div className="empty-emotion-distribution">
        <div className="empty-state-message" style={{ textAlign: 'center' }}>
          <h4>No emotional distribution data yet</h4>
          <p>Share more about how you're feeling to see your emotional breakdown.</p>
        </div>
      </div>
    );
  }

  const colorMap = {
    anger: '#ef4444',
    sadness: '#3b82f6',
    fear: '#f97316',
    shame: '#a855f7',
    disgust: '#10b981'
  };

  return (
    <>
      <div className="section-header-simple">
        <h3>Emotional Distribution</h3>
        <p>breakdown of your emotional states</p>
      </div>
      <div className="pie-chart-container">
        <ResponsiveContainer width="100%" height={400} aspect={2}>
          <PieChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={80}
              outerRadius={160}
              dataKey="value"
              nameKey="emotion"
              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              labelLine={false}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={colorMap[entry.emotion] || '#8884d8'} />
              ))}
            </Pie>
            <Tooltip formatter={(value) => `${value}%`} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="emotion-legend-small">
        {data.map((emotion, index) => (
          <div key={emotion.emotion} className="emotion-legend-item-small">
            <div className="legend-color-small" style={{ backgroundColor: colorMap[emotion.emotion] }}></div>
            <span className="legend-label-small">{emotion.emotion}</span>
          </div>
        ))}
      </div>
      <div className="period-selector" style={{ marginTop: '1rem' }}>
        <button
          onClick={() => setSelectedPeriod('week')}
          className={selectedPeriod === 'week' ? 'active' : ''}
        >
          this week
        </button>
        <button
          onClick={() => setSelectedPeriod('month')}
          className={selectedPeriod === 'month' ? 'active' : ''}
        >
          this month
        </button>
      </div>
    </>
  );
};

const InsightsPage = () => {
  const [activeTab, setActiveTab] = useState('insights');
  const [expandedSections, setExpandedSections] = useState({
    triggers: false,
    beliefs: false,
    affirmations: false
  });
  const [practiceMode, setPracticeMode] = useState(false);
  const [currentAffirmationIndex, setCurrentAffirmationIndex] = useState(0);
  
  const userId = useMemo(() => getUserId(), []);

  const { data: insights, isLoading, error, refetch } = useQuery(
    ['insights', userId],
    async () => {
      const token = getToken();
      const response = await fetch(`/api/insights/${userId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const result = await response.json();
      if (!result.success) throw new Error('Failed to load insights');
      return result.data;
    },
    {
      staleTime: 5 * 60 * 1000,
      cacheTime: 30 * 60 * 1000,
      retry: 2
    }
  );

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
      <div className="insights-page">
        <div className="error-state">
          <div className="error-icon">
            <svg width="48" height="48" fill="none" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10" stroke="#e53e3e" strokeWidth="2" fill="#fff" />
              <path d="M12 8v4" stroke="#e53e3e" strokeWidth="2" strokeLinecap="round" />
              <circle cx="12" cy="16" r="1" fill="#e53e3e" />
            </svg>
          </div>
          <p className="error-message">{error.message}</p>
          <button className="retry-button" onClick={() => refetch()}>
            Try Again
          </button>
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
            <button className="back-button" onClick={exitPractice}>
              <svg width="20" height="20" fill="none" viewBox="0 0 24 24">
                <path stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M19 12H5m7-7l-7 7 7 7"/>
              </svg>
              Back to Insights
            </button>
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
        <div className="header-content">
          <h1>Your Emotional Insights</h1>
          <p>understanding your emotional patterns</p>
          <div className="header-meta">
            <span className="last-updated">Last updated: {lastUpdated}</span>
            <button 
              className={`refresh-button ${isLoading ? 'refreshing' : ''}`}
              onClick={() => refetch()}
              disabled={isLoading}
            >
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24">
                <path stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M1 4v6h6M23 20v-6h-6"/>
                <path stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"/>
              </svg>
              {isLoading ? 'Refreshing...' : 'Refresh Insights'}
            </button>
          </div>
        </div>
        
        {/* Quick Actions */}
        <div className="quick-actions">
          <button 
            className="practice-button primary"
            onClick={startPractice}
          >
            <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
            </svg>
            Practice Affirmations
          </button>
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

export default InsightsPage;