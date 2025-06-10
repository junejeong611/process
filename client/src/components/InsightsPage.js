import React from 'react';
import { useNavigate } from 'react-router-dom';
import './InsightsPage.css';

const InsightsPage = () => {
  const navigate = useNavigate();

  React.useEffect(() => {
    document.title = 'Insights Coming Soon - Process';
    const meta = document.createElement('meta');
    meta.name = 'description';
    meta.content = 'Insights feature is coming soon to Process. We are working on something special for you!';
    document.head.appendChild(meta);
    return () => { document.head.removeChild(meta); };
  }, []);

  return (
    <div className="comingsoon-bg" role="main">
      <div className="insights-inner">
        <div className="comingsoon-center">
          <div className="comingsoon-card" tabIndex={0} aria-labelledby="insights-title" aria-describedby="insights-desc">
            <div className="comingsoon-loader" aria-hidden="true">
              <div className="comingsoon-spinner"></div>
            </div>
            <h1 id="insights-title" className="comingsoon-title">insights coming soon</h1>
            <p id="insights-desc" className="comingsoon-subtitle">we're working on something special for you</p>
            <div className="comingsoon-progress">
              <div className="comingsoon-progress-bar" style={{ width: '40%' }}></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InsightsPage; 