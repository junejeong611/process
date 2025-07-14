import React from 'react';
import { VOICE_STATUSES, ERROR_TYPES } from '../contexts/VoiceContext';
import ErrorCard from './ErrorCard';

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
        <ErrorCard
          error={category.message}
          errorCategory={{ type: this.state.errorCategory.toLowerCase(), canRetry: isRecoverable }}
          onRetry={isRecoverable ? this.handleRetry : undefined}
          retryLabel={category.action}
        />
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