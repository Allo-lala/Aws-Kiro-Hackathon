import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';
import { checkEndpoint } from './health-check';

// Mock axios
vi.mock('axios');
const mockedAxios = vi.mocked(axios);

describe('Health Check', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('checkEndpoint', () => {
    it('should return healthy status for successful responses', async () => {
      mockedAxios.mockResolvedValueOnce({
        status: 200,
        statusText: 'OK',
        data: { message: 'Success' },
      } as any);

      const result = await checkEndpoint('http://example.com/api/test', 'GET');

      expect(result.healthy).toBe(true);
      expect(result.status).toBe(200);
      expect(result.responseTime).toBeGreaterThanOrEqual(0);
      expect(result.error).toBeUndefined();
    });

    it('should return unhealthy status for 5xx errors', async () => {
      mockedAxios.mockResolvedValueOnce({
        status: 500,
        statusText: 'Internal Server Error',
        data: { message: 'Server error' },
      } as any);

      const result = await checkEndpoint('http://example.com/api/test', 'GET');

      expect(result.healthy).toBe(false);
      expect(result.status).toBe(500);
      expect(result.responseTime).toBeGreaterThanOrEqual(0);
    });

    it('should return healthy status for 4xx errors (client errors)', async () => {
      mockedAxios.mockResolvedValueOnce({
        status: 404,
        statusText: 'Not Found',
        data: { message: 'Not found' },
      } as any);

      const result = await checkEndpoint('http://example.com/api/test', 'GET');

      expect(result.healthy).toBe(true); // 4xx is considered healthy (server is responding)
      expect(result.status).toBe(404);
      expect(result.details).toBeDefined();
    });

    it('should handle network errors', async () => {
      const networkError = new Error('Network Error');
      (networkError as any).code = 'ECONNREFUSED';
      mockedAxios.mockRejectedValueOnce(networkError);

      const result = await checkEndpoint('http://example.com/api/test', 'GET');

      expect(result.healthy).toBe(false);
      expect(result.status).toBe(0);
      expect(result.error).toBe('Network Error');
      expect(result.details).toBe('ECONNREFUSED');
    });

    it('should handle timeout errors', async () => {
      const timeoutError = new Error('timeout of 5000ms exceeded');
      (timeoutError as any).code = 'ECONNABORTED';
      mockedAxios.mockRejectedValueOnce(timeoutError);

      const result = await checkEndpoint('http://example.com/api/test', 'GET', undefined, 5000);

      expect(result.healthy).toBe(false);
      expect(result.error).toContain('timeout');
    });

    it('should measure response time', async () => {
      mockedAxios.mockImplementation(() => {
        return new Promise((resolve) => {
          setTimeout(() => {
            resolve({
              status: 200,
              statusText: 'OK',
              data: {},
            } as any);
          }, 100);
        });
      });

      const result = await checkEndpoint('http://example.com/api/test', 'GET');

      expect(result.responseTime).toBeGreaterThanOrEqual(100);
      expect(result.healthy).toBe(true);
    });

    it('should include request data for POST requests', async () => {
      mockedAxios.mockResolvedValueOnce({
        status: 201,
        statusText: 'Created',
        data: { id: 1 },
      } as any);

      const testData = { name: 'test' };
      await checkEndpoint('http://example.com/api/test', 'POST', testData);

      expect(mockedAxios).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'POST',
          data: testData,
        })
      );
    });

    it('should use custom timeout', async () => {
      mockedAxios.mockResolvedValueOnce({
        status: 200,
        statusText: 'OK',
        data: {},
      } as any);

      await checkEndpoint('http://example.com/api/test', 'GET', undefined, 15000);

      expect(mockedAxios).toHaveBeenCalledWith(
        expect.objectContaining({
          timeout: 15000,
        })
      );
    });
  });
});
