/**
 * Property-Based Tests for AuthService
 * Feature: user-auth-and-real-routing
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { AuthService } from './AuthService';
import { DatabaseService } from './DatabaseService';
import { DataSource } from 'typeorm';
import { UserEntity } from '../models/entities/User';

describe('AuthService - Property-Based Tests', () => {
  let databaseService: DatabaseService;
  let authService: AuthService;
  let dataSource: DataSource;
  let dbAvailable = false;

  beforeAll(async () => {
    try {
      // Initialize database service with test configuration
      databaseService = new DatabaseService();
      await databaseService.connect();
      dataSource = databaseService.getDataSource();
      authService = new AuthService(databaseService);
      dbAvailable = true;
    } catch (error) {
      console.warn('Database not available for property-based tests. Tests will be skipped.');
      console.warn('To run these tests, ensure PostgreSQL is running and configured in .env file.');
      dbAvailable = false;
    }
  });

  afterAll(async () => {
    if (dbAvailable && databaseService) {
      await databaseService.disconnect();
    }
  });

  beforeEach(async () => {
    if (dbAvailable) {
      // Clean up users table before each test
      const userRepository = dataSource.getRepository(UserEntity);
      await userRepository.clear();
    }
  });

  /**
   * Feature: user-auth-and-real-routing, Property 1: User registration creates valid accounts
   * Validates: Requirements 1.1, 1.3, 1.4
   * 
   * For any valid email and password combination, registering a new user should:
   * 1. Create an account in the database
   * 2. Hash the password properly (not store plain text)
   * 3. Set appropriate default values
   */
  describe('Property 1: User registration creates valid accounts', () => {
    // Generator for valid email addresses
    const validEmailArbitrary = fc.tuple(
      fc.stringMatching(/^[a-z0-9]{3,20}$/),
      fc.constantFrom('gmail.com', 'yahoo.com', 'example.com', 'test.org', 'company.co.uk')
    ).map(([local, domain]) => `${local}@${domain}`);

    // Generator for valid passwords (at least 8 characters)
    const validPasswordArbitrary = fc.string({ minLength: 8, maxLength: 50 });

    it.skipIf(!dbAvailable)('should create valid accounts for any valid email and password', async () => {
      await fc.assert(
        fc.asyncProperty(
          validEmailArbitrary,
          validPasswordArbitrary,
          async (email, password) => {
            // Register user
            const user = await authService.register(email, password);

            // Verify user was created in database
            expect(user).toBeDefined();
            expect(user.id).toBeDefined();
            expect(typeof user.id).toBe('string');

            // Verify email is stored correctly (lowercase)
            expect(user.email).toBe(email.toLowerCase());

            // Verify password is hashed (not plain text)
            expect(user.passwordHash).toBeDefined();
            expect(user.passwordHash).not.toBe(password);
            expect(user.passwordHash.length).toBeGreaterThan(50); // bcrypt hashes are ~60 chars
            expect(user.passwordHash.startsWith('$2b$10$')).toBe(true); // bcrypt format with 10 rounds

            // Verify password can be validated
            const isPasswordValid = await authService.comparePassword(password, user.passwordHash);
            expect(isPasswordValid).toBe(true);

            // Verify default values are set correctly
            expect(user.emailVerified).toBe(false); // Email not verified yet
            expect(user.isActive).toBe(true); // Account is active
            expect(user.isAdmin).toBe(false); // Not admin by default
            expect(user.failedLoginAttempts).toBe(0); // No failed attempts
            expect(user.accountLockedUntil).toBeNull(); // Not locked

            // Verify timestamps are set
            expect(user.createdAt).toBeInstanceOf(Date);
            expect(user.updatedAt).toBeInstanceOf(Date);
            expect(user.lastLoginAt).toBeNull(); // No login yet

            // Verify user can be retrieved from database
            const userRepository = dataSource.getRepository(UserEntity);
            const retrievedUser = await userRepository.findOne({
              where: { id: user.id }
            });
            expect(retrievedUser).toBeDefined();
            expect(retrievedUser?.email).toBe(email.toLowerCase());
          }
        ),
        { numRuns: 100 } // Run 100 iterations as specified in design
      );
    });
  });
});
