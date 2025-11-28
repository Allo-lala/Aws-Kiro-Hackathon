import { describe, it, expect } from 'vitest';
import { validateConnectionString, createDataSourceConfig } from './run-migrations';

describe('Migration Runner', () => {
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

  describe('createDataSourceConfig', () => {
    it('should create valid DataSource configuration', () => {
      const connectionString = 'postgresql://user:pass@localhost:5432/testdb';
      const config = createDataSourceConfig(connectionString);

      expect(config.type).toBe('postgres');
      expect(config.url).toBe(connectionString);
      expect(config.synchronize).toBe(false);
      expect(config.ssl).toEqual({ rejectUnauthorized: false });
      expect(config.migrations).toBeDefined();
      expect(config.entities).toBeDefined();
    });

    it('should include SSL configuration for secure connections', () => {
      const connectionString = 'postgresql://user:pass@neon.tech:5432/proddb';
      const config = createDataSourceConfig(connectionString);

      expect(config.ssl).toEqual({ rejectUnauthorized: false });
    });

    it('should set synchronize to false to prevent auto-schema changes', () => {
      const connectionString = 'postgresql://user:pass@localhost:5432/testdb';
      const config = createDataSourceConfig(connectionString);

      expect(config.synchronize).toBe(false);
    });
  });
});
