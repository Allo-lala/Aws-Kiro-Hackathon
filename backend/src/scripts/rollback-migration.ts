#!/usr/bin/env node

import { DataSource, DataSourceOptions } from 'typeorm';
import * as path from 'path';

/**
 * Migration Rollback Script
 * 
 * This script reverts TypeORM migrations against a specified database.
 * It can rollback the last migration or multiple migrations.
 * 
 * Usage:
 *   ts-node src/scripts/rollback-migration.ts <connection-string> [--steps N]
 *   ts-node src/scripts/rollback-migration.ts postgresql://user:pass@host:port/db
 *   ts-node src/scripts/rollback-migration.ts postgresql://user:pass@host:port/db --steps 3
 */

interface Migration {
  id: number;
  timestamp: number;
  name: string;
}

interface RollbackResult {
  reverted: Migration[];
  remaining: Migration[];
  success: boolean;
  errors: string[];
  schemaVerified: boolean;
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
 * Gets the list of executed migrations from the database
 */
async function getExecutedMigrations(dataSource: DataSource): Promise<Migration[]> {
  try {
    const queryRunner = dataSource.createQueryRunner();
    
    // Check if migrations table exists
    const hasTable = await queryRunner.hasTable('migrations');
    if (!hasTable) {
      await queryRunner.release();
      return [];
    }

    // Query executed migrations ordered by timestamp descending (most recent first)
    const migrations = await queryRunner.query(
      'SELECT id, timestamp, name FROM migrations ORDER BY timestamp DESC'
    );
    
    await queryRunner.release();
    
    return migrations.map((m: any) => ({
      id: m.id,
      timestamp: parseInt(m.timestamp, 10),
      name: m.name,
    }));
  } catch (error) {
    console.error('Error fetching executed migrations:', error);
    return [];
  }
}

/**
 * Verifies schema state after rollback
 */
async function verifySchemaState(dataSource: DataSource): Promise<{ verified: boolean; message: string }> {
  try {
    const queryRunner = dataSource.createQueryRunner();
    
    // Check if migrations table exists
    const migrationsTable = await queryRunner.hasTable('migrations');
    
    if (!migrationsTable) {
      await queryRunner.release();
      return {
        verified: false,
        message: 'Migrations table not found - database may be in inconsistent state',
      };
    }

    // Get count of remaining migrations
    const result = await queryRunner.query('SELECT COUNT(*) as count FROM migrations');
    const count = parseInt(result[0].count, 10);
    
    await queryRunner.release();
    
    return {
      verified: true,
      message: `Schema verification passed - ${count} migration(s) remain in database`,
    };
  } catch (error) {
    return {
      verified: false,
      message: `Schema verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * Rolls back migrations
 */
async function rollbackMigrations(
  connectionString: string,
  steps: number = 1
): Promise<RollbackResult> {
  const result: RollbackResult = {
    reverted: [],
    remaining: [],
    success: false,
    errors: [],
    schemaVerified: false,
  };

  let dataSource: DataSource | null = null;

  try {
    // Validate connection string
    const validation = validateConnectionString(connectionString);
    if (!validation.valid) {
      result.errors.push(validation.error || 'Invalid connection string');
      return result;
    }

    // Validate steps parameter
    if (steps < 1) {
      result.errors.push('Steps must be at least 1');
      return result;
    }

    console.log('🔌 Connecting to database...');
    
    // Create and initialize data source
    const config = createDataSourceConfig(connectionString);
    dataSource = new DataSource(config);
    
    await dataSource.initialize();
    console.log('✅ Database connection established');

    // Get executed migrations before rollback
    const executedBefore = await getExecutedMigrations(dataSource);
    
    if (executedBefore.length === 0) {
      console.log('ℹ️  No migrations to rollback - database has no executed migrations');
      result.success = true;
      result.schemaVerified = true;
      return result;
    }

    // Identify migrations to rollback
    const migrationsToRollback = executedBefore.slice(0, Math.min(steps, executedBefore.length));
    
    console.log(`\n📋 Identified ${migrationsToRollback.length} migration(s) to rollback:`);
    migrationsToRollback.forEach((migration, index) => {
      console.log(`   ${index + 1}. ${migration.name} (${migration.timestamp})`);
    });

    if (steps > executedBefore.length) {
      console.log(`\n⚠️  Warning: Requested ${steps} steps but only ${executedBefore.length} migration(s) available`);
    }

    // Perform rollback
    console.log('\n🔄 Rolling back migrations...');
    
    for (let i = 0; i < migrationsToRollback.length; i++) {
      const migration = migrationsToRollback[i];
      console.log(`\n   Rolling back: ${migration.name}`);
      
      try {
        // TypeORM's undoLastMigration reverts one migration at a time
        await dataSource.undoLastMigration({
          transaction: 'all', // Run rollback in a transaction
        });
        
        result.reverted.push(migration);
        console.log(`   ✅ Successfully rolled back: ${migration.name}`);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        result.errors.push(`Failed to rollback ${migration.name}: ${errorMessage}`);
        console.error(`   ❌ Failed to rollback: ${migration.name}`);
        console.error(`   Error: ${errorMessage}`);
        
        // Stop on first failure
        break;
      }
    }

    // Get remaining migrations after rollback
    const executedAfter = await getExecutedMigrations(dataSource);
    result.remaining = executedAfter;

    // Verify schema state
    console.log('\n🔍 Verifying schema state...');
    const verification = await verifySchemaState(dataSource);
    result.schemaVerified = verification.verified;
    
    if (verification.verified) {
      console.log(`✅ ${verification.message}`);
    } else {
      console.error(`❌ ${verification.message}`);
      result.errors.push(verification.message);
    }

    // Determine success
    result.success = result.reverted.length > 0 && result.errors.length === 0 && result.schemaVerified;

    // Output results
    if (result.success) {
      console.log('\n✅ Rollback completed successfully!');
      console.log(`📊 Reverted ${result.reverted.length} migration(s):`);
      result.reverted.forEach((migration) => {
        console.log(`   - ${migration.name} (${migration.timestamp})`);
      });
      
      if (result.remaining.length > 0) {
        console.log(`\n📋 Remaining migrations in database: ${result.remaining.length}`);
      } else {
        console.log('\n📋 No migrations remain - database is at initial state');
      }
    } else if (result.reverted.length > 0 && result.errors.length > 0) {
      console.log('\n⚠️  Rollback partially completed');
      console.log(`📊 Successfully reverted ${result.reverted.length} migration(s)`);
      console.log(`❌ Failed to revert ${migrationsToRollback.length - result.reverted.length} migration(s)`);
    }

  } catch (error) {
    result.success = false;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    result.errors.push(errorMessage);

    console.error('\n❌ Rollback failed!');
    console.error(`Error: ${errorMessage}`);
    
    if (error instanceof Error && error.stack) {
      console.error('\nStack trace:');
      console.error(error.stack);
    }

    // Report current database state
    if (dataSource && dataSource.isInitialized) {
      try {
        const currentMigrations = await getExecutedMigrations(dataSource);
        console.error('\n📊 Current database state:');
        console.error(`   Executed migrations: ${currentMigrations.length}`);
        if (currentMigrations.length > 0) {
          console.error('   Most recent migration:');
          console.error(`      ${currentMigrations[0].name} (${currentMigrations[0].timestamp})`);
        }
      } catch (stateError) {
        console.error('   Unable to determine current database state');
      }
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
 * Parse command line arguments
 */
function parseArguments(): { connectionString: string; steps: number } | null {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    return null;
  }

  const connectionString = args[0];
  let steps = 1;

  // Check for --steps flag
  const stepsIndex = args.indexOf('--steps');
  if (stepsIndex !== -1 && args[stepsIndex + 1]) {
    const parsedSteps = parseInt(args[stepsIndex + 1], 10);
    if (isNaN(parsedSteps) || parsedSteps < 1) {
      console.error('❌ Error: --steps must be a positive integer');
      return null;
    }
    steps = parsedSteps;
  }

  return { connectionString, steps };
}

/**
 * Main execution function
 */
async function main() {
  console.log('🔧 Migration Rollback Tool\n');

  // Parse arguments
  const parsed = parseArguments();
  
  if (!parsed) {
    console.error('❌ Error: Connection string is required');
    console.error('\nUsage:');
    console.error('  ts-node src/scripts/rollback-migration.ts <connection-string> [--steps N]');
    console.error('\nOptions:');
    console.error('  --steps N    Number of migrations to rollback (default: 1)');
    console.error('\nExamples:');
    console.error('  ts-node src/scripts/rollback-migration.ts postgresql://user:pass@host:5432/database');
    console.error('  ts-node src/scripts/rollback-migration.ts postgresql://user:pass@host:5432/database --steps 3');
    process.exit(1);
  }

  const { connectionString, steps } = parsed;

  console.log(`Configuration:`);
  console.log(`   Steps to rollback: ${steps}`);
  console.log('');

  // Run rollback
  const result = await rollbackMigrations(connectionString, steps);

  // Exit with appropriate code
  if (result.success) {
    console.log('\n✨ All done!');
    process.exit(0);
  } else {
    console.error('\n💥 Rollback failed with errors:');
    result.errors.forEach((error, index) => {
      console.error(`  ${index + 1}. ${error}`);
    });
    
    if (result.reverted.length > 0) {
      console.error('\n⚠️  Note: Some migrations were successfully reverted before the failure.');
      console.error('Review the database state and determine if additional action is needed.');
    }
    
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
export { rollbackMigrations, validateConnectionString, createDataSourceConfig, getExecutedMigrations, verifySchemaState };
export type { RollbackResult, Migration };
