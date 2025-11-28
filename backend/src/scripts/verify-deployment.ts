#!/usr/bin/env node

import { DataSource, DataSourceOptions } from 'typeorm';
import * as path from 'path';

/**
 * Deployment Verification Script
 * 
 * This script performs pre/post deployment checks to validate database
 * and environment configuration. It verifies:
 * - Database connectivity
 * - Schema completeness (all required tables exist)
 * - Seed data presence (test users exist)
 * - Environment variable configuration
 * 
 * Usage:
 *   ts-node src/scripts/verify-deployment.ts <connection-string> [options]
 *   
 * Options:
 *   --check-env          Validate environment variables
 *   --pre-deployment     Run pre-deployment checks only
 *   --post-deployment    Run post-deployment checks only
 * 
 * Example:
 *   ts-node src/scripts/verify-deployment.ts postgresql://user:pass@host:5432/database
 *   ts-node src/scripts/verify-deployment.ts postgresql://user:pass@host:5432/database --check-env
 */

interface Check {
  name: string;
  passed: boolean;
  message: string;
  severity: 'error' | 'warning' | 'info';
}

interface VerificationResult {
  checks: Check[];
  allPassed: boolean;
  warnings: string[];
  errors: string[];
  deploymentReady: boolean;
}

interface VerificationOptions {
  checkEnv?: boolean;
  preDeployment?: boolean;
  postDeployment?: boolean;
}

/**
 * Required environment variables for deployment
 */
const REQUIRED_ENV_VARS = [
  'DATABASE_URL',
  'JWT_SECRET',
  'BASE_URL',
];

/**
 * Optional but recommended environment variables
 */
const RECOMMENDED_ENV_VARS = [
  'GEOAPIFY_API_KEY',
  'SMTP_HOST',
  'SMTP_PORT',
  'SMTP_USER',
  'SMTP_PASS',
];

/**
 * Required database tables
 */
const REQUIRED_TABLES = [
  'users',
  'user_preferences',
  'trips',
  'sessions',
  'audit_logs',
  'migrations',
];

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
 * Creates a DataSource configuration from a connection string
 */
function createDataSourceConfig(connectionString: string): DataSourceOptions {
  return {
    type: 'postgres',
    url: connectionString,
    synchronize: false,
    logging: false,
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
 * Test database connectivity
 */
async function checkDatabaseConnectivity(
  connectionString: string
): Promise<{ check: Check; dataSource: DataSource | null }> {
  const check: Check = {
    name: 'Database Connectivity',
    passed: false,
    message: '',
    severity: 'error',
  };

  let dataSource: DataSource | null = null;

  try {
    console.log('   Testing database connectivity...');
    
    const config = createDataSourceConfig(connectionString);
    dataSource = new DataSource(config);
    
    await dataSource.initialize();
    
    // Test a simple query
    await dataSource.query('SELECT 1');
    
    check.passed = true;
    check.message = 'Successfully connected to database';
    console.log('   ✅ Database connectivity: PASSED');
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    check.passed = false;
    check.message = `Failed to connect: ${errorMessage}`;
    console.log('   ❌ Database connectivity: FAILED');
    
    // Clean up if connection partially succeeded
    if (dataSource && dataSource.isInitialized) {
      try {
        await dataSource.destroy();
      } catch (closeError) {
        // Ignore cleanup errors
      }
      dataSource = null;
    }
  }

  return { check, dataSource };
}

/**
 * Verify all required tables exist in the database
 */
async function checkSchemaValidation(dataSource: DataSource): Promise<Check> {
  const check: Check = {
    name: 'Schema Validation',
    passed: false,
    message: '',
    severity: 'error',
  };

  try {
    console.log('   Verifying database schema...');
    
    const queryRunner = dataSource.createQueryRunner();
    const missingTables: string[] = [];
    
    for (const tableName of REQUIRED_TABLES) {
      const tableExists = await queryRunner.hasTable(tableName);
      if (!tableExists) {
        missingTables.push(tableName);
      }
    }
    
    await queryRunner.release();
    
    if (missingTables.length === 0) {
      check.passed = true;
      check.message = `All ${REQUIRED_TABLES.length} required tables exist`;
      console.log('   ✅ Schema validation: PASSED');
    } else {
      check.passed = false;
      check.message = `Missing tables: ${missingTables.join(', ')}`;
      console.log('   ❌ Schema validation: FAILED');
      console.log(`      Missing: ${missingTables.join(', ')}`);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    check.passed = false;
    check.message = `Schema validation error: ${errorMessage}`;
    console.log('   ❌ Schema validation: FAILED');
  }

  return check;
}

/**
 * Verify seed data is present (test users exist)
 */
async function checkSeedDataValidation(dataSource: DataSource): Promise<Check> {
  const check: Check = {
    name: 'Seed Data Validation',
    passed: false,
    message: '',
    severity: 'warning',
  };

  try {
    console.log('   Checking for seed data...');
    
    // Check if users table has any records
    const userCount = await dataSource.query('SELECT COUNT(*) as count FROM users');
    const count = parseInt(userCount[0].count, 10);
    
    if (count > 0) {
      // Check for specific test users
      const testUsers = await dataSource.query(
        `SELECT email FROM users WHERE email IN ('test@example.com', 'admin@example.com', 'user@example.com')`
      );
      
      if (testUsers.length > 0) {
        check.passed = true;
        check.message = `Found ${count} user(s) including ${testUsers.length} test user(s)`;
        console.log('   ✅ Seed data validation: PASSED');
      } else {
        check.passed = true;
        check.severity = 'warning';
        check.message = `Found ${count} user(s) but no standard test users`;
        console.log('   ⚠️  Seed data validation: WARNING (no test users found)');
      }
    } else {
      check.passed = false;
      check.message = 'No users found in database';
      console.log('   ❌ Seed data validation: FAILED (no users)');
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    check.passed = false;
    check.message = `Seed data validation error: ${errorMessage}`;
    console.log('   ❌ Seed data validation: FAILED');
  }

  return check;
}

/**
 * Validate environment variables are set
 */
function checkEnvironmentVariables(): Check[] {
  const checks: Check[] = [];
  
  console.log('   Validating environment variables...');
  
  // Check required variables
  const missingRequired: string[] = [];
  for (const varName of REQUIRED_ENV_VARS) {
    if (!process.env[varName]) {
      missingRequired.push(varName);
    }
  }
  
  if (missingRequired.length === 0) {
    checks.push({
      name: 'Required Environment Variables',
      passed: true,
      message: `All ${REQUIRED_ENV_VARS.length} required variables are set`,
      severity: 'info',
    });
    console.log('   ✅ Required environment variables: PASSED');
  } else {
    checks.push({
      name: 'Required Environment Variables',
      passed: false,
      message: `Missing required variables: ${missingRequired.join(', ')}`,
      severity: 'error',
    });
    console.log('   ❌ Required environment variables: FAILED');
    console.log(`      Missing: ${missingRequired.join(', ')}`);
  }
  
  // Check recommended variables
  const missingRecommended: string[] = [];
  for (const varName of RECOMMENDED_ENV_VARS) {
    if (!process.env[varName]) {
      missingRecommended.push(varName);
    }
  }
  
  if (missingRecommended.length === 0) {
    checks.push({
      name: 'Recommended Environment Variables',
      passed: true,
      message: `All ${RECOMMENDED_ENV_VARS.length} recommended variables are set`,
      severity: 'info',
    });
    console.log('   ✅ Recommended environment variables: PASSED');
  } else {
    checks.push({
      name: 'Recommended Environment Variables',
      passed: true,
      message: `Missing recommended variables: ${missingRecommended.join(', ')}`,
      severity: 'warning',
    });
    console.log('   ⚠️  Recommended environment variables: WARNING');
    console.log(`      Missing: ${missingRecommended.join(', ')}`);
  }
  
  return checks;
}

/**
 * Performs comprehensive deployment verification
 */
async function verifyDeployment(
  connectionString: string,
  options: VerificationOptions = {}
): Promise<VerificationResult> {
  const result: VerificationResult = {
    checks: [],
    allPassed: false,
    warnings: [],
    errors: [],
    deploymentReady: false,
  };

  let dataSource: DataSource | null = null;

  try {
    console.log('🔍 Deployment Verification Started\n');
    
    // Validate connection string format
    const validation = validateConnectionString(connectionString);
    if (!validation.valid) {
      result.errors.push(validation.error || 'Invalid connection string');
      result.checks.push({
        name: 'Connection String Validation',
        passed: false,
        message: validation.error || 'Invalid connection string',
        severity: 'error',
      });
      return result;
    }

    // Check 1: Database connectivity
    console.log('📋 Check 1: Database Connectivity');
    console.log('─'.repeat(50));
    const connectivityResult = await checkDatabaseConnectivity(connectionString);
    result.checks.push(connectivityResult.check);
    dataSource = connectivityResult.dataSource;
    
    if (!connectivityResult.check.passed) {
      result.errors.push(connectivityResult.check.message);
      return result; // Can't continue without connection
    }
    console.log('');

    // Check 2: Schema validation
    console.log('📋 Check 2: Schema Validation');
    console.log('─'.repeat(50));
    const schemaCheck = await checkSchemaValidation(dataSource!);
    result.checks.push(schemaCheck);
    
    if (!schemaCheck.passed) {
      result.errors.push(schemaCheck.message);
    }
    console.log('');

    // Check 3: Seed data validation
    console.log('📋 Check 3: Seed Data Validation');
    console.log('─'.repeat(50));
    const seedCheck = await checkSeedDataValidation(dataSource!);
    result.checks.push(seedCheck);
    
    if (!seedCheck.passed) {
      if (seedCheck.severity === 'warning') {
        result.warnings.push(seedCheck.message);
      } else {
        result.errors.push(seedCheck.message);
      }
    } else if (seedCheck.severity === 'warning') {
      result.warnings.push(seedCheck.message);
    }
    console.log('');

    // Check 4: Environment variables (if requested)
    if (options.checkEnv) {
      console.log('📋 Check 4: Environment Variables');
      console.log('─'.repeat(50));
      const envChecks = checkEnvironmentVariables();
      result.checks.push(...envChecks);
      
      for (const check of envChecks) {
        if (!check.passed) {
          result.errors.push(check.message);
        } else if (check.severity === 'warning') {
          result.warnings.push(check.message);
        }
      }
      console.log('');
    }

    // Determine overall status
    const criticalChecks = result.checks.filter(c => c.severity === 'error');
    const failedCriticalChecks = criticalChecks.filter(c => !c.passed);
    
    result.allPassed = failedCriticalChecks.length === 0;
    result.deploymentReady = result.allPassed;

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
 * Prints verification results with pass/fail status
 */
function printVerificationReport(result: VerificationResult) {
  console.log('\n' + '═'.repeat(60));
  console.log('📊 DEPLOYMENT VERIFICATION REPORT');
  console.log('═'.repeat(60));

  // Print all checks
  console.log('\n🔍 Verification Checks:');
  for (const check of result.checks) {
    const icon = check.passed ? '✅' : (check.severity === 'warning' ? '⚠️' : '❌');
    console.log(`   ${icon} ${check.name}`);
    console.log(`      ${check.message}`);
  }

  // Print warnings
  if (result.warnings.length > 0) {
    console.log('\n⚠️  Warnings:');
    result.warnings.forEach((warning, index) => {
      console.log(`   ${index + 1}. ${warning}`);
    });
  }

  // Print errors
  if (result.errors.length > 0) {
    console.log('\n❌ Errors:');
    result.errors.forEach((error, index) => {
      console.log(`   ${index + 1}. ${error}`);
    });
  }

  // Overall status
  console.log('\n' + '─'.repeat(60));
  if (result.deploymentReady) {
    console.log('✅ DEPLOYMENT READY');
    console.log('\n🎉 All critical checks passed!');
    console.log('   Your database is properly configured and ready for deployment.');
    
    if (result.warnings.length > 0) {
      console.log('\n💡 Note: There are some warnings above that you may want to address.');
    }
  } else {
    console.log('❌ NOT READY FOR DEPLOYMENT');
    console.log('\n💥 Critical checks failed!');
    console.log('   Please address the errors above before deploying.');
    console.log('\n💡 Remediation Steps:');
    
    const hasConnectivityIssue = result.checks.some(
      c => c.name === 'Database Connectivity' && !c.passed
    );
    const hasSchemaIssue = result.checks.some(
      c => c.name === 'Schema Validation' && !c.passed
    );
    const hasSeedIssue = result.checks.some(
      c => c.name === 'Seed Data Validation' && !c.passed && c.severity === 'error'
    );
    const hasEnvIssue = result.checks.some(
      c => c.name === 'Required Environment Variables' && !c.passed
    );
    
    if (hasConnectivityIssue) {
      console.log('   1. Verify your database connection string is correct');
      console.log('   2. Ensure the database server is running and accessible');
      console.log('   3. Check firewall rules and network connectivity');
    }
    
    if (hasSchemaIssue) {
      console.log('   1. Run migrations to create the database schema:');
      console.log('      ts-node src/scripts/run-migrations.ts <connection-string>');
    }
    
    if (hasSeedIssue) {
      console.log('   1. Run the seed script to populate initial data:');
      console.log('      ts-node src/scripts/seed-database.ts <connection-string>');
    }
    
    if (hasEnvIssue) {
      console.log('   1. Set all required environment variables');
      console.log('   2. Verify environment configuration in your deployment platform');
    }
  }
  
  console.log('═'.repeat(60) + '\n');
}

/**
 * Parse command line arguments
 */
function parseArguments(): { 
  connectionString: string; 
  options: VerificationOptions;
} | null {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    return null;
  }

  const connectionString = args[0];
  const options: VerificationOptions = {
    checkEnv: args.includes('--check-env'),
    preDeployment: args.includes('--pre-deployment'),
    postDeployment: args.includes('--post-deployment'),
  };

  return { connectionString, options };
}

/**
 * Main execution function
 */
async function main() {
  console.log('🔧 Deployment Verification Tool\n');

  // Parse arguments
  const parsed = parseArguments();
  
  if (!parsed) {
    console.error('❌ Error: Connection string is required');
    console.error('\nUsage:');
    console.error('  ts-node src/scripts/verify-deployment.ts <connection-string> [options]');
    console.error('\nOptions:');
    console.error('  --check-env          Validate environment variables');
    console.error('  --pre-deployment     Run pre-deployment checks only');
    console.error('  --post-deployment    Run post-deployment checks only');
    console.error('\nExample:');
    console.error('  ts-node src/scripts/verify-deployment.ts postgresql://user:pass@host:5432/database');
    console.error('  ts-node src/scripts/verify-deployment.ts postgresql://user:pass@host:5432/database --check-env');
    process.exit(1);
  }

  const { connectionString, options } = parsed;

  // Run verification
  const result = await verifyDeployment(connectionString, options);

  // Print comprehensive report
  printVerificationReport(result);

  // Exit with appropriate code
  process.exit(result.deploymentReady ? 0 : 1);
}

// Run if executed directly
if (require.main === module) {
  main().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

// Export for testing
export { verifyDeployment, validateConnectionString, printVerificationReport };
export type { VerificationResult, VerificationOptions, Check };
