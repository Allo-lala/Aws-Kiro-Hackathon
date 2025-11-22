import { Request, Response, NextFunction } from 'express';
import logger from '../config/logger';
import { AppError, createErrorResponse } from '../utils/errors';

/**
 * Error handling middleware
 * Catches all errors and returns appropriate HTTP responses
 */
export const errorHandler = (
  error: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const isAppError = error instanceof AppError;
  const statusCode = isAppError ? error.statusCode : 500;
  const isOperational = isAppError ? error.isOperational : false;

  // Log error with appropriate level
  const logContext = {
    method: req.method,
    url: req.url,
    ip: req.ip,
    userId: (req as any).user?.id,
    statusCode,
    errorCode: isAppError ? error.code : 'INTERNAL_ERROR',
  };

  if (statusCode >= 500) {
    logger.error('Server error', {
      ...logContext,
      message: error.message,
      stack: error.stack,
      isOperational,
    });
  } else if (statusCode >= 400) {
    logger.warn('Client error', {
      ...logContext,
      message: error.message,
    });
  }

  // Create error response
  const includeStack = process.env.NODE_ENV === 'development';
  const errorResponse = createErrorResponse(error, includeStack);

  res.status(statusCode).json(errorResponse);
};

/**
 * 404 Not Found handler
 * Handles requests to non-existent routes
 */
export const notFoundHandler = (req: Request, res: Response): void => {
  logger.warn('Route not found', {
    method: req.method,
    url: req.url,
    ip: req.ip,
  });

  res.status(404).json({
    success: false,
    error: {
      message: 'Route not found',
      code: 'NOT_FOUND',
      statusCode: 404,
      path: req.path,
    },
  });
};

/**
 * Async error wrapper
 * Wraps async route handlers to catch errors and pass to error middleware
 */
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
