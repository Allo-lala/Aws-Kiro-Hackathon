import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EmailService } from './EmailService';

describe('EmailService', () => {
  let emailService: EmailService;

  beforeEach(() => {
    emailService = new EmailService();
    // Clear console mocks
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  describe('sendVerificationEmail', () => {
    it('should send verification email in development mode', async () => {
      const email = 'test@example.com';
      const token = 'test-token-123';
      const baseUrl = 'http://localhost:8080';

      await emailService.sendVerificationEmail(email, token, baseUrl);

      // In development mode, it should log to console
      expect(console.log).toHaveBeenCalled();
    });

    it('should include verification URL in email', async () => {
      const email = 'test@example.com';
      const token = 'test-token-123';
      const baseUrl = 'http://localhost:8080';

      await emailService.sendVerificationEmail(email, token, baseUrl);

      // Verify console output contains the verification URL
      const expectedUrl = `${baseUrl}/api/auth/verify-email/${token}`;
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining(expectedUrl)
      );
    });
  });

  describe('sendPasswordResetEmail', () => {
    it('should send password reset email in development mode', async () => {
      const email = 'test@example.com';
      const token = 'reset-token-123';
      const baseUrl = 'http://localhost:8080';

      await emailService.sendPasswordResetEmail(email, token, baseUrl);

      // In development mode, it should log to console
      expect(console.log).toHaveBeenCalled();
    });

    it('should include reset URL in email', async () => {
      const email = 'test@example.com';
      const token = 'reset-token-123';
      const baseUrl = 'http://localhost:8080';

      await emailService.sendPasswordResetEmail(email, token, baseUrl);

      // Verify console output contains the reset URL
      const expectedUrl = `${baseUrl}/reset-password/${token}`;
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining(expectedUrl)
      );
    });
  });

  describe('generateToken', () => {
    it('should generate a random token', () => {
      const token1 = EmailService.generateToken();
      const token2 = EmailService.generateToken();

      expect(token1).toBeTruthy();
      expect(token2).toBeTruthy();
      expect(token1).not.toBe(token2);
    });

    it('should generate token of specified length', () => {
      const length = 16;
      const token = EmailService.generateToken(length);

      // Hex encoding doubles the length (2 chars per byte)
      expect(token.length).toBe(length * 2);
    });

    it('should generate hex-encoded token', () => {
      const token = EmailService.generateToken();

      // Should only contain hex characters
      expect(token).toMatch(/^[0-9a-f]+$/);
    });
  });

  describe('generateTokenExpiration', () => {
    it('should generate expiration date in the future', () => {
      const expiration = EmailService.generateTokenExpiration(24);
      const now = new Date();

      expect(expiration.getTime()).toBeGreaterThan(now.getTime());
    });

    it('should generate expiration with correct hours offset', () => {
      const hours = 2;
      const expiration = EmailService.generateTokenExpiration(hours);
      const now = new Date();
      const expectedTime = now.getTime() + hours * 60 * 60 * 1000;

      // Allow 1 second tolerance for test execution time
      expect(Math.abs(expiration.getTime() - expectedTime)).toBeLessThan(1000);
    });

    it('should default to 24 hours', () => {
      const expiration = EmailService.generateTokenExpiration();
      const now = new Date();
      const expectedTime = now.getTime() + 24 * 60 * 60 * 1000;

      // Allow 1 second tolerance
      expect(Math.abs(expiration.getTime() - expectedTime)).toBeLessThan(1000);
    });
  });
});
