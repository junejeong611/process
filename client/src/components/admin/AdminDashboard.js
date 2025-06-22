import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './AdminDashboard.css';

const AdminDashboard = () => {
    const [metrics, setMetrics] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchMetrics = async () => {
            try {
                setLoading(true);
                const response = await axios.get('/api/admin/metrics');
                setMetrics(response.data);
                setError(null);
            } catch (err) {
                setError('Failed to fetch performance metrics.');
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        fetchMetrics();
        // Set up a polling interval to refresh metrics every 5 seconds
        const intervalId = setInterval(fetchMetrics, 5000);

        // Cleanup interval on component unmount
        return () => clearInterval(intervalId);
    }, []);
    
    const getStatusClass = (value, goodThreshold, warningThreshold) => {
        if (value === 0 && loading) return 'pending';
        if (value <= goodThreshold) return 'good';
        if (value <= warningThreshold) return 'warning';
        return 'bad';
    };
    
    const getSuccessRateStatusClass = (rate) => {
        if (rate >= 99.5) return 'good';
        if (rate >= 95) return 'warning';
        return 'bad';
    };

    if (loading && !metrics) {
        return <div className="admin-dashboard"><h2>Loading metrics...</h2></div>;
    }

    if (error) {
        return <div className="admin-dashboard"><div className="error-card">{error}</div></div>;
    }

    if (!metrics) {
        return <div className="admin-dashboard"><h2>No metrics available.</h2></div>;
    }

    const { streamingPerformance, apiHealth } = metrics;

  return (
    <div className="admin-dashboard">
      <header className="admin-header">
        <h1>Admin Dashboard</h1>
        <p>Streaming Performance & API Health</p>
      </header>
      
      <div className="admin-widgets-grid">
        <div className="widget">
          <h2>Streaming Performance</h2>
          <div className="metric">
            <span>Text Mode Avg. First Chunk:</span>
            <span className="value">{streamingPerformance.textMode.avgFirstChunk.toFixed(0)} ms</span>
            <span className={`status-indicator ${getStatusClass(streamingPerformance.textMode.avgFirstChunk, 500, 1000)}`}></span>
          </div>
          <div className="metric">
            <span>Voice Mode Avg. Audio Start:</span>
            <span className="value">{streamingPerformance.voiceMode.avgAudioStart.toFixed(0)} ms</span>
            <span className={`status-indicator ${getStatusClass(streamingPerformance.voiceMode.avgAudioStart, 200, 400)}`}></span>
          </div>
          <div className="metric">
            <span>Audio Gaps Average:</span>
            <span className="value">{streamingPerformance.voiceMode.avgAudioGap.toFixed(0)} ms</span>
            <span className={`status-indicator ${getStatusClass(streamingPerformance.voiceMode.avgAudioGap, 50, 100)}`}></span>
          </div>
           <div className="metric">
            <span>Animation FPS:</span>
            <span className="value">--.- avg</span>
            <span className="status-indicator pending"></span>
          </div>
          <div className="metric">
            <span>Stream Success Rate:</span>
            <span className="value">{((streamingPerformance.textMode.successRate + streamingPerformance.voiceMode.successRate)/2).toFixed(1)}%</span>
            <span className={`status-indicator ${getSuccessRateStatusClass(((streamingPerformance.textMode.successRate + streamingPerformance.voiceMode.successRate)/2))}`}></span>
          </div>
        </div>
        
        <div className="widget">
          <h2>API Health Status</h2>
          <div className="metric">
            <span>Claude API Uptime:</span>
            <span className="value">{apiHealth.claude.successRate.toFixed(1)}%</span>
            <span className={`status-indicator ${getSuccessRateStatusClass(apiHealth.claude.successRate)}`}></span>
          </div>
          <div className="metric">
            <span>ElevenLabs API Uptime:</span>
            <span className="value">{apiHealth.elevenLabs.successRate.toFixed(1)}%</span>
            <span className={`status-indicator ${getSuccessRateStatusClass(apiHealth.elevenLabs.successRate)}`}></span>
          </div>
          <div className="metric">
            <span>Active Streams:</span>
            <span className="value">{apiHealth.activeStreams || 'N/A'}</span>
          </div>
          <div className="metric">
            <span>Error Rate (1hr):</span>
            <span className="value">{apiHealth.errorRate || 'N/A'}</span>
            <span className="status-indicator pending"></span>
          </div>
        </div>
      </div>
      <footer className="admin-footer">
        <p>Metrics collection pending implementation.</p>
      </footer>
    </div>
  );
};

export default AdminDashboard; 