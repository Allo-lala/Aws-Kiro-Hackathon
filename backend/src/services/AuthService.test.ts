import { describe, it, expect } from 'vitest';
import { AuthService } from './AuthService';
import { DatabaseService } from './DatabaseService';

describe('AuthService - Core Logic (No Database)', () => {
  // Create a mock database service for testing core logic
  const mockDatabaseService = {
    getDataSource: () => ({
      getRepository: () => ({}),
    }),
  } as unknown as DatabaseService;

  const authService = new AuthService(mockDatabaseService);

  describe('password hashing', () => {
    it('should hash passwords with bcrypt using 10 salt rounds', async () => {
      const password = 'testpassword123';
      const hash = await authService.hashPassword(password);

      expect(hash).toBeDefined();
      expect(hash).not.toBe(password);
      expect(hash.length).toBeGreaterThan(50); // bcrypt hashes are typically 60 chars
      expect(hash.startsWith('$2b$10$')).toBe(true); // bcrypt format with 10 rounds
    });

    it('should verify correct passwords', async () => {
      const password = 'testpassword123';
      const hash = await authService.hashPassword(password);

      const isValid = await authService.comparePassword(password, hash);
      expect(isValid).toBe(true);
    });

    it('should reject incorrect passwords', async () => {
      const password = 'testpassword123';
      const hash = await authService.hashPassword(password);

      const isValid = await authService.comparePassword('wrongpassword', hash);
      expect(isValid).toBe(false);
    });

    it('should generate different hashes for the same password', async () => {
      const password = 'testpassword123';
      const hash1 = await authService.hashPassword(password);
      const hash2 = await authService.hashPassword(password);

      expect(hash1).not.toBe(hash2); // Salt makes each hash unique
      expect(await authService.comparePassword(password, hash1)).toBe(true);
      expect(await authService.comparePassword(password, hash2)).toBe(true);
    });
  });

  describe('token generation', () => {
    it('should generate valid JWT tokens', () => {
      const userId = '123e4567-e89b-12d3-a456-426614174000';
      const email = 'test@example.com';
      const isAdmin = false;

      const token = authService.generateToken(userId, email, isAdmin);

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3); // JWT has 3 parts: header.payload.signature
    });

    it('should generate different tokens for different users', () => {
      const token1 = authService.generateToken('user1', 'user1@example.com', false);
      const token2 = authService.generateToken('user2', 'user2@example.com', false);

      expect(token1).not.toBe(token2);
    });

    it('should include admin flag in token', () => {
      const userId = '123e4567-e89b-12d3-a456-426614174000';
      const email = 'admin@example.com';

      const adminToken = authService.generateToken(userId, email, true);
      const userToken = authService.generateToken(userId, email, false);

      expect(adminToken).not.toBe(userToken);
    });
  });
});

describe('AuthService - Email Verification Logic', () => {
  // Create a mock database service for testing validation logic
  const mockDatabaseService = {
    getDataSource: () => ({
      getRepository: () => ({}),
    }),
  } as unknown as DatabaseService;

  const authService = new AuthService(mockDatabaseService);

  describe('email validation', () => {
    it('should validate correct email formats', async () => {
      const validEmails = [
        'test@example.com',
        'user.name@example.com',
        'user+tag@example.co.uk',
        'user123@test-domain.com',
      ];

      // Test by attempting registration (will fail at DB but validates email first)
      for (const email of validEmails) {
        try {
          await authService.register(email, 'password123');
        } catch (error: any) {
          // Should not fail with email validation error
          expect(error.message).not.toBe('Invalid email format');
        }
      }
    });

    it('should reject invalid email formats', async () => {
      const invalidEmails = [
        'notanemail',
        '@example.com',
        'user@',
        'user @example.com',
        'user@.com',
      ];

      for (const email of invalidEmails) {
        await expect(authService.register(email, 'password123')).rejects.toThrow(
          'Invalid email format'
        );
      }
    });
  });

  describe('password validation', () => {
    it('should accept passwords with 8 or more characters', async () => {
      const validPasswords = ['12345678', 'password', 'abcdefgh', 'P@ssw0rd!'];

      for (const password of validPasswords) {
        try {
          await authService.register('test@example.com', password);
        } catch (error: any) {
          // Should not fail with password validation error
          expect(error.message).not.toBe('Password must be at least 8 characters long');
        }
      }
    });

    it('should reject passwords with less than 8 characters', async () => {
      const invalidPasswords = ['', '1', '12', '123', '1234', '12345', '123456', '1234567'];

      for (const password of invalidPasswords) {
        await expect(authService.register('test@example.com', password)).rejects.toThrow(
          'Password must be at least 8 characters long'
        );
      }
    });
  });
});
