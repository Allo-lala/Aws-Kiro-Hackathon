import { Router, Request, Response } from 'express';
import { body, param, query } from 'express-validator';
import { AdminController } from '../AdminController';
import { DatabaseService } from '../../services/DatabaseService';
import { authenticateJWT, requireAdmin } from '../../middleware/auth';
import { validateRequest } from '../../middleware/validation';
import { adminLimiter } from '../../middleware/rateLimiter';

/**
 * Create admin router
 * Handles admin operations including user management, system metrics, and audit logs
 * All routes require authentication and admin privileges
 */
export function createAdminRouter(databaseService: DatabaseService): Router {
  const router = Router();
  const adminController = new AdminController(databaseService);

  // Apply authentication and admin authorization to all routes
  router.use(authenticateJWT(databaseService));
  router.use(requireAdmin);

  // Apply admin-specific rate limiting
  router.use(adminLimiter);

  /**
   * GET /api/admin/metrics
   * Get system metrics
   */
  router.get(
    '/metrics',
    async (req: Request, res: Response) => await adminController.getMetrics(req, res)
  );

  /**
   * GET /api/admin/users
   * List all users with pagination and filters
   */
  router.get(
    '/users',
    [
      query('page')
        .optional()
        .isInt({ min: 1 })
        .withMessage('Page must be a positive integer'),
      query('pageSize')
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage('Page size must be between 1 and 100'),
      query('email')
        .optional()
        .isString()
        .withMessage('Email filter must be a string'),
      query('isActive')
        .optional()
        .isBoolean()
        .withMessage('isActive filter must be a boolean'),
      query('isAdmin')
        .optional()
        .isBoolean()
        .withMessage('isAdmin filter must be a boolean'),
      validateRequest,
    ],
    async (req: Request, res: Response) => await adminController.listUsers(req, res)
  );

  /**
   * GET /api/admin/users/:id
   * Get detailed information about a specific user
   */
  router.get(
    '/users/:id',
    [
      param('id')
        .isUUID()
        .withMessage('User ID must be a valid UUID'),
      validateRequest,
    ],
    async (req: Request, res: Response) => await adminController.getUserDetails(req, res)
  );

  /**
   * PUT /api/admin/users/:id/disable
   * Disable a user account
   */
  router.put(
    '/users/:id/disable',
    [
      param('id')
        .isUUID()
        .withMessage('User ID must be a valid UUID'),
      body('reason')
        .notEmpty()
        .isString()
        .withMessage('Reason is required'),
      validateRequest,
    ],
    async (req: Request, res: Response) => await adminController.disableUser(req, res)
  );

  /**
   * PUT /api/admin/users/:id/enable
   * Enable a user account
   */
  router.put(
    '/users/:id/enable',
    [
      param('id')
        .isUUID()
        .withMessage('User ID must be a valid UUID'),
      validateRequest,
    ],
    async (req: Request, res: Response) => await adminController.enableUser(req, res)
  );

  /**
   * POST /api/admin/users/:id/reset-password
   * Reset a user's password (admin function)
   */
  router.post(
    '/users/:id/reset-password',
    [
      param('id')
        .isUUID()
        .withMessage('User ID must be a valid UUID'),
      validateRequest,
    ],
    async (req: Request, res: Response) => await adminController.resetUserPassword(req, res)
  );

  /**
   * GET /api/admin/audit-logs
   * Get audit logs with pagination and filters
   */
  router.get(
    '/audit-logs',
    [
      query('page')
        .optional()
        .isInt({ min: 1 })
        .withMessage('Page must be a positive integer'),
      query('pageSize')
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage('Page size must be between 1 and 100'),
      query('adminId')
        .optional()
        .isUUID()
        .withMessage('Admin ID must be a valid UUID'),
      query('action')
        .optional()
        .isString()
        .withMessage('Action filter must be a string'),
      query('targetUserId')
        .optional()
        .isUUID()
        .withMessage('Target user ID must be a valid UUID'),
      query('startDate')
        .optional()
        .isISO8601()
        .withMessage('Start date must be a valid ISO 8601 date'),
      query('endDate')
        .optional()
        .isISO8601()
        .withMessage('End date must be a valid ISO 8601 date'),
      validateRequest,
    ],
    async (req: Request, res: Response) => await adminController.getAuditLogs(req, res)
  );

  /**
   * GET /api/admin/api-keys/:serviceName
   * List API keys for a service
   */
  router.get(
    '/api-keys/:serviceName',
    [
      param('serviceName')
        .notEmpty()
        .withMessage('Service name is required'),
      validateRequest,
    ],
    async (req: Request, res: Response) => await adminController.listApiKeys(req, res)
  );

  /**
   * POST /api/admin/api-keys/:serviceName/rotate
   * Rotate API key for a service
   */
  router.post(
    '/api-keys/:serviceName/rotate',
    [
      param('serviceName')
        .notEmpty()
        .withMessage('Service name is required'),
      body('expiresInDays')
        .optional()
        .isInt({ min: 1 })
        .withMessage('Expires in days must be a positive integer'),
      validateRequest,
    ],
    async (req: Request, res: Response) => await adminController.rotateApiKey(req, res)
  );

  /**
   * GET /api/admin/api-keys/rotation-schedule
   * Get keys needing rotation
   */
  router.get(
    '/api-keys/rotation-schedule',
    [
      query('daysBeforeExpiry')
        .optional()
        .isInt({ min: 1 })
        .withMessage('Days before expiry must be a positive integer'),
      validateRequest,
    ],
    async (req: Request, res: Response) => await adminController.getKeysNeedingRotation(req, res)
  );

  return router;
}
