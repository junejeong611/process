import React from 'react';
import { VOICE_STATUSES, ERROR_TYPES } from '../contexts/VoiceContext';

// Error categorization for better user experience
const ERROR_CATEGORIES = {
  PERMISSION: {
    title: 'Microphone Access Required',
    message: 'Please allow microphone access to use voice features',
    action: 'Grant Permission',
    recoverable: true
  },
  NETWORK: {
    title: 'Connection Problem',
    message: 'Please check your internet connection and try again',
    action: 'Retry',
    recoverable: true
  },
  API: {
    title: 'Service Unavailable',
    message: 'Our voice services are temporarily unavailable',
    action: 'Try Again',
    recoverable: true
  },
  AUDIO: {
    title: 'Audio System Error',
    message: 'There was a problem with your audio device',
    action: 'Retry',
    recoverable: true
  },
  FATAL: {
    title: 'Application Error',
    message: 'Something went wrong. Please refresh the page',
    action: 'Refresh Page',
    recoverable: false
  }
};

class VoiceErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null,
      errorInfo: null,
      retryCount: 0,
      errorCategory: 'FATAL'
    };
    
    // Bind methods
    this.handleRetry = this.handleRetry.bind(this);
    this.handleRefresh = this.handleRefresh.bind(this);
    this.handleReportError = this.handleReportError.bind(this);
  }

  static getDerivedStateFromError(error) {
    // Categorize error for better UX
    let errorCategory = 'FATAL';
    
    if (error.name === 'NotAllowedError' || error.message?.includes('permission')) {
      errorCategory = 'PERMISSION';
    } else if (error.name === 'NetworkError' || error.message?.includes('network')) {
      errorCategory = 'NETWORK';
    } else if (error.name === 'ApiError' || error.message?.includes('API')) {
      errorCategory = 'API';
    } else if (error.name === 'AudioError' || error.message?.includes('audio')) {
      errorCategory = 'AUDIO';
    }

    return { 
      hasError: true, 
      error,
      errorCategory
    };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    
    // Enhanced error logging
    const errorData = {
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack
      },
      errorInfo,
      userAgent: navigator.userAgent,
      url: window.location.href,
      timestamp: new Date().toISOString(),
      retryCount: this.state.retryCount,
      category: this.state.errorCategory
    };

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.group('🚨 Voice Error Boundary');
      console.error('Error:', error);
      console.error('Error Info:', errorInfo);
      console.error('Full Error Data:', errorData);
      console.groupEnd();
    }

    // Send to error reporting service
    this.reportError(errorData);
  }

  reportError = (errorData) => {
    // Multiple error reporting options
    try {
      // Sentry
      if (window.Sentry) {
        window.Sentry.captureException(this.state.error, {
          tags: {
            component: 'VoiceErrorBoundary',
            category: this.state.errorCategory
          },
          extra: errorData
        });
      }

      // LogRocket
      if (window.LogRocket) {
        window.LogRocket.captureException(this.state.error);
      }

      // Custom analytics
      if (window.gtag) {
        window.gtag('event', 'exception', {
          description: this.state.error?.message || 'Unknown error',
          fatal: !ERROR_CATEGORIES[this.state.errorCategory]?.recoverable
        });
      }

      // Send to your own error endpoint
      if (this.props.onError) {
        this.props.onError(errorData);
      }

    } catch (reportingError) {
      console.warn('Failed to report error:', reportingError);
    }
  };

  handleRetry = async () => {
    const newRetryCount = this.state.retryCount + 1;
    
    // Limit retry attempts
    if (newRetryCount > 3) {
      this.setState({ errorCategory: 'FATAL' });
      return;
    }

    this.setState({ 
      hasError: false, 
      error: null, 
      errorInfo: null,
      retryCount: newRetryCount
    });

    // Category-specific retry actions
    switch (this.state.errorCategory) {
      case 'PERMISSION':
        try {
          if (navigator.mediaDevices?.getUserMedia) {
            await navigator.mediaDevices.getUserMedia({ audio: true });
          }
        } catch (error) {
          console.warn('Permission retry failed:', error);
        }
        break;
        
      case 'NETWORK':
        // Wait a moment before retry for network issues
        await new Promise(resolve => setTimeout(resolve, 1000));
        break;
        
      default:
        break;
    }

    // Notify parent component of retry
    if (this.props.onRetry) {
      this.props.onRetry(this.state.errorCategory, newRetryCount);
    }
  };

  handleRefresh = () => {
    window.location.reload();
  };

  handleReportError = () => {
    const errorText = encodeURIComponent(
      `Voice App Error Report\n\n` +
      `Error: ${this.state.error?.message || 'Unknown'}\n` +
      `Category: ${this.state.errorCategory}\n` +
      `Time: ${new Date().toISOString()}\n` +
      `URL: ${window.location.href}\n` +
      `User Agent: ${navigator.userAgent}`
    );
    
    const mailto = `mailto:support@yourapp.com?subject=Voice%20App%20Error&body=${errorText}`;
    window.open(mailto);
  };

  render() {
    if (this.state.hasError) {
      const category = ERROR_CATEGORIES[this.state.errorCategory] || ERROR_CATEGORIES.FATAL;
      const isRecoverable = category.recoverable && this.state.retryCount < 3;

      return (
        <div 
          className="voice-error-boundary"
          style={{
            fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
            background: 'rgba(255, 107, 107, 0.08)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 107, 107, 0.2)',
            borderLeft: '4px solid #FF6B6B',
            borderRadius: '16px',
            padding: '32px',
            margin: '32px auto',
            maxWidth: '520px',
            textAlign: 'center',
            boxShadow: '0 8px 32px rgba(255, 107, 107, 0.1)',
            animation: 'fadeIn 0.3s ease-out'
          }}
          role="alert"
          aria-live="assertive"
        >
          {/* Error Icon */}
          <div style={{ 
            fontSize: '48px', 
            marginBottom: '16px',
            filter: 'grayscale(20%)'
          }}>
            {this.state.errorCategory === 'PERMISSION' ? '🎤' : 
             this.state.errorCategory === 'NETWORK' ? '🌐' : 
             this.state.errorCategory === 'API' ? '⚡' : 
             this.state.errorCategory === 'AUDIO' ? '🔊' : '⚠️'}
          </div>

          {/* Error Title */}
          <h2 style={{ 
            color: '#FF6B6B', 
            fontSize: '24px', 
            fontWeight: '600',
            marginBottom: '12px',
            lineHeight: '1.3'
          }}>
            {category.title}
          </h2>

          {/* Error Message */}
          <p style={{ 
            color: '#4a5568', 
            fontSize: '16px', 
            marginBottom: '24px',
            lineHeight: '1.5',
            opacity: '0.8'
          }}>
            {category.message}
          </p>

          {/* Technical Details (Development) */}
          {process.env.NODE_ENV === 'development' && (
            <details style={{ 
              marginBottom: '24px', 
              textAlign: 'left',
              background: 'rgba(0,0,0,0.05)',
              padding: '12px',
              borderRadius: '8px',
              fontSize: '14px'
            }}>
              <summary style={{ cursor: 'pointer', fontWeight: '600' }}>
                Technical Details
              </summary>
              <pre style={{ 
                margin: '8px 0 0 0', 
                fontSize: '12px',
                overflow: 'auto',
                maxHeight: '200px'
              }}>
                {this.state.error?.stack}
              </pre>
            </details>
          )}

          {/* Retry Count Indicator */}
          {this.state.retryCount > 0 && (
            <p style={{ 
              fontSize: '14px', 
              color: '#718096',
              marginBottom: '16px' 
            }}>
              Attempt {this.state.retryCount + 1} of 3
            </p>
          )}

          {/* Action Buttons */}
          <div style={{ 
            display: 'flex', 
            gap: '12px', 
            justifyContent: 'center',
            flexWrap: 'wrap'
          }}>
            {isRecoverable ? (
              <button
                onClick={this.handleRetry}
                style={{
                  background: '#4A90E2',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '14px 28px',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 200ms ease',
                  boxShadow: '0 4px 12px rgba(74, 144, 226, 0.3)'
                }}
                onMouseOver={(e) => {
                  e.target.style.background = '#357ABD';
                  e.target.style.transform = 'translateY(-2px)';
                }}
                onMouseOut={(e) => {
                  e.target.style.background = '#4A90E2';
                  e.target.style.transform = 'translateY(0)';
                }}
              >
                {category.action}
              </button>
            ) : (
              <button
                onClick={this.handleRefresh}
                style={{
                  background: '#FF6B6B',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '14px 28px',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 200ms ease',
                  boxShadow: '0 4px 12px rgba(255, 107, 107, 0.3)'
                }}
              >
                {category.action}
              </button>
            )}

            {/* Report Bug Button */}
            <button
              onClick={this.handleReportError}
              style={{
                background: 'transparent',
                color: '#718096',
                border: '2px solid #E2E8F0',
                borderRadius: '12px',
                padding: '12px 24px',
                fontSize: '14px',
                cursor: 'pointer',
                transition: 'all 200ms ease'
              }}
              onMouseOver={(e) => {
                e.target.style.borderColor = '#CBD5E0';
                e.target.style.color = '#4A5568';
              }}
              onMouseOut={(e) => {
                e.target.style.borderColor = '#E2E8F0';
                e.target.style.color = '#718096';
              }}
            >
              Report Issue
            </button>
          </div>

          {/* Helpful Tips */}
          {this.state.errorCategory === 'PERMISSION' && (
            <div style={{ 
              marginTop: '24px', 
              padding: '16px',
              background: 'rgba(74, 144, 226, 0.08)',
              borderRadius: '12px',
              fontSize: '14px',
              lineHeight: '1.4'
            }}>
              <strong>💡 Tip:</strong> Look for a microphone icon in your browser's address bar and click "Allow"
            </div>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

// Add CSS animation
const style = document.createElement('style');
style.textContent = `
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
  }
`;
document.head.appendChild(style);

export default VoiceErrorBoundary;