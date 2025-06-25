import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useQuery } from '@tanstack/react-query';

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

const EmotionalTimelineChart = () => {
  const [selectedPeriod, setSelectedPeriod] = useState('week');
  const userId = useMemo(() => getUserId(), []);

  const { data: timelineData, isLoading, error } = useQuery({
    queryKey: ['emotional-timeline', selectedPeriod, userId],
    queryFn: async () => {
      const token = getToken();
      const response = await fetch(`/api/insights/${userId}/emotional-timeline?period=${selectedPeriod}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const result = await response.json();
      if (!result.success) throw new Error('Failed to load emotional timeline data');
      return result.data;
    },
    staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
    cacheTime: 30 * 60 * 1000, // Keep unused data in cache for 30 minutes
    retry: 2
  });

  if (isLoading) {
    return <div className="chart-loading">Loading emotional timeline...</div>;
  }

  if (error) {
    return <div className="chart-error">{error.message}</div>;
  }

  const isEmpty = !timelineData?.length || timelineData.every(day =>
    ['anger', 'sadness', 'fear', 'shame', 'disgust'].every(emotion => day[emotion] === 0)
  );

  if (isEmpty) {
    return (
      <div className="empty-emotional-timeline">
        <div className="empty-state-message" style={{ textAlign: 'center' }}>
          <p>No emotional timeline identified yet. As we chat more, your emotional timeline will appear here to support your healing journey.</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="section-header-simple">
        <h3>emotional timeline</h3>
        <p>your emotional patterns over the past {selectedPeriod}</p>
        <div className="period-selector">
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
      </div>

      <div className="chart-container">
        <ResponsiveContainer width="100%" height={400} aspect={2.5}>
          <LineChart data={timelineData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis 
              dataKey="date" 
              tick={{ fontSize: 12, fill: '#64748b' }}
              tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { weekday: 'short' })}
            />
            <YAxis tick={{ fontSize: 12, fill: '#64748b' }} domain={[0, 10]} />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'white', 
                border: '1px solid #e2e8f0', 
                borderRadius: '8px',
                fontSize: '14px'
              }}
              labelFormatter={(label) => new Date(label).toLocaleDateString('en-US', { 
                weekday: 'long', 
                month: 'short', 
                day: 'numeric' 
              })}
            />
            <Line type="monotone" dataKey="anger" stroke="#ef4444" strokeWidth={2} dot={{ r: 4 }} name="anger" />
            <Line type="monotone" dataKey="sadness" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} name="sadness" />
            <Line type="monotone" dataKey="fear" stroke="#f97316" strokeWidth={2} dot={{ r: 4 }} name="fear" />
            <Line type="monotone" dataKey="shame" stroke="#a855f7" strokeWidth={2} dot={{ r: 4 }} name="shame" />
            <Line type="monotone" dataKey="disgust" stroke="#10b981" strokeWidth={2} dot={{ r: 4 }} name="disgust" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="emotion-legend">
        {['anger', 'sadness', 'fear', 'shame', 'disgust'].map(emotion => (
          <div key={emotion} className="emotion-legend-item">
            <div className="legend-color" style={{ 
              backgroundColor: {
                anger: '#ef4444',
                sadness: '#3b82f6',
                fear: '#f97316',
                shame: '#a855f7',
                disgust: '#10b981'
              }[emotion] 
            }}></div>
            <div className="legend-text">
              <div className="legend-label">{emotion}</div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
};

export default React.memo(EmotionalTimelineChart); 