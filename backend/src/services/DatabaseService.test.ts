import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { DatabaseService } from './DatabaseService';
import { DataSource } from 'typeorm';

describe('DatabaseService', () => {
  let dbService: DatabaseService;
  let mockDataSource: DataSource;

  beforeAll(() => {
    // Create a mock DataSource for testing
    mockDataSource = {
      initialize: async () => {},
      destroy: async () => {},
      isInitialized: true,
      createQueryRunner: () => ({
        connect: async () => {},
        startTransaction: async () => {},
        commitTransaction: async () => {},
        rollbackTransaction: async () => {},
        release: async () => {},
        manager: {
          save: async (entity: any, data: any) => data,
        },
      }),
      runMigrations: async () => [],
      query: async () => [{ result: 1 }],
      options: {
        extra: {
          max: 20,
          min: 5,
        },
      },
    } as any;

    dbService = new DatabaseService(mockDataSource);
  });

  afterAll(async () => {
    if (dbService.isConnectionActive()) {
      await dbService.disconnect();
    }
  });

  it('should connect to database successfully', async () => {
    await dbService.connect();
    expect(dbService.isConnectionActive()).toBe(true);
  });

  it('should perform health check', async () => {
    await dbService.connect();
    const isHealthy = await dbService.healthCheck();
    expect(isHealthy).toBe(true);
  });

  it('should execute transactions', async () => {
    await dbService.connect();
    
    const result = await dbService.transaction(async (manager) => {
      return { id: '123', name: 'test' };
    });

    expect(result).toEqual({ id: '123', name: 'test' });
  });

  it('should run migrations', async () => {
    await dbService.connect();
    await expect(dbService.runMigrations()).resolves.not.toThrow();
  });

  it('should get data source', () => {
    const dataSource = dbService.getDataSource();
    expect(dataSource).toBeDefined();
  });

  it('should disconnect from database', async () => {
    await dbService.connect();
    await dbService.disconnect();
    expect(dbService.isConnectionActive()).toBe(false);
  });

  it('should throw error when transaction without connection', async () => {
    const freshService = new DatabaseService(mockDataSource);
    await expect(
      freshService.transaction(async () => {})
    ).rejects.toThrow('Database not connected');
  });

  it('should throw error when running migrations without connection', async () => {
    const freshService = new DatabaseService(mockDataSource);
    await expect(freshService.runMigrations()).rejects.toThrow('Database not connected');
  });
});
