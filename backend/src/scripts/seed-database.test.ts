import { describe, it, expect } from 'vitest';
import { validateConnectionString } from './seed-database';

describe('Seed Database Script', () => {
  describe('validateConnectionString', () => {
    it('should accept valid PostgreSQL connection strings', () => {
      const validStrings = [
        'postgresql://user:pass@localhost:5432/database',
        'postgres://user:pass@host.com:5432/db',
        'postgresql://user:pass@192.168.1.1:5432/mydb',
      ];

      validStrings.forEach((connectionString) => {
        const result = validateConnectionString(connectionString);
        expect(result.valid).toBe(true);
        expect(result.error).toBeUndefined();
      });
    });

    it('should reject invalid connection strings', () => {
      const invalidStrings = [
        '',
        'not-a-url',
        'http://localhost:5432/db',
        'postgresql://',
        'postgresql://localhost',
      ];

      invalidStrings.forEach((connectionString) => {
        const result = validateConnectionString(connectionString);
        expect(result.valid).toBe(false);
        expect(result.error).toBeDefined();
      });
    });

    it('should reject connection strings without hostname', () => {
      const result = validateConnectionString('postgresql://:5432/database');
      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should reject connection strings without database name', () => {
      const result = validateConnectionString('postgresql://user:pass@localhost:5432/');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('database name');
    });
  });
});
