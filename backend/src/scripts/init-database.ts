#!/usr/bin/env node

import { DataSource } from 'typeorm';
import * as path from 'path';
import { runMigrations, MigrationResult } from './run-migrations';
import { seedDatabase, SeedResult } from './seed-database';

/**
 * Database Initializer Script
 * 
 * This script orchestrates the complete database setup process:
 * 1. Runs migrations to create schema
 * 2. Seeds initial test data
 * 3. Verifies database state
 * 
 * Usage:
 *   ts-node src/scripts/init-database.ts <connection-string> [options]
 *   
 * Options:
 *   --skip-migrations    Skip the migration step
 *   --skip-seeding       Skip the seeding step
 * 
 * Example:
 *   ts-node src/scripts/init-database.ts postgresql://user:pass@host:5432/database
 *   ts-node src/scripts/init-database.ts postgresql://user:pass@host:5432/database --skip-seeding
 */

interface InitOptions {
  skipMigrations?: boolean;
  skipSeeding?: boolean;
  environment?: string;
}

interface VerificationResult {
  databaseConnected: boolean;
  schemaValid: boolean;
  seedDataPresent: boolean;
  checks: Array<{
    name: string;
    passed: boolean;
    message: string;
  }>;
  success: boolean;
  errors: string[];
}

interface InitResult {
  migrationResult?: MigrationResult;
  seedResult?: SeedResult;
  verificationResult: VerificationResult;
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

  const postgresUrlPattern = /^postgres(ql)?:\/\/.+/i;
  if (!postgresUrlPattern.test(connectionString)) {
    return { 
      valid: false, 
      error: 'Invalid connection string format. Expected: postgresql://user:password@host:port/database' 
    };
  }

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
 * Performs post-initialization verification checks
 */
async function verifyDatabase(connectionString: string): Promise<VerificationResult> {
  const result: VerificationResult = {
    databaseConnected: false,
    schemaValid: false,
    seedDataPresent: false,
    checks: [],
    success: false,
    errors: [],
  };

  let dataSource: DataSource | null = null;

  try {
    console.log('\n🔍 Performing post-initialization verification...');

    // Check 1: Database connectivity
    console.log('   Testing database connectivity...');
    try {
      dataSource = new DataSource({
        type: 'postgres',
        url: connectionString,
        synchronize: false,
        logging: false,
        entities: [path.join(__dirname, '../models/entities/**/*.{ts,js}')],
        ssl: {
          rejectUnauthorized: false,
        },
        extra: {
          connectionTimeoutMillis: 10000,
        },
      });

      await dataSource.initialize();
      result.databaseConnected = true;
      result.checks.push({
        name: 'Database Connectivity',
        passed: true,
        message: 'Successfully connected to database',
      });
      console.log('   ✅ Database connectivity: PASSED');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      result.errors.push(`Database connectivity failed: ${errorMessage}`);
      result.checks.push({
        name: 'Database Connectivity',
        passed: false,
        message: `Failed to connect: ${errorMessage}`,
      });
      console.log('   ❌ Database connectivity: FAILED');
      return result; // Can't continue without connection
    }

    // Check 2: Schema validation - verify required tables exist
    console.log('   Verifying database schema...');
    try {
      const queryRunner = dataSource.createQueryRunner();
      
      const requiredTables = [
        'users',
        'user_preferences',
        'trips',
        'sessions',
        'audit_logs',
        'migrations',
      ];

      const missingTables: string[] = [];
      
      for (const tableName of requiredTables) {
        const tableExists = await queryRunner.hasTable(tableName);
        if (!tableExists) {
          missingTables.push(tableName);
        }
      }

      await queryRunner.release();

      if (missingTables.length === 0) {
        result.schemaValid = true;
        result.checks.push({
          name: 'Schema Validation',
          passed: true,
          message: `All ${requiredTables.length} required tables exist`,
        });
        console.log('   ✅ Schema validation: PASSED');
      } else {
        result.errors.push(`Missing tables: ${missingTables.join(', ')}`);
        result.checks.push({
          name: 'Schema Validation',
          passed: false,
          message: `Missing tables: ${missingTables.join(', ')}`,
        });
        console.log('   ❌ Schema validation: FAILED');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      result.errors.push(`Schema validation failed: ${errorMessage}`);
      result.checks.push({
        name: 'Schema Validation',
        passed: false,
        message: `Validation error: ${errorMessage}`,
      });
      console.log('   ❌ Schema validation: FAILED');
    }

    // Check 3: Seed data validation - verify test users exist
    console.log('   Checking for seed data...');
    try {
      const userCount = await dataSource.query('SELECT COUNT(*) as count FROM users');
      const count = parseInt(userCount[0].count, 10);

      if (count > 0) {
        result.seedDataPresent = true;
        result.checks.push({
          name: 'Seed Data Validation',
          passed: true,
          message: `Found ${count} user(s) in database`,
        });
        console.log('   ✅ Seed data validation: PASSED');
      } else {
        result.checks.push({
          name: 'Seed Data Validation',
          passed: false,
          message: 'No users found in database',
        });
        console.log('   ⚠️  Seed data validation: WARNING (no users found)');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      result.errors.push(`Seed data validation failed: ${errorMessage}`);
      result.checks.push({
        name: 'Seed Data Validation',
        passed: false,
        message: `Validation error: ${errorMessage}`,
      });
      console.log('   ❌ Seed data validation: FAILED');
    }

    // Determine overall success
    result.success = result.databaseConnected && result.schemaValid;

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    result.errors.push(`Verification failed: ${errorMessage}`);
    console.error('   ❌ Verification encountered an error:', errorMessage);
  } finally {
    // Clean up connection
    if (dataSource && dataSource.isInitialized) {
      try {
        await dataSource.destroy();
      } catch (closeError) {
        console.error('Warning: Error closing verification connection:', closeError);
      }
    }
  }

  return result;
}

/**
 * Initializes the database with migrations, seeding, and verification
 */
async function initializeDatabase(
  connectionString: string,
  options: InitOptions = {}
): Promise<InitResult> {
  const result: InitResult = {
    verificationResult: {
      databaseConnected: false,
      schemaValid: false,
      seedDataPresent: false,
      checks: [],
      success: false,
      errors: [],
    },
    success: false,
    errors: [],
  };

  try {
    // Validate connection string
    const validation = validateConnectionString(connectionString);
    if (!validation.valid) {
      result.errors.push(validation.error || 'Invalid connection string');
      return result;
    }

    console.log('🚀 Database Initialization Started\n');
    console.log('Configuration:');
    console.log(`   Skip Migrations: ${options.skipMigrations ? 'Yes' : 'No'}`);
    console.log(`   Skip Seeding: ${options.skipSeeding ? 'Yes' : 'No'}`);
    console.log('');

    // Step 1: Run migrations (unless skipped)
    if (!options.skipMigrations) {
      console.log('📋 Step 1: Running Migrations');
      console.log('─'.repeat(50));
      
      try {
        result.migrationResult = await runMigrations(connectionString);
        
        if (!result.migrationResult.success) {
          result.errors.push('Migration step failed');
          result.errors.push(...result.migrationResult.errors);
          console.error('\n❌ Migration step failed. Stopping initialization.');
          console.error('Remediation: Check the migration errors above and fix any issues.');
          return result;
        }
        
        console.log('✅ Migration step completed successfully\n');
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        result.errors.push(`Migration step failed: ${errorMessage}`);
        console.error('\n❌ Migration step failed with exception:', errorMessage);
        console.error('Remediation: Verify database connectivity and migration files.');
        return result;
      }
    } else {
      console.log('⏭️  Step 1: Skipping Migrations (--skip-migrations flag set)\n');
    }

    // Step 2: Seed data (unless skipped)
    if (!options.skipSeeding) {
      console.log('🌱 Step 2: Seeding Database');
      console.log('─'.repeat(50));
      
      try {
        result.seedResult = await seedDatabase(connectionString, { skipIfExists: true });
        
        if (!result.seedResult.success) {
          result.errors.push('Seeding step failed');
          result.errors.push(...result.seedResult.errors);
          console.error('\n❌ Seeding step failed. Database schema is ready but no test data was added.');
          console.error('Remediation: Check the seeding errors above. You can retry seeding separately.');
          // Don't return here - continue to verification
        } else {
          console.log('✅ Seeding step completed successfully\n');
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        result.errors.push(`Seeding step failed: ${errorMessage}`);
        console.error('\n❌ Seeding step failed with exception:', errorMessage);
        console.error('Remediation: You can retry seeding separately using seed-database.ts');
        // Don't return here - continue to verification
      }
    } else {
      console.log('⏭️  Step 2: Skipping Seeding (--skip-seeding flag set)\n');
    }

    // Step 3: Verify database state
    console.log('🔍 Step 3: Verification');
    console.log('─'.repeat(50));
    
    try {
      result.verificationResult = await verifyDatabase(connectionString);
      
      if (result.verificationResult.success) {
        console.log('✅ Verification step completed successfully\n');
      } else {
        console.error('\n⚠️  Verification step completed with warnings\n');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      result.errors.push(`Verification step failed: ${errorMessage}`);
      console.error('\n❌ Verification step failed:', errorMessage);
    }

    // Determine overall success
    const migrationSuccess = options.skipMigrations || (result.migrationResult?.success ?? false);
    const seedingSuccess = options.skipSeeding || (result.seedResult?.success ?? false);
    const verificationSuccess = result.verificationResult.success;

    result.success = migrationSuccess && verificationSuccess;

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    result.errors.push(`Initialization failed: ${errorMessage}`);
    console.error('\n❌ Initialization failed:', errorMessage);
  }

  return result;
}

/**
 * Prints a comprehensive status report
 */
function printStatusReport(result: InitResult, options: InitOptions) {
  console.log('\n' + '═'.repeat(60));
  console.log('📊 DATABASE INITIALIZATION REPORT');
  console.log('═'.repeat(60));

  // Migration status
  if (!options.skipMigrations && result.migrationResult) {
    console.log('\n📋 Migrations:');
    if (result.migrationResult.success) {
      console.log(`   Status: ✅ SUCCESS`);
      console.log(`   Applied: ${result.migrationResult.applied.length} migration(s)`);
      if (result.migrationResult.applied.length > 0) {
        result.migrationResult.applied.forEach(m => {
          console.log(`      - ${m.name}`);
        });
      }
    } else {
      console.log(`   Status: ❌ FAILED`);
      result.migrationResult.errors.forEach(err => {
        console.log(`      Error: ${err}`);
      });
    }
  }

  // Seeding status
  if (!options.skipSeeding && result.seedResult) {
    console.log('\n🌱 Seeding:');
    if (result.seedResult.success) {
      console.log(`   Status: ✅ SUCCESS`);
      console.log(`   Users created: ${result.seedResult.usersCreated}`);
      console.log(`   Preferences created: ${result.seedResult.preferencesCreated}`);
      console.log(`   Trips created: ${result.seedResult.tripsCreated}`);
    } else {
      console.log(`   Status: ❌ FAILED`);
      result.seedResult.errors.forEach(err => {
        console.log(`      Error: ${err}`);
      });
    }
  }

  // Verification status
  console.log('\n🔍 Verification:');
  result.verificationResult.checks.forEach(check => {
    const icon = check.passed ? '✅' : '❌';
    console.log(`   ${icon} ${check.name}: ${check.message}`);
  });

  // Overall status
  console.log('\n' + '─'.repeat(60));
  if (result.success) {
    console.log('✅ INITIALIZATION SUCCESSFUL');
    console.log('\nDatabase Details:');
    console.log(`   Connection: Verified`);
    console.log(`   Schema: Valid`);
    console.log(`   Status: Ready for use`);
    console.log('\n🎉 Your database is ready!');
  } else {
    console.log('❌ INITIALIZATION FAILED');
    console.log('\nErrors encountered:');
    result.errors.forEach((error, index) => {
      console.log(`   ${index + 1}. ${error}`);
    });
    console.log('\n💡 Remediation Steps:');
    console.log('   1. Review the errors above');
    console.log('   2. Fix any configuration or connectivity issues');
    console.log('   3. Re-run this script');
    console.log('   4. If migrations succeeded but seeding failed, you can run:');
    console.log('      ts-node src/scripts/seed-database.ts <connection-string>');
  }
  console.log('═'.repeat(60) + '\n');
}

/**
 * Parse command line arguments
 */
function parseArguments(): { connectionString: string; options: InitOptions } | null {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    return null;
  }

  const connectionString = args[0];
  const options: InitOptions = {
    skipMigrations: args.includes('--skip-migrations'),
    skipSeeding: args.includes('--skip-seeding'),
  };

  return { connectionString, options };
}

/**
 * Main execution function
 */
async function main() {
  console.log('🔧 Database Initializer\n');

  // Parse arguments
  const parsed = parseArguments();
  
  if (!parsed) {
    console.error('❌ Error: Connection string is required');
    console.error('\nUsage:');
    console.error('  ts-node src/scripts/init-database.ts <connection-string> [options]');
    console.error('\nOptions:');
    console.error('  --skip-migrations    Skip the migration step');
    console.error('  --skip-seeding       Skip the seeding step');
    console.error('\nExample:');
    console.error('  ts-node src/scripts/init-database.ts postgresql://user:pass@host:5432/database');
    console.error('  ts-node src/scripts/init-database.ts postgresql://user:pass@host:5432/database --skip-seeding');
    process.exit(1);
  }

  const { connectionString, options } = parsed;

  // Run initialization
  const result = await initializeDatabase(connectionString, options);

  // Print comprehensive status report
  printStatusReport(result, options);

  // Exit with appropriate code
  process.exit(result.success ? 0 : 1);
}

// Run if executed directly
if (require.main === module) {
  main().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

// Export for testing
export { initializeDatabase, verifyDatabase, validateConnectionString, printStatusReport };
export type { InitOptions, InitResult, VerificationResult };
