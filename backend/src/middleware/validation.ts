import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';

/**
 * Validation middleware
 * Checks for validation errors from express-validator and returns 400 if any exist
 */
export const validateRequest = (req: Request, res: Response, next: NextFunction): void => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: errors.array().map(error => ({
        field: error.type === 'field' ? error.path : undefined,
        message: error.msg,
      })),
    });
    return;
  }

  next();
};
