# Frontend Error Handling Guide

This document describes the comprehensive error handling system implemented in the frontend.

## Overview

The frontend uses a multi-layered error handling approach:
- Error Boundary components for React errors
- User-friendly error messages
- Toast notifications for user feedback
- Retry logic for transient failures
- Axios interceptors for API errors

## Error Boundary

The `ErrorBoundary` component catches React errors and prevents the entire app from crashing.

### Usage

```tsx
import { ErrorBoundary } from './components/ErrorBoundary';

// Wrap your app or specific components
<ErrorBoundary>
  <App />
</ErrorBoundary>

// With custom fallback UI
<ErrorBoundary
  fallback={<CustomErrorPage />}
  onError={(error, errorInfo) => {
    // Send to error tracking service
    console.error('Error caught:', error, errorInfo);
  }}
>
  <MyComponent />
</ErrorBoundary>
```

### Features
- Displays user-friendly error message
- Shows error details in development mode
- Provides "Try Again" and "Go to Home" buttons
- Prevents app crash from component errors

## User-Friendly Error Messages

The `errorMessages.ts` utility provides consistent, user-friendly error messages.

### Usage

```typescript
import { getErrorMessage, isRetryableError } from '../utils/errorMessages';

try {
  await apiCall();
} catch (error) {
  const userMessage = getErrorMessage(error);
  showToast(userMessage, 'error');
  
  if (isRetryableError(error)) {
    // Offer retry option
  }
}
```

### Error Message Mapping

The system maps error codes to user-friendly messages:

```typescript
// Backend error code
{ error: { code: 'AUTHENTICATION_ERROR' } }

// Becomes
"Invalid email or password. Please try again."
```

## Toast Notifications

Toast notifications provide non-intrusive user feedback.

### Using the useToast Hook

```tsx
import { useToast } from '../hooks/useToast';
import { ToastContainer } from '../components/Toast';

function MyComponent() {
  const { toasts, showSuccess, showError, showWarning, showInfo, removeToast } = useToast();
  
  const handleSubmit = async () => {
    try {
      await submitData();
      showSuccess('Data saved successfully!');
    } catch (error) {
      const message = getErrorMessage(error);
      showError(message);
    }
  };
  
  return (
    <>
      <button onClick={handleSubmit}>Submit</button>
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </>
  );
}
```

### Toast Types
- **success**: Green, for successful operations
- **error**: Red, for errors
- **warning**: Orange, for warnings
- **info**: Blue, for informational messages

## Retry Logic

The retry utility automatically retries failed operations with exponential backoff.

### Usage

```typescript
import { retryWithBackoff, withRetry } from '../utils/retry';
import { getErrorMessage } from '../utils/errorMessages';

// One-time retry
const fetchData = async () => {
  return retryWithBackoff(
    async () => {
      const response = await apiClient.get('/data');
      return response.data;
    },
    {
      maxAttempts: 3,
      delayMs: 1000,
      onRetry: (error, attempt) => {
        console.log(`Retry attempt ${attempt}:`, getErrorMessage(error));
      }
    }
  );
};

// Wrap function for automatic retry
const reliableFetch = withRetry(fetchData, { maxAttempts: 3 });
```

### Retryable Errors
- Network errors (ERR_NETWORK, ECONNABORTED, ETIMEDOUT)
- 5xx server errors
- 408 Request Timeout
- 429 Rate Limit (with delay from Retry-After header)

## API Client Error Handling

The API client (`apiClient.ts`) includes automatic error handling:

### Features
1. **Automatic token refresh** on 401 errors
2. **Request queuing** during token refresh
3. **User-friendly error messages** attached to errors
4. **Automatic logout** on authentication failure
5. **Debug logging** in development mode

### Accessing Error Messages

```typescript
import { apiClient } from '../services/apiClient';
import { getErrorMessage } from '../utils/errorMessages';

try {
  const response = await apiClient.get('/users/me');
} catch (error: any) {
  // User-friendly message is attached by interceptor
  const message = error.userMessage || getErrorMessage(error);
  showToast(message, 'error');
}
```

## Error Handling in Components

### Form Validation Errors

```tsx
function LoginForm() {
  const [error, setError] = useState<string>('');
  const { showError } = useToast();
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    try {
      await login(email, password);
    } catch (err: any) {
      const message = getErrorMessage(err);
      setError(message);
      showError(message);
    }
  };
  
  return (
    <form onSubmit={handleSubmit}>
      {error && <div className="error-message">{error}</div>}
      {/* form fields */}
    </form>
  );
}
```

### Loading States with Error Handling

```tsx
function DataDisplay() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        const result = await retryWithBackoff(() => apiClient.get('/data'));
        setData(result.data);
      } catch (err) {
        setError(getErrorMessage(err));
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);
  
  if (loading) return <div>Loading...</div>;
  if (error) return <div className="error">{error}</div>;
  return <div>{/* render data */}</div>;
}
```

## Best Practices

1. **Always use getErrorMessage()** to display errors to users
2. **Wrap components in ErrorBoundary** to prevent crashes
3. **Use toast notifications** for non-critical errors
4. **Show inline errors** for form validation
5. **Implement retry logic** for network requests
6. **Provide loading states** during async operations
7. **Clear errors** when retrying operations
8. **Log errors** in development for debugging
9. **Never expose sensitive information** in error messages
10. **Test error scenarios** thoroughly

## Error Tracking Integration (Optional)

To integrate with error tracking services like Sentry:

```typescript
// In ErrorBoundary
componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
  // Send to Sentry
  if (process.env.NODE_ENV === 'production') {
    Sentry.captureException(error, {
      extra: errorInfo,
      tags: {
        component: 'ErrorBoundary',
      },
    });
  }
  
  // ... rest of error handling
}

// In API interceptor
if (error.response?.status >= 500) {
  Sentry.captureException(error, {
    extra: {
      url: error.config?.url,
      method: error.config?.method,
      status: error.response?.status,
    },
  });
}
```

## Testing Error Handling

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { getErrorMessage, isRetryableError } from '../utils/errorMessages';

describe('Error Handling', () => {
  it('should display user-friendly error message', () => {
    const error = {
      response: {
        status: 401,
        data: { error: { code: 'AUTHENTICATION_ERROR' } }
      }
    };
    
    const message = getErrorMessage(error);
    expect(message).toBe('Invalid email or password. Please try again.');
  });
  
  it('should identify retryable errors', () => {
    const networkError = { code: 'ERR_NETWORK' };
    expect(isRetryableError(networkError)).toBe(true);
    
    const validationError = { response: { status: 400 } };
    expect(isRetryableError(validationError)).toBe(false);
  });
  
  it('should render ErrorBoundary fallback on error', () => {
    const ThrowError = () => {
      throw new Error('Test error');
    };
    
    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    );
    
    expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
  });
});
```

## Common Error Scenarios

### Network Timeout
```typescript
// Automatically retried by retry utility
const data = await retryWithBackoff(() => apiClient.get('/data'), {
  maxAttempts: 3,
  delayMs: 2000,
});
```

### Authentication Failure
```typescript
// Automatically handled by API client
// User is redirected to login page
```

### Rate Limiting
```typescript
// Retry with delay from Retry-After header
// Handled automatically by retry utility
```

### Form Validation
```typescript
// Display inline error messages
if (!email) {
  setEmailError('Email is required');
  return;
}
```
