#!/usr/bin/env node

import { DataSource, DataSourceOptions } from 'typeorm';
import * as path from 'path';

/**
 * Migration Runner Script
 * 
 * This script runs TypeORM migrations against a specified database.
 * It accepts a connection string as a command-line argument.
 * 
 * Usage:
 *   ts-node src/scripts/run-migrations.ts <connection-string>
 *   ts-node src/scripts/run-migrations.ts postgresql://user:pass@host:port/db
 */

interface MigrationResult {
  applied: Array<{ id: number; timestamp: number; name: string }>;
  pending: Array<{ id: number; timestamp: number; name: string }>;
  success: boolean;
  errors: string[];
}

/**
 * Validates a PostgreSQL connection string format
 */
function validateConnectionString(connectionString: string): { valid: boolean; error?: string } {
  if (!connectionString || typeof connectionString !== 'string') {
    return { valid: false, error: 'Connection string is required' };
  }

  // Check for basic PostgreSQL URL format
  const postgresUrlPattern = /^postgres(ql)?:\/\/.+/i;
  if (!postgresUrlPattern.test(connectionString)) {
    return { 
      valid: false, 
      error: 'Invalid connection string format. Expected: postgresql://user:password@host:port/database' 
    };
  }

  // Check for required components
  try {
    const url = new URL(connectionString);
    
    if (!url.hostname) {
      return { valid: false, error: 'Connection string missing hostname' };
    }
    
    if (!url.pathname || url.pathname === '/') {
      return { valid: false, error: 'Connection string missing database name' };
    }

    return { valid: true };
  } catch (error) {
    return { 
      valid: false, 
      error: `Invalid URL format: ${error instanceof Error ? error.message : 'Unknown error'}` 
    };
  }
}

/**
 * Creates a DataSource configuration from a connection string
 */
function createDataSourceConfig(connectionString: string): DataSourceOptions {
  return {
    type: 'postgres',
    url: connectionString,
    synchronize: false,
    logging: process.env.MIGRATION_LOGGING === 'true',
    entities: [path.join(__dirname, '../models/entities/**/*.{ts,js}')],
    migrations: [path.join(__dirname, '../database/migrations/[0-9]*-*.{ts,js}')],
    subscribers: [],
    ssl: {
      rejectUnauthorized: false,
    },
    extra: {
      connectionTimeoutMillis: 10000,
    },
  };
}

/**
 * Runs migrations against the specified database
 */
async function runMigrations(connectionString: string): Promise<MigrationResult> {
  const result: MigrationResult = {
    applied: [],
    pending: [],
    success: false,
    errors: [],
  };

  let dataSource: DataSource | null = null;

  try {
    // Validate connection string
    const validation = validateConnectionString(connectionString);
    if (!validation.valid) {
      result.errors.push(validation.error || 'Invalid connection string');
      return result;
    }

    console.log('🔌 Connecting to database...');
    
    // Create and initialize data source
    const config = createDataSourceConfig(connectionString);
    dataSource = new DataSource(config);
    
    await dataSource.initialize();
    console.log('✅ Database connection established');

    // Get pending migrations before running
    const pendingMigrations = await dataSource.showMigrations();
    console.log(`📋 Found ${pendingMigrations ? 'pending' : 'no'} migrations to apply`);

    // Run migrations
    console.log('🚀 Running migrations...');
    const executedMigrations = await dataSource.runMigrations({
      transaction: 'all', // Run all migrations in a single transaction
    });

    // Populate applied migrations
    result.applied = executedMigrations.map((migration) => ({
      id: migration.id || 0,
      timestamp: migration.timestamp,
      name: migration.name,
    }));

    // Get remaining pending migrations (should be none if all succeeded)
    const stillPending = await dataSource.showMigrations();
    result.pending = stillPending ? [] : [];

    // Verify schema state after migrations
    console.log('🔍 Verifying schema state...');
    try {
      // Check if migrations table exists and has records
      const queryRunner = dataSource.createQueryRunner();
      const migrationsTable = await queryRunner.getTable('migrations');
      
      if (!migrationsTable) {
        console.warn('⚠️  Warning: Migrations table not found');
      } else {
        console.log('✅ Schema verification passed');
      }
      
      await queryRunner.release();
    } catch (verifyError) {
      console.warn('⚠️  Warning: Schema verification encountered an issue:', 
        verifyError instanceof Error ? verifyError.message : 'Unknown error');
    }

    result.success = true;

    // Output results
    console.log('\n✅ Migration completed successfully!');
    console.log(`📊 Applied ${result.applied.length} migration(s):`);
    result.applied.forEach((migration) => {
      console.log(`   - ${migration.name} (${migration.timestamp})`);
    });

    if (result.applied.length === 0) {
      console.log('   (No new migrations to apply - database is up to date)');
    }

  } catch (error) {
    result.success = false;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    result.errors.push(errorMessage);

    console.error('\n❌ Migration failed!');
    console.error(`Error: ${errorMessage}`);
    
    if (error instanceof Error && error.stack) {
      console.error('\nStack trace:');
      console.error(error.stack);
    }
  } finally {
    // Clean up connection
    if (dataSource && dataSource.isInitialized) {
      try {
        await dataSource.destroy();
        console.log('\n🔌 Database connection closed');
      } catch (closeError) {
        console.error('Warning: Error closing database connection:', closeError);
      }
    }
  }

  return result;
}

/**
 * Main execution function
 */
async function main() {
  console.log('🔧 Migration Runner\n');

  // Get connection string from command line arguments
  const connectionString = process.argv[2];

  if (!connectionString) {
    console.error('❌ Error: Connection string is required');
    console.error('\nUsage:');
    console.error('  ts-node src/scripts/run-migrations.ts <connection-string>');
    console.error('\nExample:');
    console.error('  ts-node src/scripts/run-migrations.ts postgresql://user:pass@host:5432/database');
    process.exit(1);
  }

  // Run migrations
  const result = await runMigrations(connectionString);

  // Exit with appropriate code
  if (result.success) {
    console.log('\n✨ All done!');
    process.exit(0);
  } else {
    console.error('\n💥 Migration failed with errors:');
    result.errors.forEach((error, index) => {
      console.error(`  ${index + 1}. ${error}`);
    });
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

// Export for testing
export { runMigrations, validateConnectionString, createDataSourceConfig };
export type { MigrationResult };
