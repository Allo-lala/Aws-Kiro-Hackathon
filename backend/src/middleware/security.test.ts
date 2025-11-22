import { describe, it, expect, vi } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { sanitizeInput, csrfProtection } from './security';

describe('Security Middleware', () => {
  describe('sanitizeInput', () => {
    it('should remove MongoDB operators from request body', () => {
      const req = {
        body: {
          email: 'test@example.com',
          $where: 'malicious code',
          nested: {
            $gt: 100,
            value: 'safe',
          },
        },
        query: {},
        params: {},
      } as unknown as Request;

      const res = {} as Response;
      const next = vi.fn() as NextFunction;

      sanitizeInput(req, res, next);

      expect(req.body).toEqual({
        email: 'test@example.com',
        nested: {
          value: 'safe',
        },
      });
      expect(next).toHaveBeenCalled();
    });

    it('should escape HTML special characters', () => {
      const req = {
        body: {
          comment: '<script>alert("xss")</script>',
          name: 'John & Jane',
        },
        query: {},
        params: {},
      } as unknown as Request;

      const res = {} as Response;
      const next = vi.fn() as NextFunction;

      sanitizeInput(req, res, next);

      expect(req.body.comment).toContain('&lt;script&gt;');
      expect(req.body.name).toContain('&amp;');
      expect(next).toHaveBeenCalled();
    });

    it('should remove null bytes', () => {
      const req = {
        body: {
          text: 'hello\0world',
        },
        query: {},
        params: {},
      } as unknown as Request;

      const res = {} as Response;
      const next = vi.fn() as NextFunction;

      sanitizeInput(req, res, next);

      expect(req.body.text).toBe('helloworld');
      expect(next).toHaveBeenCalled();
    });

    it('should handle arrays', () => {
      const req = {
        body: {
          items: ['<script>xss</script>', 'safe text', { $where: 'bad' }],
        },
        query: {},
        params: {},
      } as unknown as Request;

      const res = {} as Response;
      const next = vi.fn() as NextFunction;

      sanitizeInput(req, res, next);

      expect(req.body.items[0]).toContain('&lt;script&gt;');
      expect(req.body.items[1]).toBe('safe text');
      expect(req.body.items[2]).toEqual({});
      expect(next).toHaveBeenCalled();
    });
  });

  describe('csrfProtection', () => {
    it('should allow GET requests without CSRF token', () => {
      const req = {
        method: 'GET',
        headers: {},
      } as Request;

      const res = {} as Response;
      const next = vi.fn() as NextFunction;

      csrfProtection(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should allow HEAD requests without CSRF token', () => {
      const req = {
        method: 'HEAD',
        headers: {},
      } as Request;

      const res = {} as Response;
      const next = vi.fn() as NextFunction;

      csrfProtection(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should allow OPTIONS requests without CSRF token', () => {
      const req = {
        method: 'OPTIONS',
        headers: {},
      } as Request;

      const res = {} as Response;
      const next = vi.fn() as NextFunction;

      csrfProtection(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should reject POST requests without CSRF token', () => {
      const req = {
        method: 'POST',
        headers: {},
        user: { id: 'user-123' },
      } as unknown as Request;

      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      } as unknown as Response;

      const next = vi.fn() as NextFunction;

      csrfProtection(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'CSRF validation failed',
        })
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('should reject POST requests without user', () => {
      const req = {
        method: 'POST',
        headers: {
          'x-csrf-token': 'some-token',
        },
      } as unknown as Request;

      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      } as unknown as Response;

      const next = vi.fn() as NextFunction;

      csrfProtection(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(next).not.toHaveBeenCalled();
    });
  });
});
