import helmet from 'helmet';
import { Request, Response, NextFunction } from 'express';

/**
 * Security headers middleware using helmet
 * Configures secure HTTP headers to protect against common vulnerabilities
 */
export const securityHeaders = helmet({
  // Content Security Policy
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  // Strict Transport Security
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true,
  },
  // X-Frame-Options
  frameguard: {
    action: 'deny',
  },
  // X-Content-Type-Options
  noSniff: true,
  // X-XSS-Protection
  xssFilter: true,
  // Referrer-Policy
  referrerPolicy: {
    policy: 'strict-origin-when-cross-origin',
  },
  // Hide X-Powered-By header
  hidePoweredBy: true,
});

/**
 * Input sanitization middleware
 * Sanitizes user input to prevent XSS and NoSQL injection attacks
 */
export const sanitizeInput = (req: Request, res: Response, next: NextFunction): void => {
  // Sanitize request body
  if (req.body) {
    req.body = sanitizeObject(req.body);
  }

  // Sanitize query parameters
  if (req.query) {
    req.query = sanitizeObject(req.query);
  }

  // Sanitize URL parameters
  if (req.params) {
    req.params = sanitizeObject(req.params);
  }

  next();
};

/**
 * Recursively sanitize an object
 * Removes potentially dangerous characters and patterns
 */
function sanitizeObject(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item));
  }

  if (typeof obj === 'object') {
    const sanitized: any = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        // Remove keys that start with $ (MongoDB operators)
        if (key.startsWith('$')) {
          continue;
        }
        sanitized[key] = sanitizeObject(obj[key]);
      }
    }
    return sanitized;
  }

  if (typeof obj === 'string') {
    return sanitizeString(obj);
  }

  return obj;
}

/**
 * Sanitize a string value
 * Removes or escapes potentially dangerous characters
 */
function sanitizeString(str: string): string {
  // Remove null bytes
  str = str.replace(/\0/g, '');

  // Escape HTML special characters to prevent XSS
  str = str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');

  return str;
}

/**
 * CSRF token validation middleware
 * Validates CSRF tokens for state-changing operations
 */
export const csrfProtection = (req: Request, res: Response, next: NextFunction): void => {
  // Skip CSRF check for GET, HEAD, OPTIONS requests (safe methods)
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    next();
    return;
  }

  // Get CSRF token from header or body
  const csrfToken = req.headers['x-csrf-token'] || req.body?._csrf;

  // Get expected token from session or JWT
  const expectedToken = req.user ? generateCSRFToken(req.user.id) : null;

  // Validate token
  if (!csrfToken || !expectedToken || csrfToken !== expectedToken) {
    res.status(403).json({
      success: false,
      error: 'CSRF validation failed',
      message: 'Invalid or missing CSRF token',
    });
    return;
  }

  next();
};

/**
 * Generate CSRF token for a user
 * In production, this should use a more secure method with session storage
 */
function generateCSRFToken(userId: string): string {
  // Simple implementation - in production, use a proper CSRF library
  // or store tokens in session/database
  const secret = process.env.CSRF_SECRET || 'default-csrf-secret';
  const crypto = require('crypto');
  return crypto
    .createHmac('sha256', secret)
    .update(userId)
    .digest('hex');
}

/**
 * Endpoint to get CSRF token
 * Should be called by frontend before making state-changing requests
 */
export const getCSRFToken = (req: Request, res: Response): void => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      error: 'Authentication required',
    });
    return;
  }

  const token = generateCSRFToken(req.user.id);
  res.json({
    success: true,
    csrfToken: token,
  });
};
