#!/usr/bin/env node

import { DataSource } from 'typeorm';
import * as path from 'path';
import * as fs from 'fs';

/**
 * Deployment Checklist Script
 * 
 * This script performs comprehensive pre-deployment validation to ensure
 * all prerequisites are met before deploying the application. It checks:
 * - Required environment variables are set
 * - Database migrations are applied
 * - Seed data exists
 * - API keys and URLs are valid
 * 
 * Usage:
 *   ts-node src/scripts/deployment-checklist.ts [options]
 *   
 * Options:
 *   --connection-string <url>    Database connection string (or use DATABASE_URL env var)
 *   --environment <env>          Environment to check (production, staging, development)
 *   --config <path>              Path to deployment config file (default: deployment-config.json)
 * 
 * Example:
 *   ts-node src/scripts/deployment-checklist.ts
 *   ts-node src/scripts/deployment-checklist.ts --environment production
 *   ts-node src/scripts/deployment-checklist.ts --connection-string postgresql://...
 */

interface ChecklistItem {
  category: string;
  name: string;
  passed: boolean;
  message: string;
  severity: 'critical' | 'warning' | 'info';
  details?: string;
}

interface ChecklistResult {
  items: ChecklistItem[];
  readyToDeploy: boolean;
  criticalFailures: number;
  warnings: number;
  passed: number;
  total: number;
}

interface ChecklistOptions {
  connectionString?: string;
  environment?: string;
  configPath?: string;
}

/**
 * Required environment variables for deployment
 */
const REQUIRED_ENV_VARS = [
  { name: 'DATABASE_URL', description: 'PostgreSQL database connection string' },
  { name: 'JWT_SECRET', description: 'Secret key for JWT token signing' },
  { name: 'BASE_URL', description: 'Base URL for the API' },
];

/**
 * Recommended environment variables
 */
const RECOMMENDED_ENV_VARS = [
  { name: 'GEOAPIFY_API_KEY', description: 'API key for Geoapify geocoding service' },
  { name: 'SMTP_HOST', description: 'SMTP server hostname for email' },
  { name: 'SMTP_PORT', description: 'SMTP server port' },
  { name: 'SMTP_USER', description: 'SMTP authentication username' },
  { name: 'SMTP_PASS', description: 'SMTP authentication password' },
  { name: 'NODE_ENV', description: 'Node environment (production, staging, development)' },
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
 * Check if all required environment variables are set
 */
function checkEnvironmentVariables(): ChecklistItem[] {
  const items: ChecklistItem[] = [];

  console.log('📋 Checking Environment Variables...');

  // Check required variables
  const missingRequired: string[] = [];
  const presentRequired: string[] = [];

  for (const envVar of REQUIRED_ENV_VARS) {
    if (!process.env[envVar.name]) {
      missingRequired.push(envVar.name);
    } else {
      presentRequired.push(envVar.name);
    }
  }

  if (missingRequired.length === 0) {
    items.push({
      category: 'Environment',
      name: 'Required Environment Variables',
      passed: true,
      message: `All ${REQUIRED_ENV_VARS.length} required variables are set`,
      severity: 'info',
      details: presentRequired.join(', '),
    });
    console.log(`   ✅ Required variables: All ${REQUIRED_ENV_VARS.length} present`);
  } else {
    items.push({
      category: 'Environment',
      name: 'Required Environment Variables',
      passed: false,
      message: `Missing ${missingRequired.length} required variable(s)`,
      severity: 'critical',
      details: `Missing: ${missingRequired.join(', ')}`,
    });
    console.log(`   ❌ Required variables: Missing ${missingRequired.length}`);
    missingRequired.forEach(v => console.log(`      - ${v}`));
  }

  // Check recommended variables
  const missingRecommended: string[] = [];
  const presentRecommended: string[] = [];

  for (const envVar of RECOMMENDED_ENV_VARS) {
    if (!process.env[envVar.name]) {
      missingRecommended.push(envVar.name);
    } else {
      presentRecommended.push(envVar.name);
    }
  }

  if (missingRecommended.length === 0) {
    items.push({
      category: 'Environment',
      name: 'Recommended Environment Variables',
      passed: true,
      message: `All ${RECOMMENDED_ENV_VARS.length} recommended variables are set`,
      severity: 'info',
    });
    console.log(`   ✅ Recommended variables: All ${RECOMMENDED_ENV_VARS.length} present`);
  } else {
    items.push({
      category: 'Environment',
      name: 'Recommended Environment Variables',
      passed: true,
      message: `${missingRecommended.length} recommended variable(s) not set`,
      severity: 'warning',
      details: `Missing: ${missingRecommended.join(', ')}`,
    });
    console.log(`   ⚠️  Recommended variables: ${missingRecommended.length} missing`);
  }

  return items;
}

/**
 * Validate API keys and URLs format
 */
function checkAPIKeysAndURLs(): ChecklistItem[] {
  const items: ChecklistItem[] = [];

  console.log('\n🔑 Checking API Keys and URLs...');

  // Check DATABASE_URL format
  const databaseUrl = process.env.DATABASE_URL;
  if (databaseUrl) {
    try {
      const url = new URL(databaseUrl);
      if (url.protocol === 'postgresql:' || url.protocol === 'postgres:') {
        items.push({
          category: 'APIs',
          name: 'DATABASE_URL Format',
          passed: true,
          message: 'Valid PostgreSQL connection string',
          severity: 'info',
        });
        console.log('   ✅ DATABASE_URL: Valid format');
      } else {
        items.push({
          category: 'APIs',
          name: 'DATABASE_URL Format',
          passed: false,
          message: 'Invalid protocol (expected postgresql://)',
          severity: 'critical',
        });
        console.log('   ❌ DATABASE_URL: Invalid protocol');
      }
    } catch (error) {
      items.push({
        category: 'APIs',
        name: 'DATABASE_URL Format',
        passed: false,
        message: 'Invalid URL format',
        severity: 'critical',
      });
      console.log('   ❌ DATABASE_URL: Invalid format');
    }
  } else {
    items.push({
      category: 'APIs',
      name: 'DATABASE_URL Format',
      passed: false,
      message: 'DATABASE_URL not set',
      severity: 'critical',
    });
    console.log('   ❌ DATABASE_URL: Not set');
  }

  // Check BASE_URL format
  const baseUrl = process.env.BASE_URL;
  if (baseUrl) {
    try {
      const url = new URL(baseUrl);
      if (url.protocol === 'http:' || url.protocol === 'https:') {
        items.push({
          category: 'APIs',
          name: 'BASE_URL Format',
          passed: true,
          message: 'Valid HTTP(S) URL',
          severity: 'info',
        });
        console.log('   ✅ BASE_URL: Valid format');
      } else {
        items.push({
          category: 'APIs',
          name: 'BASE_URL Format',
          passed: false,
          message: 'Invalid protocol (expected http:// or https://)',
          severity: 'critical',
        });
        console.log('   ❌ BASE_URL: Invalid protocol');
      }
    } catch (error) {
      items.push({
        category: 'APIs',
        name: 'BASE_URL Format',
        passed: false,
        message: 'Invalid URL format',
        severity: 'critical',
      });
      console.log('   ❌ BASE_URL: Invalid format');
    }
  } else {
    items.push({
      category: 'APIs',
      name: 'BASE_URL Format',
      passed: false,
      message: 'BASE_URL not set',
      severity: 'critical',
    });
    console.log('   ❌ BASE_URL: Not set');
  }

  // Check JWT_SECRET strength
  const jwtSecret = process.env.JWT_SECRET;
  if (jwtSecret) {
    if (jwtSecret.length >= 32) {
      items.push({
        category: 'Security',
        name: 'JWT_SECRET Strength',
        passed: true,
        message: 'JWT secret has adequate length',
        severity: 'info',
      });
      console.log('   ✅ JWT_SECRET: Adequate strength');
    } else {
      items.push({
        category: 'Security',
        name: 'JWT_SECRET Strength',
        passed: true,
        message: 'JWT secret is short (recommend 32+ characters)',
        severity: 'warning',
        details: `Current length: ${jwtSecret.length} characters`,
      });
      console.log('   ⚠️  JWT_SECRET: Short (recommend 32+ chars)');
    }
  }

  // Check GEOAPIFY_API_KEY if present
  const geoapifyKey = process.env.GEOAPIFY_API_KEY;
  if (geoapifyKey) {
    if (geoapifyKey.length > 10) {
      items.push({
        category: 'APIs',
        name: 'GEOAPIFY_API_KEY',
        passed: true,
        message: 'Geoapify API key is set',
        severity: 'info',
      });
      console.log('   ✅ GEOAPIFY_API_KEY: Present');
    } else {
      items.push({
        category: 'APIs',
        name: 'GEOAPIFY_API_KEY',
        passed: true,
        message: 'Geoapify API key seems invalid',
        severity: 'warning',
      });
      console.log('   ⚠️  GEOAPIFY_API_KEY: Possibly invalid');
    }
  }

  return items;
}

/**
 * Check database connectivity and migrations
 */
async function checkDatabase(connectionString: string): Promise<ChecklistItem[]> {
  const items: ChecklistItem[] = [];
  let dataSource: DataSource | null = null;

  console.log('\n🗄️  Checking Database...');

  try {
    // Test connectivity
    console.log('   Testing database connectivity...');
    dataSource = new DataSource({
      type: 'postgres',
      url: connectionString,
      synchronize: false,
      logging: false,
      entities: [path.join(__dirname, '../models/entities/**/*.{ts,js}')],
      migrations: [path.join(__dirname, '../database/migrations/[0-9]*-*.{ts,js}')],
      ssl: {
        rejectUnauthorized: false,
      },
      extra: {
        connectionTimeoutMillis: 10000,
      },
    });

    await dataSource.initialize();

    items.push({
      category: 'Database',
      name: 'Database Connectivity',
      passed: true,
      message: 'Successfully connected to database',
      severity: 'info',
    });
    console.log('   ✅ Connectivity: Connected');

    // Check migrations are applied
    console.log('   Checking migrations...');
    const migrations = await dataSource.showMigrations();
    
    if (!migrations) {
      items.push({
        category: 'Database',
        name: 'Migrations Applied',
        passed: true,
        message: 'All migrations are applied',
        severity: 'info',
      });
      console.log('   ✅ Migrations: All applied');
    } else {
      items.push({
        category: 'Database',
        name: 'Migrations Applied',
        passed: false,
        message: 'Pending migrations detected',
        severity: 'critical',
        details: 'Run migrations before deploying',
      });
      console.log('   ❌ Migrations: Pending migrations found');
    }

    // Check required tables exist
    console.log('   Verifying schema...');
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
      items.push({
        category: 'Database',
        name: 'Schema Validation',
        passed: true,
        message: `All ${REQUIRED_TABLES.length} required tables exist`,
        severity: 'info',
      });
      console.log('   ✅ Schema: All tables present');
    } else {
      items.push({
        category: 'Database',
        name: 'Schema Validation',
        passed: false,
        message: `Missing ${missingTables.length} table(s)`,
        severity: 'critical',
        details: `Missing: ${missingTables.join(', ')}`,
      });
      console.log('   ❌ Schema: Missing tables');
    }

    // Check seed data exists
    console.log('   Checking seed data...');
    const userCount = await dataSource.query('SELECT COUNT(*) as count FROM users');
    const count = parseInt(userCount[0].count, 10);

    if (count > 0) {
      items.push({
        category: 'Database',
        name: 'Seed Data Present',
        passed: true,
        message: `Found ${count} user(s) in database`,
        severity: 'info',
      });
      console.log(`   ✅ Seed data: ${count} user(s) found`);
    } else {
      items.push({
        category: 'Database',
        name: 'Seed Data Present',
        passed: true,
        message: 'No users found (may be intentional)',
        severity: 'warning',
        details: 'Consider seeding test data for development/staging',
      });
      console.log('   ⚠️  Seed data: No users found');
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    items.push({
      category: 'Database',
      name: 'Database Connectivity',
      passed: false,
      message: 'Failed to connect to database',
      severity: 'critical',
      details: errorMessage,
    });
    console.log('   ❌ Connectivity: Failed');
    console.log(`      Error: ${errorMessage}`);
  } finally {
    if (dataSource && dataSource.isInitialized) {
      try {
        await dataSource.destroy();
      } catch (closeError) {
        // Ignore cleanup errors
      }
    }
  }

  return items;
}

/**
 * Run the complete deployment checklist
 */
async function runDeploymentChecklist(options: ChecklistOptions = {}): Promise<ChecklistResult> {
  const result: ChecklistResult = {
    items: [],
    readyToDeploy: false,
    criticalFailures: 0,
    warnings: 0,
    passed: 0,
    total: 0,
  };

  console.log('🚀 Deployment Checklist\n');
  console.log('═'.repeat(60));

  // Get connection string
  const connectionString = options.connectionString || process.env.DATABASE_URL;

  // Check 1: Environment Variables
  const envItems = checkEnvironmentVariables();
  result.items.push(...envItems);

  // Check 2: API Keys and URLs
  const apiItems = checkAPIKeysAndURLs();
  result.items.push(...apiItems);

  // Check 3: Database (if connection string available)
  if (connectionString) {
    const dbItems = await checkDatabase(connectionString);
    result.items.push(...dbItems);
  } else {
    result.items.push({
      category: 'Database',
      name: 'Database Checks',
      passed: false,
      message: 'Cannot check database (no connection string)',
      severity: 'critical',
      details: 'Set DATABASE_URL or provide --connection-string',
    });
    console.log('\n🗄️  Checking Database...');
    console.log('   ❌ No connection string available');
  }

  // Calculate statistics
  result.total = result.items.length;
  result.criticalFailures = result.items.filter(
    item => !item.passed && item.severity === 'critical'
  ).length;
  result.warnings = result.items.filter(
    item => item.severity === 'warning'
  ).length;
  result.passed = result.items.filter(item => item.passed).length;

  // Determine deployment readiness
  result.readyToDeploy = result.criticalFailures === 0;

  return result;
}

/**
 * Print the deployment checklist report
 */
function printChecklistReport(result: ChecklistResult) {
  console.log('\n' + '═'.repeat(60));
  console.log('📊 DEPLOYMENT CHECKLIST REPORT');
  console.log('═'.repeat(60));

  // Group items by category
  const categories = new Map<string, ChecklistItem[]>();
  for (const item of result.items) {
    if (!categories.has(item.category)) {
      categories.set(item.category, []);
    }
    categories.get(item.category)!.push(item);
  }

  // Print items by category
  for (const [category, items] of categories) {
    console.log(`\n${category}:`);
    for (const item of items) {
      const icon = item.passed
        ? item.severity === 'warning'
          ? '⚠️ '
          : '✅'
        : '❌';
      console.log(`   ${icon} ${item.name}`);
      console.log(`      ${item.message}`);
      if (item.details) {
        console.log(`      ${item.details}`);
      }
    }
  }

  // Print summary
  console.log('\n' + '─'.repeat(60));
  console.log('📈 Summary:');
  console.log(`   Total Checks: ${result.total}`);
  console.log(`   Passed: ${result.passed}`);
  console.log(`   Critical Failures: ${result.criticalFailures}`);
  console.log(`   Warnings: ${result.warnings}`);

  // Print deployment readiness
  console.log('\n' + '─'.repeat(60));
  if (result.readyToDeploy) {
    console.log('✅ READY TO DEPLOY');
    console.log('\n🎉 All critical checks passed!');
    console.log('   Your application is ready for deployment.');

    if (result.warnings > 0) {
      console.log(`\n💡 Note: There are ${result.warnings} warning(s) that you may want to address.`);
    }
  } else {
    console.log('❌ NOT READY TO DEPLOY');
    console.log(`\n💥 ${result.criticalFailures} critical check(s) failed!`);
    console.log('   Please address the failures above before deploying.');

    console.log('\n💡 Remediation Steps:');

    const hasEnvFailure = result.items.some(
      item => item.category === 'Environment' && !item.passed && item.severity === 'critical'
    );
    const hasAPIFailure = result.items.some(
      item => item.category === 'APIs' && !item.passed && item.severity === 'critical'
    );
    const hasDBFailure = result.items.some(
      item => item.category === 'Database' && !item.passed && item.severity === 'critical'
    );

    if (hasEnvFailure) {
      console.log('   1. Set all required environment variables');
      console.log('      - Check deployment-config.json for required values');
      console.log('      - Use setup-vercel-env.ts to configure Vercel');
    }

    if (hasAPIFailure) {
      console.log('   2. Validate API keys and URLs');
      console.log('      - Ensure DATABASE_URL is a valid PostgreSQL connection string');
      console.log('      - Ensure BASE_URL is a valid HTTP(S) URL');
      console.log('      - Verify JWT_SECRET is set and secure');
    }

    if (hasDBFailure) {
      console.log('   3. Initialize and verify database');
      console.log('      - Run: ts-node src/scripts/init-database.ts <connection-string>');
      console.log('      - Or run migrations: ts-node src/scripts/run-migrations.ts <connection-string>');
      console.log('      - Then seed: ts-node src/scripts/seed-database.ts <connection-string>');
    }
  }

  console.log('═'.repeat(60) + '\n');
}

/**
 * Parse command line arguments
 */
function parseArguments(): ChecklistOptions {
  const args = process.argv.slice(2);
  const options: ChecklistOptions = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--connection-string' && i + 1 < args.length) {
      options.connectionString = args[i + 1];
      i++;
    } else if (arg === '--environment' && i + 1 < args.length) {
      options.environment = args[i + 1];
      i++;
    } else if (arg === '--config' && i + 1 < args.length) {
      options.configPath = args[i + 1];
      i++;
    }
  }

  return options;
}

/**
 * Main execution function
 */
async function main() {
  console.log('🔧 Deployment Checklist Tool\n');

  // Parse arguments
  const options = parseArguments();

  // Run checklist
  const result = await runDeploymentChecklist(options);

  // Print report
  printChecklistReport(result);

  // Exit with appropriate code
  process.exit(result.readyToDeploy ? 0 : 1);
}

// Run if executed directly
if (require.main === module) {
  main().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

// Export for testing
export { runDeploymentChecklist, checkEnvironmentVariables, checkAPIKeysAndURLs, checkDatabase };
export type { ChecklistResult, ChecklistItem, ChecklistOptions };
