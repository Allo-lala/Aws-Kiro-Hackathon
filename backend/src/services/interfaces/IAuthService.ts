import { UserEntity } from '../../models/entities/User';

export interface IAuthService {
  /**
   * Register a new user with email and password
   * @param email - User's email address
   * @param password - User's plain text password (will be hashed)
   * @returns Created user entity
   * @throws Error if email already exists or validation fails
   */
  register(email: string, password: string): Promise<UserEntity>;

  /**
   * Authenticate user with credentials and create session
   * @param email - User's email address
   * @param password - User's plain text password
   * @returns Object containing user entity and JWT token
   * @throws Error if credentials are invalid or account is locked
   */
  login(email: string, password: string): Promise<{ user: UserEntity; token: string }>;

  /**
   * Verify email with verification token
   * @param token - Email verification token
   * @returns True if verification successful
   * @throws Error if token is invalid or expired
   */
  verifyEmail(token: string): Promise<boolean>;

  /**
   * Initiate password reset process
   * @param email - User's email address
   * @throws Error if user not found
   */
  resetPassword(email: string): Promise<void>;

  /**
   * Validate JWT token and return associated user
   * @param token - JWT token to validate
   * @returns User entity if token is valid
   * @throws Error if token is invalid or expired
   */
  validateToken(token: string): Promise<UserEntity>;

  /**
   * Logout user and invalidate session
   * @param userId - User's ID
   * @param token - Optional JWT token to invalidate specific session
   */
  logout(userId: string, token?: string): Promise<void>;

  /**
   * Create a new session for user with 24-hour expiration
   * @param userId - User's ID
   * @param token - JWT token
   * @param ipAddress - Optional IP address
   * @param userAgent - Optional user agent string
   * @returns Created session entity
   */
  createSession(
    userId: string,
    token: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<import('../../models/entities/Session').SessionEntity>;

  /**
   * Hash password using bcrypt
   * @param password - Plain text password
   * @returns Hashed password
   */
  hashPassword(password: string): Promise<string>;

  /**
   * Compare plain text password with hashed password
   * @param password - Plain text password
   * @param hash - Hashed password
   * @returns True if passwords match
   */
  comparePassword(password: string, hash: string): Promise<boolean>;

  /**
   * Generate JWT token for user
   * @param userId - User's ID
   * @param email - User's email
   * @param isAdmin - Whether user is admin
   * @returns JWT token
   */
  generateToken(userId: string, email: string, isAdmin: boolean): string;
}
