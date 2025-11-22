import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ApiGateway } from './ApiGateway';

describe('ApiGateway', () => {
  let gateway: ApiGateway;
  let mockLogger: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockLogger = vi.fn();
    gateway = new ApiGateway(mockLogger);
  });

  describe('Service Registration', () => {
    it('should register a service successfully', () => {
      const config = {
        baseURL: 'https://api.example.com',
        timeout: 5000,
        retries: 3,
        rateLimit: { maxRequests: 100, windowMs: 60000 }
      };

      expect(() => {
        gateway.registerService('test-service', config);
      }).not.toThrow();

      expect(mockLogger).toHaveBeenCalledWith(
        'info',
        'Registered service: test-service',
        config
      );
    });

    it('should initialize service health when registering', () => {
      const config = {
        baseURL: 'https://api.example.com',
        timeout: 5000,
        retries: 3,
        rateLimit: { maxRequests: 100, windowMs: 60000 }
      };

      gateway.registerService('test-service', config);
      
      const health = gateway.getServiceHealth('test-service');
      expect(health).toMatchObject({
        serviceName: 'test-service',
        status: 'healthy',
        errorCount: 0,
        uptime: 100
      });
    });
  });

  describe('Cache Management', () => {
    it('should clear all cache when no pattern provided', () => {
      gateway.clearCache();
      
      const stats = gateway.getCacheStats();
      expect(stats.size).toBe(0);
      expect(stats.entries).toEqual([]);
    });

    it('should provide cache statistics', () => {
      const stats = gateway.getCacheStats();
      
      expect(stats).toHaveProperty('size');
      expect(stats).toHaveProperty('entries');
      expect(Array.isArray(stats.entries)).toBe(true);
    });
  });

  describe('Service Health', () => {
    it('should return all service health when no service name provided', () => {
      gateway.registerService('service1', {
        baseURL: 'https://api1.example.com',
        timeout: 5000,
        retries: 3,
        rateLimit: { maxRequests: 100, windowMs: 60000 }
      });

      gateway.registerService('service2', {
        baseURL: 'https://api2.example.com',
        timeout: 5000,
        retries: 3,
        rateLimit: { maxRequests: 100, windowMs: 60000 }
      });

      const allHealth = gateway.getServiceHealth();
      expect(Array.isArray(allHealth)).toBe(true);
      expect(allHealth).toHaveLength(2);
    });

    it('should throw error for non-existent service', () => {
      expect(() => {
        gateway.getServiceHealth('non-existent');
      }).toThrow('Service not found: non-existent');
    });
  });

  describe('Error Handling', () => {
    it('should throw error when requesting from unregistered service', async () => {
      await expect(
        gateway.request('unregistered-service', { url: '/test' })
      ).rejects.toThrow('Service not registered: unregistered-service');
    });
  });
});