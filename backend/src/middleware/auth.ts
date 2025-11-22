import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/AuthService';
import { DatabaseService } from '../services/DatabaseService';

// Extend Express Request to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        isAdmin: boolean;
      };
      token?: string;
    }
  }
}

/**
 * JWT Authentication Middleware
 * Validates JWT token and attaches user to request
 */
export const authenticateJWT = (databaseService: DatabaseService) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Extract token from Authorization header
      const authHeader = req.headers.authorization;

      if (!authHeader) {
        res.status(401).json({ error: 'No authorization header provided' });
        return;
      }

      // Check for Bearer token format
      const parts = authHeader.split(' ');
      if (parts.length !== 2 || parts[0] !== 'Bearer') {
        res.status(401).json({ error: 'Invalid authorization header format. Use: Bearer <token>' });
        return;
      }

      const token = parts[1];

      // Validate token using AuthService
      const authService = new AuthService(databaseService);
      const user = await authService.validateToken(token);

      // Attach user and token to request
      req.user = {
        id: user.id,
        email: user.email,
        isAdmin: user.isAdmin,
      };
      req.token = token;

      next();
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'Token expired' || error.message === 'Session expired') {
          res.status(401).json({ error: 'Token expired. Please login again.' });
          return;
        }
        if (error.message === 'Invalid token' || error.message === 'Session not found') {
          res.status(401).json({ error: 'Invalid token' });
          return;
        }
        if (error.message === 'Account is disabled') {
          res.status(403).json({ error: 'Account is disabled' });
          return;
        }
      }
      res.status(401).json({ error: 'Authentication failed' });
    }
  };
};

/**
 * Admin Authorization Middleware
 * Requires user to be authenticated and have admin privileges
 * Must be used after authenticateJWT middleware
 */
export const requireAdmin = (req: Request, res: Response, next: NextFunction): void => {
  if (!req.user) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  if (!req.user.isAdmin) {
    res.status(403).json({ error: 'Admin privileges required' });
    return;
  }

  next();
};

/**
 * Optional Authentication Middleware
 * Attaches user to request if token is valid, but doesn't fail if no token
 */
export const optionalAuth = (databaseService: DatabaseService) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const authHeader = req.headers.authorization;

      if (!authHeader) {
        next();
        return;
      }

      const parts = authHeader.split(' ');
      if (parts.length === 2 && parts[0] === 'Bearer') {
        const token = parts[1];
        const authService = new AuthService(databaseService);
        const user = await authService.validateToken(token);

        req.user = {
          id: user.id,
          email: user.email,
          isAdmin: user.isAdmin,
        };
        req.token = token;
      }

      next();
    } catch (error) {
      // Silently fail for optional auth
      next();
    }
  };
};
