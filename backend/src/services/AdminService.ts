import { Repository, Like, Between } from 'typeorm';
import { UserEntity } from '../models/entities/User';
import { AuditLogEntity } from '../models/entities/AuditLog';
import { TripEntity } from '../models/entities/Trip';
import { SessionEntity } from '../models/entities/Session';
import { DatabaseService } from './DatabaseService';
import { AuthService } from './AuthService';
import { EmailService } from './EmailService';
import {
  IAdminService,
  SystemMetrics,
  PaginatedUsers,
  UserDetails,
  PaginatedAuditLogs,
} from './interfaces/IAdminService';

export class AdminService implements IAdminService {
  private userRepository: Repository<UserEntity>;
  private auditLogRepository: Repository<AuditLogEntity>;
  private tripRepository: Repository<TripEntity>;
  private sessionRepository: Repository<SessionEntity>;
  private databaseService: DatabaseService;
  private authService: AuthService;
  private emailService: EmailService;

  // Track API calls and errors for metrics (in-memory for now)
  private static apiCallsToday = 0;
  private static errorCount = 0;
  private static totalResponseTime = 0;
  private static requestCount = 0;

  constructor(databaseService: DatabaseService) {
    this.databaseService = databaseService;
    const dataSource = databaseService.getDataSource();
    this.userRepository = dataSource.getRepository(UserEntity);
    this.auditLogRepository = dataSource.getRepository(AuditLogEntity);
    this.tripRepository = dataSource.getRepository(TripEntity);
    this.sessionRepository = dataSource.getRepository(SessionEntity);
    this.authService = new AuthService(databaseService);
    this.emailService = new EmailService();
  }

  /**
   * Get system metrics including active users, API usage, and error rates
   */
  async getSystemMetrics(): Promise<SystemMetrics> {
    // Get total users
    const totalUsers = await this.userRepository.count();

    // Get active users (logged in within last 24 hours)
    const twentyFourHoursAgo = new Date();
    twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

    const activeUsers = await this.userRepository.count({
      where: {
        lastLoginAt: Between(twentyFourHoursAgo, new Date()) as any,
      },
    });

    // Get database connection count (simplified)
    const databaseConnections = this.databaseService.getDataSource().isInitialized ? 1 : 0;

    // Calculate error rate
    const errorRate =
      AdminService.requestCount > 0
        ? (AdminService.errorCount / AdminService.requestCount) * 100
        : 0;

    // Calculate average response time
    const averageResponseTime =
      AdminService.requestCount > 0
        ? AdminService.totalResponseTime / AdminService.requestCount
        : 0;

    // API quota (placeholder - would integrate with actual API service)
    const apiQuotaRemaining = 10000 - AdminService.apiCallsToday;

    // Cache hit rate (placeholder - would integrate with actual cache service)
    const cacheHitRate = 0;

    return {
      activeUsers,
      totalUsers,
      apiCallsToday: AdminService.apiCallsToday,
      apiQuotaRemaining,
      errorRate: Math.round(errorRate * 100) / 100,
      averageResponseTime: Math.round(averageResponseTime * 100) / 100,
      databaseConnections,
      cacheHitRate,
      timestamp: new Date(),
    };
  }

  /**
   * List all users with pagination and optional filters
   */
  async listUsers(
    page: number,
    pageSize: number,
    filters?: { email?: string; isActive?: boolean; isAdmin?: boolean }
  ): Promise<PaginatedUsers> {
    // Validate pagination parameters
    if (page < 1) page = 1;
    if (pageSize < 1) pageSize = 10;
    if (pageSize > 100) pageSize = 100;

    // Build query
    const queryBuilder = this.userRepository.createQueryBuilder('user');

    // Apply filters
    if (filters?.email) {
      queryBuilder.andWhere('user.email LIKE :email', {
        email: `%${filters.email}%`,
      });
    }

    if (filters?.isActive !== undefined) {
      queryBuilder.andWhere('user.isActive = :isActive', {
        isActive: filters.isActive,
      });
    }

    if (filters?.isAdmin !== undefined) {
      queryBuilder.andWhere('user.isAdmin = :isAdmin', {
        isAdmin: filters.isAdmin,
      });
    }

    // Get total count
    const total = await queryBuilder.getCount();

    // Apply pagination
    const skip = (page - 1) * pageSize;
    queryBuilder.skip(skip).take(pageSize);

    // Order by creation date (newest first)
    queryBuilder.orderBy('user.createdAt', 'DESC');

    // Execute query
    const users = await queryBuilder.getMany();

    return {
      users,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  /**
   * Get detailed information about a specific user
   */
  async getUserDetails(userId: string): Promise<UserDetails> {
    // Find user
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['preferences', 'trips'],
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Get trip statistics
    const tripStats = await this.tripRepository
      .createQueryBuilder('trip')
      .select('COUNT(trip.id)', 'count')
      .addSelect('SUM(trip.carbonSavings)', 'totalSavings')
      .addSelect('MAX(trip.completedAt)', 'lastTripDate')
      .where('trip.userId = :userId', { userId })
      .getRawOne();

    return {
      ...user,
      tripCount: parseInt(tripStats.count) || 0,
      totalCarbonSavings: parseFloat(tripStats.totalSavings) || 0,
      lastTripDate: tripStats.lastTripDate || null,
    };
  }

  /**
   * Disable a user account
   */
  async disableUser(
    adminId: string,
    userId: string,
    reason: string,
    ipAddress?: string
  ): Promise<void> {
    // Find user
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Prevent disabling self
    if (adminId === userId) {
      throw new Error('Cannot disable your own account');
    }

    // Disable user
    user.isActive = false;
    await this.userRepository.save(user);

    // Terminate all active sessions
    const sessions = await this.sessionRepository.find({
      where: { userId },
    });

    if (sessions.length > 0) {
      await this.sessionRepository.remove(sessions);
    }

    // Log admin action
    await this.logAdminAction(
      adminId,
      'USER_DISABLED',
      userId,
      { reason },
      ipAddress
    );

    console.log(`User disabled: ${user.email} (ID: ${userId}) by admin ${adminId}`);
  }

  /**
   * Enable a previously disabled user account
   */
  async enableUser(adminId: string, userId: string, ipAddress?: string): Promise<void> {
    // Find user
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Enable user
    user.isActive = true;
    user.failedLoginAttempts = 0;
    user.accountLockedUntil = null;
    await this.userRepository.save(user);

    // Log admin action
    await this.logAdminAction(adminId, 'USER_ENABLED', userId, {}, ipAddress);

    console.log(`User enabled: ${user.email} (ID: ${userId}) by admin ${adminId}`);
  }

  /**
   * Reset a user's password (admin function)
   */
  async resetUserPassword(
    adminId: string,
    userId: string,
    ipAddress?: string
  ): Promise<string> {
    // Find user
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Generate secure temporary password (12 characters)
    const tempPassword = this.generateTemporaryPassword();

    // Hash the temporary password
    const passwordHash = await this.authService.hashPassword(tempPassword);

    // Update user password
    user.passwordHash = passwordHash;
    user.failedLoginAttempts = 0;
    user.accountLockedUntil = null;
    await this.userRepository.save(user);

    // Invalidate all existing sessions
    const sessions = await this.sessionRepository.find({
      where: { userId },
    });

    if (sessions.length > 0) {
      await this.sessionRepository.remove(sessions);
    }

    // Send email with temporary password
    try {
      await this.emailService.sendPasswordResetByAdmin(user.email, tempPassword);
      console.log(`Password reset email sent to: ${user.email}`);
    } catch (error) {
      console.error('Failed to send password reset email:', error);
      // Don't fail the operation if email fails
    }

    // Log admin action (don't include password in details)
    await this.logAdminAction(
      adminId,
      'PASSWORD_RESET',
      userId,
      { method: 'admin_reset' },
      ipAddress
    );

    console.log(`Password reset for user: ${user.email} (ID: ${userId}) by admin ${adminId}`);

    return tempPassword;
  }

  /**
   * Get audit logs with pagination and optional filters
   */
  async getAuditLogs(
    page: number,
    pageSize: number,
    filters?: {
      adminId?: string;
      action?: string;
      targetUserId?: string;
      startDate?: Date;
      endDate?: Date;
    }
  ): Promise<PaginatedAuditLogs> {
    // Validate pagination parameters
    if (page < 1) page = 1;
    if (pageSize < 1) pageSize = 10;
    if (pageSize > 100) pageSize = 100;

    // Build query
    const queryBuilder = this.auditLogRepository
      .createQueryBuilder('log')
      .leftJoinAndSelect('log.admin', 'admin')
      .leftJoinAndSelect('log.targetUser', 'targetUser');

    // Apply filters
    if (filters?.adminId) {
      queryBuilder.andWhere('log.adminId = :adminId', {
        adminId: filters.adminId,
      });
    }

    if (filters?.action) {
      queryBuilder.andWhere('log.action = :action', {
        action: filters.action,
      });
    }

    if (filters?.targetUserId) {
      queryBuilder.andWhere('log.targetUserId = :targetUserId', {
        targetUserId: filters.targetUserId,
      });
    }

    if (filters?.startDate) {
      queryBuilder.andWhere('log.timestamp >= :startDate', {
        startDate: filters.startDate,
      });
    }

    if (filters?.endDate) {
      queryBuilder.andWhere('log.timestamp <= :endDate', {
        endDate: filters.endDate,
      });
    }

    // Get total count
    const total = await queryBuilder.getCount();

    // Apply pagination
    const skip = (page - 1) * pageSize;
    queryBuilder.skip(skip).take(pageSize);

    // Order by timestamp (newest first)
    queryBuilder.orderBy('log.timestamp', 'DESC');

    // Execute query
    const logs = await queryBuilder.getMany();

    return {
      logs,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  /**
   * Log an admin action to the audit log
   */
  async logAdminAction(
    adminId: string,
    action: string,
    targetUserId?: string,
    details?: Record<string, any>,
    ipAddress?: string
  ): Promise<AuditLogEntity> {
    const auditLog = this.auditLogRepository.create({
      adminId,
      action,
      targetUserId: targetUserId || null,
      details: details || null,
      ipAddress: ipAddress || null,
      timestamp: new Date(),
    });

    return await this.auditLogRepository.save(auditLog);
  }

  /**
   * Generate a secure temporary password
   */
  private generateTemporaryPassword(): string {
    const length = 12;
    const charset =
      'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let password = '';

    // Ensure at least one of each type
    password += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[Math.floor(Math.random() * 26)];
    password += 'abcdefghijklmnopqrstuvwxyz'[Math.floor(Math.random() * 26)];
    password += '0123456789'[Math.floor(Math.random() * 10)];
    password += '!@#$%^&*'[Math.floor(Math.random() * 8)];

    // Fill the rest randomly
    for (let i = password.length; i < length; i++) {
      password += charset[Math.floor(Math.random() * charset.length)];
    }

    // Shuffle the password
    return password
      .split('')
      .sort(() => Math.random() - 0.5)
      .join('');
  }

  /**
   * Track API call for metrics
   */
  static trackApiCall(): void {
    AdminService.apiCallsToday++;
  }

  /**
   * Track error for metrics
   */
  static trackError(): void {
    AdminService.errorCount++;
  }

  /**
   * Track response time for metrics
   */
  static trackResponseTime(responseTime: number): void {
    AdminService.totalResponseTime += responseTime;
    AdminService.requestCount++;
  }

  /**
   * Reset daily metrics (should be called at midnight)
   */
  static resetDailyMetrics(): void {
    AdminService.apiCallsToday = 0;
    AdminService.errorCount = 0;
    AdminService.totalResponseTime = 0;
    AdminService.requestCount = 0;
  }

  /**
   * List API keys for a service
   */
  async listApiKeys(serviceName: string): Promise<any[]> {
    const { ApiKeyRotationService } = await import('./ApiKeyRotationService');
    const apiKeyService = new ApiKeyRotationService(this.databaseService);
    return apiKeyService.listApiKeys(serviceName);
  }

  /**
   * Rotate API key for a service
   */
  async rotateApiKey(
    adminId: string,
    serviceName: string,
    expiresInDays: number | undefined,
    ipAddress: string | undefined
  ): Promise<any> {
    const { ApiKeyRotationService } = await import('./ApiKeyRotationService');
    const apiKeyService = new ApiKeyRotationService(this.databaseService);
    
    const newKey = await apiKeyService.rotateApiKey(serviceName, expiresInDays);

    // Log the rotation action
    await this.logAdminAction(
      adminId,
      'API_KEY_ROTATED',
      undefined,
      {
        serviceName,
        keyId: newKey.id,
        expiresInDays,
      },
      ipAddress
    );

    return newKey;
  }

  /**
   * Get keys needing rotation
   */
  async getKeysNeedingRotation(daysBeforeExpiry: number): Promise<any[]> {
    const { ApiKeyRotationService } = await import('./ApiKeyRotationService');
    const apiKeyService = new ApiKeyRotationService(this.databaseService);
    return apiKeyService.getKeysNeedingRotation(daysBeforeExpiry);
  }
}
