import { AxiosError } from 'axios';

/**
 * Error message mappings for user-friendly display
 */
export const ERROR_MESSAGES: Record<string, string> = {
  // Authentication errors
  AUTHENTICATION_ERROR: 'Invalid email or password. Please try again.',
  INVALID_CREDENTIALS: 'Invalid email or password. Please try again.',
  ACCOUNT_LOCKED: 'Your account has been temporarily locked due to multiple failed login attempts. Please try again later.',
  EMAIL_NOT_VERIFIED: 'Please verify your email address before logging in.',
  TOKEN_EXPIRED: 'Your session has expired. Please log in again.',
  INVALID_TOKEN: 'Invalid authentication token. Please log in again.',
  
  // Authorization errors
  AUTHORIZATION_ERROR: 'You do not have permission to access this resource.',
  ACCESS_DENIED: 'Access denied. You do not have the required permissions.',
  ADMIN_ONLY: 'This feature is only available to administrators.',
  
  // Validation errors
  VALIDATION_ERROR: 'Please check your input and try again.',
  INVALID_EMAIL: 'Please enter a valid email address.',
  WEAK_PASSWORD: 'Password must be at least 8 characters long and include uppercase, lowercase, and numbers.',
  PASSWORDS_DONT_MATCH: 'Passwords do not match.',
  REQUIRED_FIELD: 'This field is required.',
  INVALID_COORDINATES: 'Invalid location coordinates. Please try again.',
  
  // Conflict errors
  CONFLICT_ERROR: 'This operation conflicts with existing data.',
  EMAIL_EXISTS: 'An account with this email address already exists.',
  DUPLICATE_ENTRY: 'This entry already exists.',
  
  // Not found errors
  NOT_FOUND: 'The requested resource was not found.',
  USER_NOT_FOUND: 'User not found.',
  ROUTE_NOT_FOUND: 'Route not found.',
  
  // Rate limiting
  RATE_LIMIT_ERROR: 'Too many requests. Please slow down and try again in a few moments.',
  API_QUOTA_EXCEEDED: 'API quota exceeded. Please try again later.',
  
  // External service errors
  EXTERNAL_SERVICE_ERROR: 'An external service is temporarily unavailable. Please try again later.',
  ROUTE_API_ERROR: 'Unable to calculate route at this time. Please try again later.',
  ROUTE_API_UNAVAILABLE: 'Route calculation service is temporarily unavailable. Please try again later.',
  EMAIL_SERVICE_ERROR: 'Unable to send email at this time. Please try again later.',
  
  // Database errors
  DATABASE_ERROR: 'A database error occurred. Please try again later.',
  CONNECTION_ERROR: 'Unable to connect to the database. Please try again later.',
  
  // Network errors
  NETWORK_ERROR: 'Network error. Please check your internet connection and try again.',
  TIMEOUT_ERROR: 'Request timed out. Please try again.',
  NO_RESPONSE: 'No response from server. Please check your connection and try again.',
  
  // Generic errors
  INTERNAL_ERROR: 'An unexpected error occurred. Please try again later.',
  UNKNOWN_ERROR: 'An unknown error occurred. Please try again.',
};

/**
 * Get user-friendly error message from error object
 */
export function getErrorMessage(error: any): string {
  // Handle Axios errors
  if (error.response) {
    // Server responded with error status
    const errorData = error.response.data;
    
    // Check for error code in response
    if (errorData?.error?.code && ERROR_MESSAGES[errorData.error.code]) {
      return ERROR_MESSAGES[errorData.error.code];
    }
    
    // Check for error message in response
    if (errorData?.error?.message) {
      return errorData.error.message;
    }
    
    // Fallback to status code messages
    switch (error.response.status) {
      case 400:
        return 'Invalid request. Please check your input and try again.';
      case 401:
        return 'Authentication required. Please log in.';
      case 403:
        return 'You do not have permission to perform this action.';
      case 404:
        return 'The requested resource was not found.';
      case 409:
        return 'This operation conflicts with existing data.';
      case 429:
        return ERROR_MESSAGES.RATE_LIMIT_ERROR;
      case 500:
        return 'Server error. Please try again later.';
      case 502:
        return 'Bad gateway. The server is temporarily unavailable.';
      case 503:
        return 'Service unavailable. Please try again later.';
      case 504:
        return 'Gateway timeout. Please try again.';
      default:
        return ERROR_MESSAGES.INTERNAL_ERROR;
    }
  } else if (error.request) {
    // Request was made but no response received
    return ERROR_MESSAGES.NO_RESPONSE;
  } else if (error.code) {
    // Network or other errors with error codes
    if (ERROR_MESSAGES[error.code]) {
      return ERROR_MESSAGES[error.code];
    }
    
    // Handle specific error codes
    switch (error.code) {
      case 'ECONNABORTED':
      case 'ETIMEDOUT':
        return ERROR_MESSAGES.TIMEOUT_ERROR;
      case 'ERR_NETWORK':
      case 'ENOTFOUND':
      case 'ECONNREFUSED':
        return ERROR_MESSAGES.NETWORK_ERROR;
      default:
        return ERROR_MESSAGES.UNKNOWN_ERROR;
    }
  }
  
  // Fallback to error message or generic message
  return error.message || ERROR_MESSAGES.UNKNOWN_ERROR;
}

/**
 * Check if error is retryable
 */
export function isRetryableError(error: any): boolean {
  // Network errors are retryable
  if (error.code === 'ERR_NETWORK' || error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
    return true;
  }
  
  // 5xx server errors are retryable
  if (error.response?.status >= 500 && error.response?.status < 600) {
    return true;
  }
  
  // 408 Request Timeout is retryable
  if (error.response?.status === 408) {
    return true;
  }
  
  // 429 Rate Limit might be retryable after delay
  if (error.response?.status === 429) {
    return true;
  }
  
  return false;
}

/**
 * Get retry delay from error response (for rate limiting)
 */
export function getRetryDelay(error: any): number {
  // Check for Retry-After header
  const retryAfter = error.response?.headers['retry-after'];
  
  if (retryAfter) {
    // If it's a number, it's seconds
    const seconds = parseInt(retryAfter, 10);
    if (!isNaN(seconds)) {
      return seconds * 1000;
    }
    
    // If it's a date, calculate difference
    const retryDate = new Date(retryAfter);
    if (!isNaN(retryDate.getTime())) {
      return Math.max(0, retryDate.getTime() - Date.now());
    }
  }
  
  // Default retry delay based on status code
  if (error.response?.status === 429) {
    return 60000; // 1 minute for rate limiting
  }
  
  return 5000; // 5 seconds default
}
