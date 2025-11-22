import { DataSource, EntityManager, QueryRunner } from 'typeorm';
import { AppDataSource } from '../config/database';

export interface IDatabaseService {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  transaction<T>(callback: (manager: EntityManager) => Promise<T>): Promise<T>;
  runMigrations(): Promise<void>;
  healthCheck(): Promise<boolean>;
  getDataSource(): DataSource;
}

export class DatabaseService implements IDatabaseService {
  private dataSource: DataSource;
  private isConnected: boolean = false;

  constructor(dataSource: DataSource = AppDataSource) {
    this.dataSource = dataSource;
  }

  /**
   * Establish connection to the database with connection pooling
   */
  async connect(): Promise<void> {
    if (this.isConnected) {
      console.log('Database already connected');
      return;
    }

    try {
      await this.dataSource.initialize();
      this.isConnected = true;
      console.log('Database connection established successfully');
      console.log(`Connection pool: max=${this.dataSource.options.extra?.max || 'default'}, min=${this.dataSource.options.extra?.min || 'default'}`);
    } catch (error) {
      console.error('Failed to connect to database:', error);
      throw new Error(`Database connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Close database connection and release pool resources
   */
  async disconnect(): Promise<void> {
    if (!this.isConnected) {
      console.log('Database already disconnected');
      return;
    }

    try {
      await this.dataSource.destroy();
      this.isConnected = false;
      console.log('Database connection closed successfully');
    } catch (error) {
      console.error('Failed to disconnect from database:', error);
      throw new Error(`Database disconnection failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Execute operations within a database transaction
   * Automatically handles commit/rollback
   */
  async transaction<T>(callback: (manager: EntityManager) => Promise<T>): Promise<T> {
    if (!this.isConnected) {
      throw new Error('Database not connected. Call connect() first.');
    }

    const queryRunner: QueryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const result = await callback(queryRunner.manager);
      await queryRunner.commitTransaction();
      return result;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      console.error('Transaction failed, rolled back:', error);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Run pending database migrations
   */
  async runMigrations(): Promise<void> {
    if (!this.isConnected) {
      throw new Error('Database not connected. Call connect() first.');
    }

    try {
      const migrations = await this.dataSource.runMigrations();
      if (migrations.length === 0) {
        console.log('No pending migrations to run');
      } else {
        console.log(`Successfully ran ${migrations.length} migration(s):`);
        migrations.forEach(migration => {
          console.log(`  - ${migration.name}`);
        });
      }
    } catch (error) {
      console.error('Failed to run migrations:', error);
      throw new Error(`Migration failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Check if database connection is healthy
   */
  async healthCheck(): Promise<boolean> {
    if (!this.isConnected) {
      return false;
    }

    try {
      await this.dataSource.query('SELECT 1');
      return true;
    } catch (error) {
      console.error('Database health check failed:', error);
      return false;
    }
  }

  /**
   * Get the underlying TypeORM DataSource
   */
  getDataSource(): DataSource {
    return this.dataSource;
  }

  /**
   * Check if database is connected
   */
  isConnectionActive(): boolean {
    return this.isConnected && this.dataSource.isInitialized;
  }

  /**
   * Execute a raw SQL query with parameters
   * Uses parameterized queries to prevent SQL injection
   */
  async query(sql: string, parameters?: any[]): Promise<any> {
    if (!this.isConnected) {
      throw new Error('Database not connected. Call connect() first.');
    }

    try {
      return await this.dataSource.query(sql, parameters);
    } catch (error) {
      console.error('Query execution failed:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const databaseService = new DatabaseService();
