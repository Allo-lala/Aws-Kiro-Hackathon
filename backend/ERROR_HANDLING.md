# Error Handling Guide

This document describes the comprehensive error handling system implemented in the backend.

## Overview

The backend uses a structured error handling approach with:
- Custom error classes for different error types
- Winston logger for centralized logging
- Retry logic for transient failures
- Standardized error responses

## Custom Error Classes

Located in `src/utils/errors.ts`, these classes provide type-safe error handling:

### AppError (Base Class)
```typescript
throw new AppError('Something went wrong', 500, true, 'ERROR_CODE');
```

### Specific Error Types
- **ValidationError** (400): Input validation failures
- **AuthenticationError** (401): Authentication failures
- **AuthorizationError** (403): Permission denied
- **NotFoundError** (404): Resource not found
- **ConflictError** (409): Data conflicts (e.g., duplicate email)
- **RateLimitError** (429): Too many requests
- **ExternalServiceError** (502): External API failures
- **DatabaseError** (500): Database operation failures

## Usage Examples

### In Route Handlers

```typescript
import { asyncHandler } from '../middleware/errorHandler';
import { NotFoundError, ValidationError } from '../utils/errors';

// Wrap async handlers to catch errors
router.get('/users/:id', asyncHandler(async (req, res) => {
  const user = await userService.findById(req.params.id);
  
  if (!user) {
    throw new NotFoundError('User not found');
  }
  
  res.json({ success: true, data: user });
}));

// Validation errors
router.post('/users', asyncHandler(async (req, res) => {
  if (!req.body.email) {
    throw new ValidationError('Email is required', 'MISSING_EMAIL');
  }
  
  // ... rest of handler
}));
```

### In Services

```typescript
import { DatabaseError, ExternalServiceError } from '../utils/errors';
import { retryWithBackoff } from '../utils/retry';
import logger from '../config/logger';

class UserService {
  async findById(id: string) {
    try {
      const user = await this.repository.findOne({ where: { id } });
      return user;
    } catch (error) {
      logger.error('Database query failed', { id, error });
      throw new DatabaseError('Failed to retrieve user');
    }
  }
  
  async callExternalAPI() {
    // Automatically retry on transient failures
    return retryWithBackoff(
      async () => {
        const response = await axios.get('https://api.example.com/data');
        return response.data;
      },
      {
        maxAttempts: 3,
        delayMs: 1000,
        onRetry: (error, attempt) => {
          logger.warn('Retrying API call', { attempt, error: error.message });
        }
      }
    );
  }
}
```

## Logging

Winston logger is configured in `src/config/logger.ts` with multiple transports:

### Log Levels
- **error**: Critical errors requiring immediate attention
- **warn**: Warning conditions
- **info**: Informational messages
- **http**: HTTP request/response logs
- **debug**: Detailed debugging information

### Usage

```typescript
import logger from '../config/logger';

// Log with context
logger.info('User logged in', { userId: user.id, ip: req.ip });
logger.error('Database connection failed', { error: error.message, stack: error.stack });
logger.warn('API rate limit approaching', { usage: 95, limit: 100 });
```

### Log Files
- `logs/error.log`: Error-level logs only
- `logs/combined.log`: All logs

## Retry Logic

The retry utility (`src/utils/retry.ts`) provides automatic retry with exponential backoff:

```typescript
import { retryWithBackoff, withRetry } from '../utils/retry';

// One-time retry
const result = await retryWithBackoff(
  async () => await someOperation(),
  {
    maxAttempts: 3,
    delayMs: 1000,
    backoffMultiplier: 2,
    maxDelayMs: 10000,
  }
);

// Wrap function for automatic retry
const reliableOperation = withRetry(unreliableOperation, {
  maxAttempts: 5,
  delayMs: 500,
});
```

### Retryable Errors
By default, these errors are retried:
- Network errors: ECONNRESET, ETIMEDOUT, ENOTFOUND, ECONNREFUSED
- HTTP 5xx server errors
- Timeout errors

## Error Response Format

All errors return a standardized JSON response:

```json
{
  "success": false,
  "error": {
    "message": "User-friendly error message",
    "code": "ERROR_CODE",
    "statusCode": 404,
    "stack": "... (only in development)"
  }
}
```

## Best Practices

1. **Always use custom error classes** instead of throwing generic Error objects
2. **Wrap async route handlers** with `asyncHandler` middleware
3. **Log errors with context** to aid debugging
4. **Use retry logic** for external API calls and database operations
5. **Provide user-friendly error messages** in error responses
6. **Include error codes** for client-side error handling
7. **Never expose sensitive information** in error messages
8. **Use appropriate HTTP status codes** for different error types

## Environment Variables

Configure error handling behavior:

```env
# Logging
LOG_LEVEL=info          # error, warn, info, http, debug
NODE_ENV=production     # development, production

# Retry configuration
ROUTE_API_MAX_RETRIES=3
DB_CONNECTION_TIMEOUT=2000
```

## Testing Error Handling

```typescript
import { describe, it, expect } from 'vitest';
import { NotFoundError, ValidationError } from '../utils/errors';

describe('Error Handling', () => {
  it('should throw NotFoundError with correct status code', () => {
    const error = new NotFoundError('Resource not found');
    expect(error.statusCode).toBe(404);
    expect(error.isOperational).toBe(true);
  });
  
  it('should retry on transient failures', async () => {
    let attempts = 0;
    const operation = async () => {
      attempts++;
      if (attempts < 3) {
        throw new Error('ETIMEDOUT');
      }
      return 'success';
    };
    
    const result = await retryWithBackoff(operation, { maxAttempts: 3 });
    expect(result).toBe('success');
    expect(attempts).toBe(3);
  });
});
```
