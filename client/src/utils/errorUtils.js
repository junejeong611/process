// Shared error utility for standardized error card rendering

// Categorize error based on message and status code
export function categorizeError(error, statusCode = null) {
  if (!error) return { type: 'unknown', canRetry: true, severity: 'error' };
  const errorLower = error.toLowerCase();
  if (
    errorLower.includes('invalid email') ||
    errorLower.includes('invalid password') ||
    errorLower.includes('incorrect') ||
    errorLower.includes('wrong') ||
    errorLower.includes('invalid credentials') ||
    errorLower.includes('unauthorized') ||
    errorLower.includes('authentication failed') ||
    errorLower.includes('login failed') ||
    statusCode === 401 || statusCode === 403
  ) {
    return { type: 'auth', canRetry: true, severity: 'warning' };
  }
  if (
    errorLower.includes('locked') ||
    errorLower.includes('suspended') ||
    errorLower.includes('disabled') ||
    errorLower.includes('blocked')
  ) {
    return { type: 'account', canRetry: false, severity: 'error' };
  }
  if (
    errorLower.includes('network') ||
    errorLower.includes('connection') ||
    errorLower.includes('fetch') ||
    errorLower.includes('timeout') ||
    errorLower.includes('failed to fetch') ||
    errorLower.includes('no internet') ||
    errorLower.includes('wifi') ||
    errorLower.includes('offline') ||
    statusCode === 0 ||
    errorLower.includes('disconnected')
  ) {
    return { type: 'network', canRetry: true, severity: 'warning' };
  }
  if (
    errorLower.includes('rate limit') ||
    errorLower.includes('too many') ||
    errorLower.includes('throttle') ||
    statusCode === 429
  ) {
    return { type: 'rateLimit', canRetry: false, severity: 'warning' };
  }
  if (
    errorLower.includes('server') ||
    errorLower.includes('500') ||
    errorLower.includes('503') ||
    (statusCode >= 500 && statusCode < 600)
  ) {
    return { type: 'server', canRetry: true, severity: 'error' };
  }
  if (
    errorLower.includes('validation') ||
    errorLower.includes('invalid format') ||
    statusCode === 400
  ) {
    return { type: 'validation', canRetry: true, severity: 'warning' };
  }
  return { type: 'unknown', canRetry: true, severity: 'error' };
}

// Get emoji/icon for error type
export function getErrorIcon(category) {
  switch (category?.type) {
    case 'auth': return '🔐';
    case 'account': return '👤';
    case 'network': return '⚡';
    case 'rateLimit': return '⏰';
    case 'server': return '🔧';
    case 'validation': return '📝';
    default: return '⚠️';
  }
}

// Get error card variant class
export function getErrorVariantClass(type) {
  if (!type) return '';
  if (type === 'rateLimit') return 'error-card--rate-limit';
  return `error-card--${type}`;
}

// Get error title for error type
export function getErrorTitle(type) {
  switch (type) {
    case 'auth': return 'Login Failed';
    case 'account': return 'Account Issue';
    case 'network': return 'Connection Problem';
    case 'rateLimit': return 'Too Many Attempts';
    case 'server': return 'Server Error';
    case 'validation': return 'Validation Error';
    default: return 'Error';
  }
}

// Lowercase all text, but capitalize 'I' and "I'm"
export function smartLowercase(text) {
  if (!text) return '';
  let result = text.toLowerCase();
  // Capitalize 'i' when it's a standalone word
  result = result.replace(/\bi\b/g, 'I');
  // Capitalize "i'm" to "I'm"
  result = result.replace(/\bi'm\b/g, "I'm");
  return result;
} 