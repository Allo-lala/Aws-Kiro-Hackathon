import { Router, Request, Response } from 'express';
import { body, param } from 'express-validator';
import { AuthController } from '../AuthController';
import { DatabaseService } from '../../services/DatabaseService';
import { authenticateJWT } from '../../middleware/auth';
import { validateRequest } from '../../middleware/validation';
import { authLimiter } from '../../middleware/rateLimiter';

/**
 * Create authentication router
 * Handles user registration, login, logout, email verification, and password reset
 */
export function createAuthRouter(databaseService: DatabaseService): Router {
  const router = Router();
  const authController = new AuthController(databaseService);

  // Apply strict rate limiting to all auth routes
  router.use(authLimiter);

  /**
   * POST /api/auth/register
   * Register a new user
   */
  router.post(
    '/register',
    [
      body('email')
        .isEmail()
        .normalizeEmail()
        .withMessage('Valid email is required'),
      body('password')
        .isLength({ min: 8 })
        .withMessage('Password must be at least 8 characters long'),
      validateRequest,
    ],
    async (req: Request, res: Response) => await authController.register(req, res)
  );

  /**
   * POST /api/auth/login
   * Login with email and password
   */
  router.post(
    '/login',
    [
      body('email')
        .isEmail()
        .normalizeEmail()
        .withMessage('Valid email is required'),
      body('password')
        .notEmpty()
        .withMessage('Password is required'),
      validateRequest,
    ],
    async (req: Request, res: Response) => await authController.login(req, res)
  );

  /**
   * POST /api/auth/logout
   * Logout and invalidate session (requires authentication)
   */
  router.post(
    '/logout',
    authenticateJWT(databaseService),
    async (req: Request, res: Response) => await authController.logout(req, res)
  );

  /**
   * GET /api/auth/verify-email/:token
   * Verify email address with token
   */
  router.get(
    '/verify-email/:token',
    [
      param('token')
        .notEmpty()
        .withMessage('Verification token is required'),
      validateRequest,
    ],
    async (req: Request, res: Response) => await authController.verifyEmail(req, res)
  );

  /**
   * POST /api/auth/resend-verification
   * Resend verification email
   */
  router.post(
    '/resend-verification',
    [
      body('email')
        .isEmail()
        .normalizeEmail()
        .withMessage('Valid email is required'),
      validateRequest,
    ],
    async (req: Request, res: Response) => await authController.resendVerification(req, res)
  );

  /**
   * POST /api/auth/reset-password
   * Request password reset
   */
  router.post(
    '/reset-password',
    [
      body('email')
        .isEmail()
        .normalizeEmail()
        .withMessage('Valid email is required'),
      validateRequest,
    ],
    async (req: Request, res: Response) => await authController.requestPasswordReset(req, res)
  );

  /**
   * POST /api/auth/reset-password/:token
   * Complete password reset with token
   */
  router.post(
    '/reset-password/:token',
    [
      param('token')
        .notEmpty()
        .withMessage('Reset token is required'),
      body('password')
        .isLength({ min: 8 })
        .withMessage('Password must be at least 8 characters long'),
      validateRequest,
    ],
    async (req: Request, res: Response) => await authController.completePasswordReset(req, res)
  );

  /**
   * GET /api/auth/csrf-token
   * Get CSRF token for authenticated user
   */
  router.get(
    '/csrf-token',
    authenticateJWT(databaseService),
    async (req: Request, res: Response) => {
      const { getCSRFToken } = await import('../../middleware/security');
      getCSRFToken(req, res);
    }
  );

  return router;
}
