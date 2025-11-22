/**
 * Custom error classes for better error handling and categorization
 */

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly code?: string;

  constructor(message: string, statusCode: number = 500, isOperational: boolean = true, code?: string) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.code = code;

    // Maintains proper stack trace for where our error was thrown
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, code?: string) {
    super(message, 400, true, code || 'VALIDATION_ERROR');
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication failed', code?: string) {
    super(message, 401, true, code || 'AUTHENTICATION_ERROR');
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = 'Access forbidden', code?: string) {
    super(message, 403, true, code || 'AUTHORIZATION_ERROR');
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'Resource not found', code?: string) {
    super(message, 404, true, code || 'NOT_FOUND');
  }
}

export class ConflictError extends AppError {
  constructor(message: string, code?: string) {
    super(message, 409, true, code || 'CONFLICT_ERROR');
  }
}

export class RateLimitError extends AppError {
  constructor(message: string = 'Too many requests', code?: string) {
    super(message, 429, true, code || 'RATE_LIMIT_ERROR');
  }
}

export class ExternalServiceError extends AppError {
  constructor(message: string, statusCode: number = 502, code?: string) {
    super(message, statusCode, true, code || 'EXTERNAL_SERVICE_ERROR');
  }
}

export class DatabaseError extends AppError {
  constructor(message: string, code?: string) {
    super(message, 500, true, code || 'DATABASE_ERROR');
  }
}

/**
 * Error response format
 */
export interface ErrorResponse {
  success: false;
  error: {
    message: string;
    code?: string;
    statusCode: number;
    details?: any;
    stack?: string;
  };
}

/**
 * Create standardized error response
 */
export function createErrorResponse(error: Error | AppError, includeStack: boolean = false): ErrorResponse {
  const isAppError = error instanceof AppError;
  
  return {
    success: false,
    error: {
      message: error.message || 'An unexpected error occurred',
      code: isAppError ? error.code : 'INTERNAL_ERROR',
      statusCode: isAppError ? error.statusCode : 500,
      ...(includeStack && { stack: error.stack }),
    },
  };
}
