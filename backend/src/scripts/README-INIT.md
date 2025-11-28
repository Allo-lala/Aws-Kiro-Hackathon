# Database Initialization Script

## Overview

The `init-database.ts` script provides a complete database initialization workflow that orchestrates migrations, seeding, and verification in the correct order. This is the recommended way to set up a fresh database for any environment (development, staging, or production).

## What It Does

The initialization script performs three main steps:

1. **Migrations** - Creates the database schema by running all pending TypeORM migrations
2. **Seeding** - Populates the database with initial test data (users, preferences, trips)
3. **Verification** - Validates that the database is properly configured and ready to use

## Usage

### Basic Usage

```bash
ts-node src/scripts/init-database.ts <connection-string>
```

### With Options

```bash
# Skip migrations (if already applied)
ts-node src/scripts/init-database.ts <connection-string> --skip-migrations

# Skip seeding (for production databases)
ts-node src/scripts/init-database.ts <connection-string> --skip-seeding

# Skip both (just run verification)
ts-node src/scripts/init-database.ts <connection-string> --skip-migrations --skip-seeding
```

## Examples

### Initialize a Fresh Development Database

```bash
ts-node src/scripts/init-database.ts postgresql://user:password@localhost:5432/rutty_dev
```

### Initialize Production Database (No Seed Data)

```bash
ts-node src/scripts/init-database.ts postgresql://user:password@neon.tech:5432/rutty_prod --skip-seeding
```

### Verify Existing Database

```bash
ts-node src/scripts/init-database.ts postgresql://user:password@localhost:5432/rutty_dev --skip-migrations --skip-seeding
```

## Command Line Options

| Option | Description |
|--------|-------------|
| `--skip-migrations` | Skip the migration step (useful if migrations are already applied) |
| `--skip-seeding` | Skip the seeding step (recommended for production databases) |

## Output

The script provides detailed output for each step:

### During Execution

```
🚀 Database Initialization Started

Configuration:
   Skip Migrations: No
   Skip Seeding: No

📋 Step 1: Running Migrations
──────────────────────────────────────────────────
🔌 Connecting to database...
✅ Database connection established
🚀 Running migrations...
✅ Migration completed successfully!

🌱 Step 2: Seeding Database
──────────────────────────────────────────────────
🔌 Connecting to database...
✅ Database connection established
🌱 Starting seed process...
✅ Seed process completed successfully!

🔍 Step 3: Verification
──────────────────────────────────────────────────
🔍 Performing post-initialization verification...
   ✅ Database connectivity: PASSED
   ✅ Schema validation: PASSED
   ✅ Seed data validation: PASSED
```

### Final Report

```
════════════════════════════════════════════════════════════
📊 DATABASE INITIALIZATION REPORT
════════════════════════════════════════════════════════════

📋 Migrations:
   Status: ✅ SUCCESS
   Applied: 7 migration(s)
      - CreateUsersTable
      - CreateUserPreferencesTable
      - CreateTripsTable
      ...

🌱 Seeding:
   Status: ✅ SUCCESS
   Users created: 3
   Preferences created: 3
   Trips created: 4

🔍 Verification:
   ✅ Database Connectivity: Successfully connected to database
   ✅ Schema Validation: All 6 required tables exist
   ✅ Seed Data Validation: Found 3 user(s) in database

────────────────────────────────────────────────────────────
✅ INITIALIZATION SUCCESSFUL

Database Details:
   Connection: Verified
   Schema: Valid
   Status: Ready for use

🎉 Your database is ready!
════════════════════════════════════════════════════════════
```

## Verification Checks

The script performs the following verification checks:

1. **Database Connectivity** - Tests that the database can be reached and connected to
2. **Schema Validation** - Verifies all required tables exist:
   - `users`
   - `user_preferences`
   - `trips`
   - `sessions`
   - `audit_logs`
   - `migrations`
3. **Seed Data Validation** - Checks that test users were created (if seeding was not skipped)

## Error Handling

### Migration Failures

If migrations fail, the script will:
- Stop execution immediately
- Display the migration error
- Provide remediation guidance
- Exit with code 1

Example error output:
```
❌ Migration step failed. Stopping initialization.
Remediation: Check the migration errors above and fix any issues.
```

### Seeding Failures

If seeding fails, the script will:
- Continue to verification (migrations are still valid)
- Display the seeding error
- Suggest running the seed script separately
- Mark initialization as partially successful

Example error output:
```
❌ Seeding step failed. Database schema is ready but no test data was added.
Remediation: Check the seeding errors above. You can retry seeding separately.
```

### Verification Failures

If verification fails, the script will:
- Display which checks failed
- Provide specific error details
- Suggest remediation steps

## Exit Codes

- `0` - Success (all steps completed successfully)
- `1` - Failure (one or more steps failed)

## Integration with Other Scripts

This script uses:
- `run-migrations.ts` - For executing database migrations
- `seed-database.ts` - For populating test data

You can also run these scripts individually if needed:

```bash
# Run only migrations
ts-node src/scripts/run-migrations.ts <connection-string>

# Run only seeding
ts-node src/scripts/seed-database.ts <connection-string>
```

## Best Practices

### Development Environment
```bash
# Full initialization with test data
ts-node src/scripts/init-database.ts $DATABASE_URL
```

### Staging Environment
```bash
# Full initialization with test data
ts-node src/scripts/init-database.ts $DATABASE_URL
```

### Production Environment
```bash
# Migrations only, no test data
ts-node src/scripts/init-database.ts $DATABASE_URL --skip-seeding
```

### CI/CD Pipeline
```bash
# Run migrations, skip seeding, verify
ts-node src/scripts/init-database.ts $DATABASE_URL --skip-seeding
```

## Troubleshooting

### Connection Timeout

If you see connection timeout errors:
1. Verify the connection string is correct
2. Check that the database server is running
3. Ensure firewall rules allow connections
4. For Neon databases, verify SSL is enabled

### Missing Tables

If verification reports missing tables:
1. Check that migrations ran successfully
2. Verify migration files exist in `src/database/migrations/`
3. Ensure migrations are in the correct order (timestamp-based)

### Duplicate Data

If seeding reports duplicate key errors:
- This is normal if the database was already seeded
- The script automatically skips existing records
- No action needed

## Related Documentation

- [Migration Runner](./README-MIGRATIONS.md)
- [Seed Data Manager](./README-SEED.md)
- [Deployment Workflow](../../../DEPLOYMENT_WORKFLOW.md)
