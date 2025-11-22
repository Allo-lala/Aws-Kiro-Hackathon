import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';
import { Repository } from 'typeorm';
import { UserEntity } from '../models/entities/User';
import { SessionEntity } from '../models/entities/Session';
import { IAuthService } from './interfaces/IAuthService';
import { DatabaseService } from './DatabaseService';
import { EmailService } from './EmailService';

const SALT_ROUNDS = 10;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRATION = '24h';
const SESSION_EXPIRATION_HOURS = 24;
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 30 * 60 * 1000; // 30 minutes
const FAILED_ATTEMPTS_WINDOW_MS = 60 * 60 * 1000; // 1 hour

export class AuthService implements IAuthService {
  private userRepository: Repository<UserEntity>;
  private sessionRepository: Repository<SessionEntity>;
  private databaseService: DatabaseService;
  private emailService: EmailService;

  constructor(databaseService: DatabaseService, emailService?: EmailService) {
    this.databaseService = databaseService;
    const dataSource = databaseService.getDataSource();
    this.userRepository = dataSource.getRepository(UserEntity);
    this.sessionRepository = dataSource.getRepository(SessionEntity);
    this.emailService = emailService || new EmailService();
  }

  /**
   * Register a new user with email and password
   * Validates email format and checks for duplicates
   */
  async register(email: string, password: string): Promise<UserEntity> {
    // Validate email format
    if (!this.isValidEmail(email)) {
      throw new Error('Invalid email format');
    }

    // Validate password strength
    if (!this.isValidPassword(password)) {
      throw new Error('Password must be at least 8 characters long');
    }

    // Check if email already exists
    const existingUser = await this.userRepository.findOne({
      where: { email: email.toLowerCase() },
    });

    if (existingUser) {
      throw new Error('Email already registered');
    }

    // Hash password
    const passwordHash = await this.hashPassword(password);

    // Generate email verification token
    const emailVerificationToken = EmailService.generateToken();
    const emailVerificationTokenExpires = EmailService.generateTokenExpiration(24); // 24 hours

    // Create new user
    const user = this.userRepository.create({
      email: email.toLowerCase(),
      passwordHash,
      emailVerified: false,
      isActive: true,
      isAdmin: false,
      failedLoginAttempts: 0,
      accountLockedUntil: null,
      emailVerificationToken,
      emailVerificationTokenExpires,
      passwordResetToken: null,
      passwordResetTokenExpires: null,
    });

    // Save user to database
    const savedUser = await this.userRepository.save(user);

    // Send verification email
    try {
      const baseUrl = process.env.BASE_URL || 'http://localhost:8080';
      await this.emailService.sendVerificationEmail(
        savedUser.email,
        emailVerificationToken,
        baseUrl
      );
      console.log(`Verification email sent to: ${savedUser.email}`);
    } catch (error) {
      console.error('Failed to send verification email:', error);
      // Don't fail registration if email fails - user can request resend
    }

    console.log(`User registered: ${savedUser.email} (ID: ${savedUser.id})`);

    return savedUser;
  }

  /**
   * Authenticate user with credentials
   * Implements failed login tracking and account lockout
   */
  async login(email: string, password: string): Promise<{ user: UserEntity; token: string }> {
    // Find user by email
    const user = await this.userRepository.findOne({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      throw new Error('Invalid credentials');
    }

    // Check if account is locked
    if (user.accountLockedUntil && user.accountLockedUntil > new Date()) {
      const remainingMinutes = Math.ceil(
        (user.accountLockedUntil.getTime() - Date.now()) / 60000
      );
      throw new Error(`Account locked. Try again in ${remainingMinutes} minutes`);
    }

    // If lockout period has passed, reset failed attempts
    if (user.accountLockedUntil && user.accountLockedUntil <= new Date()) {
      user.accountLockedUntil = null;
      user.failedLoginAttempts = 0;
      await this.userRepository.save(user);
    }

    // Verify password
    const isPasswordValid = await this.comparePassword(password, user.passwordHash);

    if (!isPasswordValid) {
      // Increment failed login attempts
      user.failedLoginAttempts += 1;

      // Lock account if max attempts exceeded
      if (user.failedLoginAttempts >= MAX_FAILED_ATTEMPTS) {
        user.accountLockedUntil = new Date(Date.now() + LOCKOUT_DURATION_MS);
        await this.userRepository.save(user);
        throw new Error(
          `Account locked due to too many failed login attempts. Try again in 30 minutes`
        );
      }

      await this.userRepository.save(user);
      throw new Error('Invalid credentials');
    }

    // Check if account is active
    if (!user.isActive) {
      throw new Error('Account is disabled');
    }

    // Successful login - reset failed attempts and update last login
    user.failedLoginAttempts = 0;
    user.accountLockedUntil = null;
    user.lastLoginAt = new Date();
    await this.userRepository.save(user);

    // Generate JWT token
    const token = this.generateToken(user.id, user.email, user.isAdmin);

    // Create session with 24-hour expiration
    await this.createSession(user.id, token);

    console.log(`User logged in: ${user.email} (ID: ${user.id})`);

    return { user, token };
  }

  /**
   * Create a new session for user with 24-hour expiration
   */
  async createSession(
    userId: string,
    token: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<SessionEntity> {
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + SESSION_EXPIRATION_HOURS);

    const session = this.sessionRepository.create({
      userId,
      token,
      expiresAt,
      ipAddress: ipAddress || null,
      userAgent: userAgent || null,
    });

    return await this.sessionRepository.save(session);
  }

  /**
   * Verify email with verification token
   * Activates user account on successful verification
   */
  async verifyEmail(token: string): Promise<boolean> {
    if (!token || token.trim() === '') {
      throw new Error('Verification token is required');
    }

    // Find user by verification token
    const user = await this.userRepository.findOne({
      where: { emailVerificationToken: token },
    });

    if (!user) {
      throw new Error('Invalid verification token');
    }

    // Check if token has expired
    if (!user.emailVerificationTokenExpires || user.emailVerificationTokenExpires < new Date()) {
      throw new Error('Verification token has expired');
    }

    // Check if email is already verified
    if (user.emailVerified) {
      return true; // Already verified, return success
    }

    // Activate account
    user.emailVerified = true;
    user.emailVerificationToken = null;
    user.emailVerificationTokenExpires = null;

    await this.userRepository.save(user);

    console.log(`Email verified for user: ${user.email} (ID: ${user.id})`);

    return true;
  }

  /**
   * Initiate password reset process
   * Generates reset token and sends email to user
   */
  async resetPassword(email: string): Promise<void> {
    if (!email || !this.isValidEmail(email)) {
      throw new Error('Valid email address is required');
    }

    // Find user by email
    const user = await this.userRepository.findOne({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      // Don't reveal if user exists for security reasons
      // Just log and return success
      console.log(`Password reset requested for non-existent email: ${email}`);
      return;
    }

    // Generate password reset token
    const passwordResetToken = EmailService.generateToken();
    const passwordResetTokenExpires = EmailService.generateTokenExpiration(1); // 1 hour

    // Save token to user
    user.passwordResetToken = passwordResetToken;
    user.passwordResetTokenExpires = passwordResetTokenExpires;
    await this.userRepository.save(user);

    // Send password reset email
    try {
      const baseUrl = process.env.BASE_URL || 'http://localhost:8080';
      await this.emailService.sendPasswordResetEmail(
        user.email,
        passwordResetToken,
        baseUrl
      );
      console.log(`Password reset email sent to: ${user.email}`);
    } catch (error) {
      console.error('Failed to send password reset email:', error);
      throw new Error('Failed to send password reset email');
    }
  }

  /**
   * Validate JWT token and return associated user
   * Also checks if session exists and is not expired
   */
  async validateToken(token: string): Promise<UserEntity> {
    try {
      // Verify and decode token
      const decoded = jwt.verify(token, JWT_SECRET) as {
        userId: string;
        email: string;
        isAdmin: boolean;
      };

      // Check if session exists and is valid
      const session = await this.sessionRepository.findOne({
        where: { token },
      });

      if (!session) {
        throw new Error('Session not found');
      }

      // Check if session is expired
      if (session.expiresAt < new Date()) {
        // Clean up expired session
        await this.sessionRepository.remove(session);
        throw new Error('Session expired');
      }

      // Find user by ID
      const user = await this.userRepository.findOne({
        where: { id: decoded.userId },
      });

      if (!user) {
        throw new Error('User not found');
      }

      if (!user.isActive) {
        throw new Error('Account is disabled');
      }

      return user;
    } catch (error) {
      if (error instanceof jwt.JsonWebTokenError) {
        throw new Error('Invalid token');
      }
      if (error instanceof jwt.TokenExpiredError) {
        throw new Error('Token expired');
      }
      throw error;
    }
  }

  /**
   * Logout user and invalidate session
   * Removes the session from database
   */
  async logout(userId: string, token?: string): Promise<void> {
    if (token) {
      // Remove specific session by token
      const session = await this.sessionRepository.findOne({
        where: { token, userId },
      });

      if (session) {
        await this.sessionRepository.remove(session);
      }
    } else {
      // Remove all sessions for user
      const sessions = await this.sessionRepository.find({
        where: { userId },
      });

      if (sessions.length > 0) {
        await this.sessionRepository.remove(sessions);
      }
    }

    console.log(`User logged out: ${userId}`);
  }

  /**
   * Get session by token
   */
  async getSession(token: string): Promise<SessionEntity | null> {
    return await this.sessionRepository.findOne({
      where: { token },
    });
  }

  /**
   * Clean up expired sessions for a user
   */
  async cleanupExpiredSessions(userId: string): Promise<void> {
    const expiredSessions = await this.sessionRepository
      .createQueryBuilder('session')
      .where('session.userId = :userId', { userId })
      .andWhere('session.expiresAt < :now', { now: new Date() })
      .getMany();

    if (expiredSessions.length > 0) {
      await this.sessionRepository.remove(expiredSessions);
    }
  }

  /**
   * Hash password using bcrypt with 10 salt rounds
   */
  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, SALT_ROUNDS);
  }

  /**
   * Compare plain text password with hashed password
   */
  async comparePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  /**
   * Generate JWT token for user with 24-hour expiration
   */
  generateToken(userId: string, email: string, isAdmin: boolean): string {
    return jwt.sign(
      {
        userId,
        email,
        isAdmin,
      },
      JWT_SECRET,
      {
        expiresIn: JWT_EXPIRATION,
      }
    );
  }

  /**
   * Complete password reset with token and new password
   * @param token - Password reset token
   * @param newPassword - New password to set
   */
  async completePasswordReset(token: string, newPassword: string): Promise<void> {
    if (!token || token.trim() === '') {
      throw new Error('Reset token is required');
    }

    if (!this.isValidPassword(newPassword)) {
      throw new Error('Password must be at least 8 characters long');
    }

    // Find user by reset token
    const user = await this.userRepository.findOne({
      where: { passwordResetToken: token },
    });

    if (!user) {
      throw new Error('Invalid reset token');
    }

    // Check if token has expired
    if (!user.passwordResetTokenExpires || user.passwordResetTokenExpires < new Date()) {
      throw new Error('Reset token has expired');
    }

    // Hash new password
    const passwordHash = await this.hashPassword(newPassword);

    // Update user password and clear reset token
    user.passwordHash = passwordHash;
    user.passwordResetToken = null;
    user.passwordResetTokenExpires = null;
    user.failedLoginAttempts = 0; // Reset failed attempts
    user.accountLockedUntil = null; // Unlock account if locked

    await this.userRepository.save(user);

    // Invalidate all existing sessions for security
    await this.logout(user.id);

    console.log(`Password reset completed for user: ${user.email} (ID: ${user.id})`);
  }

  /**
   * Resend verification email to user
   * @param email - User's email address
   */
  async resendVerificationEmail(email: string): Promise<void> {
    if (!email || !this.isValidEmail(email)) {
      throw new Error('Valid email address is required');
    }

    // Find user by email
    const user = await this.userRepository.findOne({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Check if already verified
    if (user.emailVerified) {
      throw new Error('Email already verified');
    }

    // Generate new verification token
    const emailVerificationToken = EmailService.generateToken();
    const emailVerificationTokenExpires = EmailService.generateTokenExpiration(24);

    user.emailVerificationToken = emailVerificationToken;
    user.emailVerificationTokenExpires = emailVerificationTokenExpires;
    await this.userRepository.save(user);

    // Send verification email
    try {
      const baseUrl = process.env.BASE_URL || 'http://localhost:8080';
      await this.emailService.sendVerificationEmail(
        user.email,
        emailVerificationToken,
        baseUrl
      );
      console.log(`Verification email resent to: ${user.email}`);
    } catch (error) {
      console.error('Failed to resend verification email:', error);
      throw new Error('Failed to send verification email');
    }
  }

  /**
   * Validate email format using regex
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Validate password strength
   */
  private isValidPassword(password: string): boolean {
    return password.length >= 8;
  }
}
