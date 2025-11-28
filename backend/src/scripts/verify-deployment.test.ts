import { describe, it, expect } from 'vitest';
import { validateConnectionString } from './verify-deployment';

describe('Deployment Verification', () => {
  describe('validateConnectionString', () => {
    it('should accept valid PostgreSQL connection strings', () => {
      const validStrings = [
        'postgresql://user:pass@localhost:5432/database',
        'postgres://user:pass@host.com:5432/db',
        'postgresql://user:pass@neon.tech/mydb',
        'postgres://user@localhost/database',
      ];

      validStrings.forEach((connectionString) => {
        const result = validateConnectionString(connectionString);
        expect(result.valid).toBe(true);
        expect(result.error).toBeUndefined();
      });
    });

    it('should reject empty or null connection strings', () => {
      const result1 = validateConnectionString('');
      expect(result1.valid).toBe(false);
      expect(result1.error).toContain('required');

      const result2 = validateConnectionString(null as any);
      expect(result2.valid).toBe(false);
      expect(result2.error).toContain('required');
    });

    it('should reject non-PostgreSQL URLs', () => {
      const invalidStrings = [
        'mysql://user:pass@localhost:3306/database',
        'http://example.com',
        'not-a-url',
        'ftp://server.com',
      ];

      invalidStrings.forEach((connectionString) => {
        const result = validateConnectionString(connectionString);
        expect(result.valid).toBe(false);
        expect(result.error).toBeDefined();
      });
    });

    it('should reject connection strings without database name', () => {
      const result = validateConnectionString('postgresql://user:pass@localhost:5432/');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('database name');
    });

    it('should reject connection strings without hostname', () => {
      const result = validateConnectionString('postgresql:///database');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('hostname');
    });
  });
});
