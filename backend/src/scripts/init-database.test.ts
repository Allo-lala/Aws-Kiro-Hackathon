import { describe, it, expect } from 'vitest';
import { validateConnectionString } from './init-database';

describe('Database Initializer', () => {
  describe('validateConnectionString', () => {
    it('should accept valid PostgreSQL connection strings', () => {
      const validStrings = [
        'postgresql://user:pass@localhost:5432/database',
        'postgres://user:pass@host.com:5432/db',
        'postgresql://user:pass@ep-xxx.region.aws.neon.tech/database?sslmode=require',
      ];

      validStrings.forEach(str => {
        const result = validateConnectionString(str);
        expect(result.valid).toBe(true);
        expect(result.error).toBeUndefined();
      });
    });

    it('should reject invalid connection strings', () => {
      const invalidStrings = [
        '',
        'not-a-url',
        'http://localhost:5432/db',
        'postgresql://localhost', // missing database name
        'postgresql://localhost:5432/', // missing database name
      ];

      invalidStrings.forEach(str => {
        const result = validateConnectionString(str);
        expect(result.valid).toBe(false);
        expect(result.error).toBeDefined();
      });
    });

    it('should reject connection strings missing hostname', () => {
      const result = validateConnectionString('postgresql://:5432/database');
      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should reject connection strings missing database name', () => {
      const result = validateConnectionString('postgresql://user:pass@localhost:5432/');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('database name');
    });
  });
});
