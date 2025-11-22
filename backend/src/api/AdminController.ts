import { Request, Response } from 'express';
import { AdminService } from '../services/AdminService';
import { DatabaseService } from '../services/DatabaseService';

/**
 * Admin Controller
 * Handles admin operations including user management, system metrics, and audit logs
 */
export class AdminController {
  private adminService: AdminService;

  constructor(databaseService: DatabaseService) {
    this.adminService = new AdminService(databaseService);
  }

  /**
   * Get system metrics
   * GET /api/admin/metrics
   */
  async getMetrics(req: Request, res: Response): Promise<void> {
    try {
      const metrics = await this.adminService.getSystemMetrics();

      res.status(200).json({
        success: true,
        data: metrics,
      });
    } catch (error: any) {
      console.error('Get metrics error:', error);

      res.status(500).json({
        success: false,
        error: 'Failed to retrieve system metrics',
      });
    }
  }

  /**
   * List all users with pagination and filters
   * GET /api/admin/users
   */
  async listUsers(req: Request, res: Response): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const pageSize = parseInt(req.query.pageSize as string) || 20;

      // Parse filters
      const filters: any = {};
      if (req.query.email) {
        filters.email = req.query.email as string;
      }
      if (req.query.isActive !== undefined) {
        filters.isActive = req.query.isActive === 'true';
      }
      if (req.query.isAdmin !== undefined) {
        filters.isAdmin = req.query.isAdmin === 'true';
      }

      const result = await this.adminService.listUsers(page, pageSize, filters);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      console.error('List users error:', error);

      res.status(500).json({
        success: false,
        error: 'Failed to retrieve users',
      });
    }
  }

  /**
   * Get detailed information about a specific user
   * GET /api/admin/users/:id
   */
  async getUserDetails(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      if (!id) {
        res.status(400).json({
          success: false,
          error: 'User ID is required',
        });
        return;
      }

      const userDetails = await this.adminService.getUserDetails(id);

      res.status(200).json({
        success: true,
        data: userDetails,
      });
    } catch (error: any) {
      console.error('Get user details error:', error);

      if (error.message === 'User not found') {
        res.status(404).json({
          success: false,
          error: 'User not found',
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: 'Failed to retrieve user details',
      });
    }
  }

  /**
   * Disable a user account
   * PUT /api/admin/users/:id/disable
   */
  async disableUser(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { reason } = req.body;
      const adminId = req.user?.id;
      const ipAddress = req.ip;

      if (!id) {
        res.status(400).json({
          success: false,
          error: 'User ID is required',
        });
        return;
      }

      if (!adminId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
        });
        return;
      }

      if (!reason) {
        res.status(400).json({
          success: false,
          error: 'Reason is required',
        });
        return;
      }

      await this.adminService.disableUser(adminId, id, reason, ipAddress);

      res.status(200).json({
        success: true,
        message: 'User account disabled successfully',
      });
    } catch (error: any) {
      console.error('Disable user error:', error);

      if (error.message === 'User not found') {
        res.status(404).json({
          success: false,
          error: 'User not found',
        });
        return;
      }

      if (error.message === 'Cannot disable your own account') {
        res.status(400).json({
          success: false,
          error: error.message,
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: 'Failed to disable user account',
      });
    }
  }

  /**
   * Enable a user account
   * PUT /api/admin/users/:id/enable
   */
  async enableUser(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const adminId = req.user?.id;
      const ipAddress = req.ip;

      if (!id) {
        res.status(400).json({
          success: false,
          error: 'User ID is required',
        });
        return;
      }

      if (!adminId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
        });
        return;
      }

      await this.adminService.enableUser(adminId, id, ipAddress);

      res.status(200).json({
        success: true,
        message: 'User account enabled successfully',
      });
    } catch (error: any) {
      console.error('Enable user error:', error);

      if (error.message === 'User not found') {
        res.status(404).json({
          success: false,
          error: 'User not found',
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: 'Failed to enable user account',
      });
    }
  }

  /**
   * Reset a user's password (admin function)
   * POST /api/admin/users/:id/reset-password
   */
  async resetUserPassword(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const adminId = req.user?.id;
      const ipAddress = req.ip;

      if (!id) {
        res.status(400).json({
          success: false,
          error: 'User ID is required',
        });
        return;
      }

      if (!adminId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
        });
        return;
      }

      const tempPassword = await this.adminService.resetUserPassword(
        adminId,
        id,
        ipAddress
      );

      res.status(200).json({
        success: true,
        message: 'Password reset successfully. Temporary password sent to user via email.',
        data: {
          tempPassword, // Include in response for admin to communicate if email fails
        },
      });
    } catch (error: any) {
      console.error('Reset user password error:', error);

      if (error.message === 'User not found') {
        res.status(404).json({
          success: false,
          error: 'User not found',
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: 'Failed to reset user password',
      });
    }
  }

  /**
   * Get audit logs with pagination and filters
   * GET /api/admin/audit-logs
   */
  async getAuditLogs(req: Request, res: Response): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const pageSize = parseInt(req.query.pageSize as string) || 20;

      // Parse filters
      const filters: any = {};
      if (req.query.adminId) {
        filters.adminId = req.query.adminId as string;
      }
      if (req.query.action) {
        filters.action = req.query.action as string;
      }
      if (req.query.targetUserId) {
        filters.targetUserId = req.query.targetUserId as string;
      }
      if (req.query.startDate) {
        filters.startDate = new Date(req.query.startDate as string);
      }
      if (req.query.endDate) {
        filters.endDate = new Date(req.query.endDate as string);
      }

      const result = await this.adminService.getAuditLogs(page, pageSize, filters);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      console.error('Get audit logs error:', error);

      res.status(500).json({
        success: false,
        error: 'Failed to retrieve audit logs',
      });
    }
  }

  /**
   * List API keys for a service
   * GET /api/admin/api-keys/:serviceName
   */
  async listApiKeys(req: Request, res: Response): Promise<void> {
    try {
      const { serviceName } = req.params;

      if (!serviceName) {
        res.status(400).json({
          success: false,
          error: 'Service name is required',
        });
        return;
      }

      const keys = await this.adminService.listApiKeys(serviceName);

      res.status(200).json({
        success: true,
        data: keys,
      });
    } catch (error: any) {
      console.error('List API keys error:', error);

      res.status(500).json({
        success: false,
        error: 'Failed to retrieve API keys',
      });
    }
  }

  /**
   * Rotate API key for a service
   * POST /api/admin/api-keys/:serviceName/rotate
   */
  async rotateApiKey(req: Request, res: Response): Promise<void> {
    try {
      const { serviceName } = req.params;
      const { expiresInDays } = req.body;
      const adminId = req.user?.id;
      const ipAddress = req.ip;

      if (!serviceName) {
        res.status(400).json({
          success: false,
          error: 'Service name is required',
        });
        return;
      }

      if (!adminId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
        });
        return;
      }

      const newKey = await this.adminService.rotateApiKey(
        adminId,
        serviceName,
        expiresInDays,
        ipAddress
      );

      res.status(200).json({
        success: true,
        message: 'API key rotated successfully',
        data: newKey,
      });
    } catch (error: any) {
      console.error('Rotate API key error:', error);

      res.status(500).json({
        success: false,
        error: 'Failed to rotate API key',
      });
    }
  }

  /**
   * Get keys needing rotation
   * GET /api/admin/api-keys/rotation-schedule
   */
  async getKeysNeedingRotation(req: Request, res: Response): Promise<void> {
    try {
      const daysBeforeExpiry = parseInt(req.query.daysBeforeExpiry as string) || 7;

      const keys = await this.adminService.getKeysNeedingRotation(daysBeforeExpiry);

      res.status(200).json({
        success: true,
        data: keys,
      });
    } catch (error: any) {
      console.error('Get keys needing rotation error:', error);

      res.status(500).json({
        success: false,
        error: 'Failed to retrieve keys needing rotation',
      });
    }
  }
}
