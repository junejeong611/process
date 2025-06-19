import React, { useState, useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
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

const colorMap = {
  anger: '#ef4444',
  sadness: '#3b82f6',
  fear: '#f97316',
  shame: '#a855f7',
  disgust: '#10b981'
};

const EmotionDistributionChart = () => {
  const [selectedPeriod, setSelectedPeriod] = useState('week');
  const userId = useMemo(() => getUserId(), []);

  const { data, isLoading, error } = useQuery({
    queryKey: ['emotion-distribution', selectedPeriod, userId],
    queryFn: async () => {
      const token = getToken();
      const response = await fetch(`/api/insights/${userId}/emotional-distribution?period=${selectedPeriod}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const result = await response.json();
      if (!result.success) throw new Error('Failed to load emotional distribution data');
      return result.data;
    },
    staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
    cacheTime: 30 * 60 * 1000, // Keep unused data in cache for 30 minutes
    retry: 2
  });

  if (isLoading) {
    return <div className="chart-loading">Loading emotional distribution...</div>;
  }

  if (error) {
    return <div className="chart-error">{error.message}</div>;
  }

  if (!data?.length || data.every(e => e.value === 0)) {
    return (
      <div className="empty-emotion-distribution">
        <div className="empty-state-message" style={{ textAlign: 'center' }}>
          <h4>No emotional distribution data yet</h4>
          <p>Share more about how you're feeling to see your emotional breakdown.</p>
        </div>
      </div>
    );
  }

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
        {data.map((emotion) => (
          <div key={emotion.emotion} className="emotion-legend-item-small">
            <div 
              className="legend-color-small" 
              style={{ backgroundColor: colorMap[emotion.emotion] }}
            />
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

export default React.memo(EmotionDistributionChart); 