import { UserEntity } from '../../models/entities/User';
import { AuditLogEntity } from '../../models/entities/AuditLog';

export interface SystemMetrics {
  activeUsers: number;
  totalUsers: number;
  apiCallsToday: number;
  apiQuotaRemaining: number;
  errorRate: number;
  averageResponseTime: number;
  databaseConnections: number;
  cacheHitRate: number;
  timestamp: Date;
}

export interface PaginatedUsers {
  users: UserEntity[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface UserDetails extends UserEntity {
  tripCount: number;
  totalCarbonSavings: number;
  lastTripDate: Date | null;
}

export interface PaginatedAuditLogs {
  logs: AuditLogEntity[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface IAdminService {
  /**
   * Get system metrics including active users, API usage, and error rates
   * @returns System metrics object
   */
  getSystemMetrics(): Promise<SystemMetrics>;

  /**
   * List all users with pagination and optional filters
   * @param page - Page number (1-indexed)
   * @param pageSize - Number of users per page
   * @param filters - Optional filters (email, isActive, isAdmin)
   * @returns Paginated list of users
   */
  listUsers(
    page: number,
    pageSize: number,
    filters?: { email?: string; isActive?: boolean; isAdmin?: boolean }
  ): Promise<PaginatedUsers>;

  /**
   * Get detailed information about a specific user
   * @param userId - User's ID
   * @returns User details including trip statistics
   * @throws Error if user not found
   */
  getUserDetails(userId: string): Promise<UserDetails>;

  /**
   * Disable a user account
   * @param adminId - Admin user's ID performing the action
   * @param userId - User's ID to disable
   * @param reason - Reason for disabling the account
   * @param ipAddress - Optional IP address of admin
   * @throws Error if user not found
   */
  disableUser(
    adminId: string,
    userId: string,
    reason: string,
    ipAddress?: string
  ): Promise<void>;

  /**
   * Enable a previously disabled user account
   * @param adminId - Admin user's ID performing the action
   * @param userId - User's ID to enable
   * @param ipAddress - Optional IP address of admin
   * @throws Error if user not found
   */
  enableUser(adminId: string, userId: string, ipAddress?: string): Promise<void>;

  /**
   * Reset a user's password (admin function)
   * @param adminId - Admin user's ID performing the action
   * @param userId - User's ID whose password to reset
   * @param ipAddress - Optional IP address of admin
   * @returns Temporary password that was generated
   * @throws Error if user not found
   */
  resetUserPassword(
    adminId: string,
    userId: string,
    ipAddress?: string
  ): Promise<string>;

  /**
   * Get audit logs with pagination and optional filters
   * @param page - Page number (1-indexed)
   * @param pageSize - Number of logs per page
   * @param filters - Optional filters (adminId, action, targetUserId, startDate, endDate)
   * @returns Paginated list of audit logs
   */
  getAuditLogs(
    page: number,
    pageSize: number,
    filters?: {
      adminId?: string;
      action?: string;
      targetUserId?: string;
      startDate?: Date;
      endDate?: Date;
    }
  ): Promise<PaginatedAuditLogs>;

  /**
   * Log an admin action to the audit log
   * @param adminId - Admin user's ID performing the action
   * @param action - Action being performed
   * @param targetUserId - Optional target user ID
   * @param details - Optional additional details
   * @param ipAddress - Optional IP address
   * @returns Created audit log entry
   */
  logAdminAction(
    adminId: string,
    action: string,
    targetUserId?: string,
    details?: Record<string, any>,
    ipAddress?: string
  ): Promise<AuditLogEntity>;
}
