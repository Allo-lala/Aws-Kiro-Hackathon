import { Request, Response, NextFunction } from 'express';

/**
 * CORS configuration middleware
 * Configures Cross-Origin Resource Sharing for frontend communication
 */
export const configureCORS = (req: Request, res: Response, next: NextFunction): void => {
  // Get allowed origins from environment or use defaults
  const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',')
    : ['http://localhost:3000', 'http://localhost:8080'];

  const origin = req.headers.origin;

  // Check if origin is allowed
  if (origin && allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
  } else if (process.env.NODE_ENV === 'development') {
    // In development, allow all origins
    res.header('Access-Control-Allow-Origin', '*');
  }

  // Allow credentials
  res.header('Access-Control-Allow-Credentials', 'true');

  // Allowed methods
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');

  // Allowed headers
  res.header(
    'Access-Control-Allow-Headers',
    'Origin, X-Requested-With, Content-Type, Accept, Authorization'
  );

  // Preflight request handling
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
    return;
  }

  next();
};
