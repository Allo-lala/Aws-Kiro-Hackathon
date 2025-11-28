import { Request, Response, NextFunction } from 'express';

/**
 * CORS configuration middleware
 * Configures Cross-Origin Resource Sharing for frontend communication
 */
export const configureCORS = (req: Request, res: Response, next: NextFunction): void => {
  // Get allowed origins from environment or use defaults
  const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim())
    : ['http://localhost:3000', 'http://localhost:8080'];

  const origin = req.headers.origin;

  // Check if origin is allowed
  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  } else if (process.env.NODE_ENV === 'development') {
    // In development, allow all origins
    res.setHeader('Access-Control-Allow-Origin', '*');
  } else if (origin) {
    // Log rejected origins in production for debugging
    console.log(`CORS: Rejected origin: ${origin}. Allowed origins:`, allowedOrigins);
  }

  // Allowed methods
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');

  // Allowed headers
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Origin, X-Requested-With, Content-Type, Accept, Authorization, X-CSRF-Token'
  );

  // Max age for preflight cache
  res.setHeader('Access-Control-Max-Age', '86400'); // 24 hours

  // Preflight request handling
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  next();
};
