# Deployment Verification Script

## Overview

The `verify-deployment.ts` script performs comprehensive pre/post deployment checks to validate that your database and environment are properly configured and ready for deployment.

## Features

- **Database Connectivity Testing**: Verifies connection to the database
- **Schema Validation**: Checks that all required tables exist
- **Seed Data Validation**: Confirms test users and initial data are present
- **Environment Variable Validation**: Ensures all required configuration is set
- **Detailed Reporting**: Provides clear pass/fail status with remediation guidance

## Usage

### Basic Usage

```bash
ts-node src/scripts/verify-deployment.ts <connection-string>
```

### With Environment Variable Checks

```bash
ts-node src/scripts/verify-deployment.ts <connection-string> --check-env
```

### Pre-Deployment Checks

```bash
ts-node src/scripts/verify-deployment.ts <connection-string> --pre-deployment
```

### Post-Deployment Checks

```bash
ts-node src/scripts/verify-deployment.ts <connection-string> --post-deployment
```

## Examples

### Verify Local Database

```bash
ts-node src/scripts/verify-deployment.ts postgresql://postgres:postgres@localhost:5432/rutty_dev
```

### Verify Neon Production Database

```bash
ts-node src/scripts/verify-deployment.ts postgresql://user:pass@ep-xxx.region.aws.neon.tech/database?sslmode=require --check-env
```

### Complete Pre-Deployment Check

```bash
ts-node src/scripts/verify-deployment.ts $DATABASE_URL --check-env --pre-deployment
```

## Verification Checks

### 1. Database Connectivity
- Tests connection to the database
- Executes a simple query to verify functionality
- **Severity**: Error (deployment cannot proceed if this fails)

### 2. Schema Validation
- Verifies all required tables exist:
  - `users`
  - `user_preferences`
  - `trips`
  - `sessions`
  - `audit_logs`
  - `migrations`
- **Severity**: Error (deployment cannot proceed if tables are missing)

### 3. Seed Data Validation
- Checks if users exist in the database
- Looks for standard test users (test@example.com, admin@example.com, user@example.com)
- **Severity**: Warning (deployment can proceed but may lack test data)

### 4. Environment Variables (when --check-env is used)
- **Required Variables**:
  - `DATABASE_URL`
  - `JWT_SECRET`
  - `BASE_URL`
- **Recommended Variables**:
  - `GEOAPIFY_API_KEY`
  - `SMTP_HOST`
  - `SMTP_PORT`
  - `SMTP_USER`
  - `SMTP_PASS`
- **Severity**: Error for required, Warning for recommended

## Output

### Success Example

```
🔍 Deployment Verification Started

📋 Check 1: Database Connectivity
──────────────────────────────────────────────────
   Testing database connectivity...
   ✅ Database connectivity: PASSED

📋 Check 2: Schema Validation
──────────────────────────────────────────────────
   Verifying database schema...
   ✅ Schema validation: PASSED

📋 Check 3: Seed Data Validation
──────────────────────────────────────────────────
   Checking for seed data...
   ✅ Seed data validation: PASSED

════════════════════════════════════════════════════════════
📊 DEPLOYMENT VERIFICATION REPORT
════════════════════════════════════════════════════════════

🔍 Verification Checks:
   ✅ Database Connectivity
      Successfully connected to database
   ✅ Schema Validation
      All 6 required tables exist
   ✅ Seed Data Validation
      Found 3 user(s) including 3 test user(s)

────────────────────────────────────────────────────────────
✅ DEPLOYMENT READY

🎉 All critical checks passed!
   Your database is properly configured and ready for deployment.
════════════════════════════════════════════════════════════
```

### Failure Example

```
🔍 Deployment Verification Started

📋 Check 1: Database Connectivity
──────────────────────────────────────────────────
   Testing database connectivity...
   ✅ Database connectivity: PASSED

📋 Check 2: Schema Validation
──────────────────────────────────────────────────
   Verifying database schema...
   ❌ Schema validation: FAILED
      Missing: users, trips

════════════════════════════════════════════════════════════
📊 DEPLOYMENT VERIFICATION REPORT
════════════════════════════════════════════════════════════

🔍 Verification Checks:
   ✅ Database Connectivity
      Successfully connected to database
   ❌ Schema Validation
      Missing tables: users, trips

❌ Errors:
   1. Missing tables: users, trips

────────────────────────────────────────────────────────────
❌ NOT READY FOR DEPLOYMENT

💥 Critical checks failed!
   Please address the errors above before deploying.

💡 Remediation Steps:
   1. Run migrations to create the database schema:
      ts-node src/scripts/run-migrations.ts <connection-string>
════════════════════════════════════════════════════════════
```

## Exit Codes

- **0**: All checks passed, deployment ready
- **1**: One or more checks failed, deployment not ready

## Integration with CI/CD

You can use this script in your CI/CD pipeline to ensure deployments only proceed when the database is properly configured:

```yaml
# Example GitHub Actions workflow
- name: Verify Database
  run: |
    ts-node src/scripts/verify-deployment.ts $DATABASE_URL --check-env
  env:
    DATABASE_URL: ${{ secrets.DATABASE_URL }}
    JWT_SECRET: ${{ secrets.JWT_SECRET }}
    BASE_URL: ${{ secrets.BASE_URL }}
```

## Troubleshooting

### Connection Timeout

If you see connection timeout errors:
1. Verify the database server is running
2. Check firewall rules allow connections
3. Ensure the connection string is correct
4. For Neon databases, verify the endpoint is active

### Missing Tables

If schema validation fails:
1. Run the migration script: `ts-node src/scripts/run-migrations.ts <connection-string>`
2. Verify migrations completed successfully
3. Check that all migration files are present in `src/database/migrations/`

### No Seed Data

If seed data validation fails:
1. Run the seed script: `ts-node src/scripts/seed-database.ts <connection-string>`
2. Verify seeding completed successfully
3. Check that seed data was not accidentally deleted

### Environment Variables Not Set

If environment variable checks fail:
1. Verify all required variables are set in your environment
2. For Vercel deployments, check the Vercel dashboard
3. For local development, ensure your `.env` file is properly configured

## Related Scripts

- **run-migrations.ts**: Runs database migrations
- **seed-database.ts**: Populates database with test data
- **init-database.ts**: Complete database initialization (migrations + seeding)

## Best Practices

1. **Always run verification before deployment** to catch configuration issues early
2. **Use --check-env flag** in production environments to validate all configuration
3. **Include in CI/CD pipelines** to prevent deploying with misconfigured databases
4. **Run after database changes** to ensure schema is correct
5. **Document any warnings** that appear and address them when possible

## API Reference

### verifyDeployment(connectionString, options)

Performs comprehensive deployment verification.

**Parameters:**
- `connectionString` (string): PostgreSQL connection string
- `options` (VerificationOptions): Optional configuration
  - `checkEnv` (boolean): Validate environment variables
  - `preDeployment` (boolean): Run pre-deployment checks only
  - `postDeployment` (boolean): Run post-deployment checks only

**Returns:** Promise<VerificationResult>

**Example:**
```typescript
import { verifyDeployment } from './verify-deployment';

const result = await verifyDeployment(
  'postgresql://user:pass@host:5432/db',
  { checkEnv: true }
);

if (result.deploymentReady) {
  console.log('Ready to deploy!');
} else {
  console.error('Deployment blocked:', result.errors);
}
```

### validateConnectionString(connectionString)

Validates PostgreSQL connection string format.

**Parameters:**
- `connectionString` (string): Connection string to validate

**Returns:** { valid: boolean; error?: string }

**Example:**
```typescript
import { validateConnectionString } from './verify-deployment';

const result = validateConnectionString('postgresql://user:pass@host:5432/db');
if (!result.valid) {
  console.error('Invalid connection string:', result.error);
}
```
