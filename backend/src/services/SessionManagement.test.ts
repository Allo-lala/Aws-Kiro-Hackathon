import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AuthService } from './AuthService';
import { DatabaseService } from './DatabaseService';
import { SessionEntity } from '../models/entities/Session';
import { UserEntity } from '../models/entities/User';

describe('AuthService - Session Management', () => {
  let authService: AuthService;
  let mockSessionRepository: any;
  let mockUserRepository: any;
  let mockDataSource: any;

  beforeEach(() => {
    // Create mock repositories
    mockSessionRepository = {
      create: vi.fn((data) => ({ ...data, id: 'mock-session-id', createdAt: new Date() })),
      save: vi.fn((session) => Promise.resolve(session)),
      findOne: vi.fn(),
      find: vi.fn(),
      remove: vi.fn((sessions) => Promise.resolve(sessions)),
      createQueryBuilder: vi.fn(() => ({
        where: vi.fn().mockReturnThis(),
        andWhere: vi.fn().mockReturnThis(),
        getMany: vi.fn(() => Promise.resolve([])),
      })),
    };

    mockUserRepository = {
      create: vi.fn(),
      save: vi.fn(),
      findOne: vi.fn(),
    };

    mockDataSource = {
      getRepository: vi.fn((entity) => {
        if (entity.name === 'SessionEntity') return mockSessionRepository;
        if (entity.name === 'UserEntity') return mockUserRepository;
        return mockUserRepository;
      }),
    };

    const mockDatabaseService = {
      getDataSource: () => mockDataSource,
    } as unknown as DatabaseService;

    authService = new AuthService(mockDatabaseService);
  });

  describe('session creation', () => {
    it('should create session with 24-hour expiration', async () => {
      const userId = 'user-123';
      const token = 'jwt-token-123';

      const session = await authService.createSession(userId, token);

      expect(mockSessionRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId,
          token,
          ipAddress: null,
          userAgent: null,
        })
      );
      expect(mockSessionRepository.save).toHaveBeenCalled();

      // Verify expiration is approximately 24 hours from now
      const savedSession = mockSessionRepository.create.mock.calls[0][0];
      const now = new Date();
      const expectedExpiration = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      const timeDiff = Math.abs(savedSession.expiresAt.getTime() - expectedExpiration.getTime());
      expect(timeDiff).toBeLessThan(5000); // Within 5 seconds
    });

    it('should create session with IP address and user agent if provided', async () => {
      const userId = 'user-123';
      const token = 'jwt-token-123';
      const ipAddress = '192.168.1.1';
      const userAgent = 'Mozilla/5.0';

      await authService.createSession(userId, token, ipAddress, userAgent);

      expect(mockSessionRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId,
          token,
          ipAddress,
          userAgent,
        })
      );
    });
  });

  describe('session validation', () => {
    it('should validate token and return user for valid session', async () => {
      const userId = 'user-123';
      const email = 'test@example.com';
      const token = authService.generateToken(userId, email, false);

      const mockSession = {
        id: 'session-123',
        userId,
        token,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
        createdAt: new Date(),
        ipAddress: null,
        userAgent: null,
      };

      const mockUser = {
        id: userId,
        email,
        isActive: true,
        isAdmin: false,
      } as UserEntity;

      mockSessionRepository.findOne.mockResolvedValue(mockSession);
      mockUserRepository.findOne.mockResolvedValue(mockUser);

      const user = await authService.validateToken(token);
      expect(user).toBeDefined();
      expect(user.email).toBe(email);
      expect(mockSessionRepository.findOne).toHaveBeenCalledWith({ where: { token } });
    });

    it('should reject token if session does not exist', async () => {
      const userId = 'user-123';
      const email = 'test@example.com';
      const token = authService.generateToken(userId, email, false);

      mockSessionRepository.findOne.mockResolvedValue(null);

      await expect(authService.validateToken(token)).rejects.toThrow('Session not found');
    });

    it('should reject expired session and clean it up', async () => {
      const userId = 'user-123';
      const email = 'test@example.com';
      const token = authService.generateToken(userId, email, false);

      const expiredSession = {
        id: 'session-123',
        userId,
        token,
        expiresAt: new Date(Date.now() - 1000), // 1 second ago
        createdAt: new Date(),
        ipAddress: null,
        userAgent: null,
      };

      mockSessionRepository.findOne.mockResolvedValue(expiredSession);

      await expect(authService.validateToken(token)).rejects.toThrow('Session expired');
      expect(mockSessionRepository.remove).toHaveBeenCalledWith(expiredSession);
    });

    it('should reject token if user account is disabled', async () => {
      const userId = 'user-123';
      const email = 'test@example.com';
      const token = authService.generateToken(userId, email, false);

      const mockSession = {
        id: 'session-123',
        userId,
        token,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        createdAt: new Date(),
        ipAddress: null,
        userAgent: null,
      };

      const disabledUser = {
        id: userId,
        email,
        isActive: false,
        isAdmin: false,
      } as UserEntity;

      mockSessionRepository.findOne.mockResolvedValue(mockSession);
      mockUserRepository.findOne.mockResolvedValue(disabledUser);

      await expect(authService.validateToken(token)).rejects.toThrow('Account is disabled');
    });
  });

  describe('logout functionality', () => {
    it('should invalidate specific session on logout with token', async () => {
      const userId = 'user-123';
      const token = 'jwt-token-123';

      const mockSession = {
        id: 'session-123',
        userId,
        token,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        createdAt: new Date(),
        ipAddress: null,
        userAgent: null,
      };

      mockSessionRepository.findOne.mockResolvedValue(mockSession);

      await authService.logout(userId, token);

      expect(mockSessionRepository.findOne).toHaveBeenCalledWith({ where: { token, userId } });
      expect(mockSessionRepository.remove).toHaveBeenCalledWith(mockSession);
    });

    it('should invalidate all sessions on logout without token', async () => {
      const userId = 'user-123';

      const mockSessions = [
        { id: 'session-1', userId, token: 'token-1' },
        { id: 'session-2', userId, token: 'token-2' },
      ];

      mockSessionRepository.find.mockResolvedValue(mockSessions);

      await authService.logout(userId);

      expect(mockSessionRepository.find).toHaveBeenCalledWith({ where: { userId } });
      expect(mockSessionRepository.remove).toHaveBeenCalledWith(mockSessions);
    });

    it('should not fail if no sessions exist on logout', async () => {
      const userId = 'user-123';

      mockSessionRepository.find.mockResolvedValue([]);

      await expect(authService.logout(userId)).resolves.not.toThrow();
      expect(mockSessionRepository.remove).not.toHaveBeenCalled();
    });

    it('should not fail if specific session does not exist on logout', async () => {
      const userId = 'user-123';
      const token = 'jwt-token-123';

      mockSessionRepository.findOne.mockResolvedValue(null);

      await expect(authService.logout(userId, token)).resolves.not.toThrow();
      expect(mockSessionRepository.remove).not.toHaveBeenCalled();
    });
  });

  describe('session cleanup', () => {
    it('should clean up expired sessions for user', async () => {
      const userId = 'user-123';

      const expiredSessions = [
        { id: 'session-1', userId, token: 'token-1', expiresAt: new Date(Date.now() - 1000) },
        { id: 'session-2', userId, token: 'token-2', expiresAt: new Date(Date.now() - 2000) },
      ];

      const mockQueryBuilder = {
        where: vi.fn().mockReturnThis(),
        andWhere: vi.fn().mockReturnThis(),
        getMany: vi.fn().mockResolvedValue(expiredSessions),
      };

      mockSessionRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      await authService.cleanupExpiredSessions(userId);

      expect(mockQueryBuilder.where).toHaveBeenCalledWith('session.userId = :userId', { userId });
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('session.expiresAt < :now', expect.any(Object));
      expect(mockSessionRepository.remove).toHaveBeenCalledWith(expiredSessions);
    });

    it('should not fail if no expired sessions exist', async () => {
      const userId = 'user-123';

      const mockQueryBuilder = {
        where: vi.fn().mockReturnThis(),
        andWhere: vi.fn().mockReturnThis(),
        getMany: vi.fn().mockResolvedValue([]),
      };

      mockSessionRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      await expect(authService.cleanupExpiredSessions(userId)).resolves.not.toThrow();
      expect(mockSessionRepository.remove).not.toHaveBeenCalled();
    });
  });

  describe('getSession', () => {
    it('should retrieve session by token', async () => {
      const token = 'jwt-token-123';
      const mockSession = {
        id: 'session-123',
        userId: 'user-123',
        token,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        createdAt: new Date(),
        ipAddress: null,
        userAgent: null,
      };

      mockSessionRepository.findOne.mockResolvedValue(mockSession);

      const session = await authService.getSession(token);

      expect(session).toEqual(mockSession);
      expect(mockSessionRepository.findOne).toHaveBeenCalledWith({ where: { token } });
    });

    it('should return null if session does not exist', async () => {
      const token = 'jwt-token-123';

      mockSessionRepository.findOne.mockResolvedValue(null);

      const session = await authService.getSession(token);

      expect(session).toBeNull();
    });
  });
});
