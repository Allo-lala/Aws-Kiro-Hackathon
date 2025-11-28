# Migration Rollback Script

## Overview

The `rollback-migration.ts` script reverts TypeORM migrations against a specified database. It can rollback the last migration or multiple migrations in sequence.

## Features

- ✅ Identifies the last applied migration
- ✅ Executes down migrations for specified versions
- ✅ Supports rolling back multiple migrations with `--steps` flag
- ✅ Verifies schema state after rollback
- ✅ Provides detailed rollback results
- ✅ Transaction-based rollback for safety
- ✅ Reports current database state on failure

## Usage

### Basic Usage (Rollback Last Migration)

```bash
ts-node src/scripts/rollback-migration.ts <connection-string>
```

### Rollback Multiple Migrations

```bash
ts-node src/scripts/rollback-migration.ts <connection-string> --steps N
```

## Examples

### Rollback the last migration

```bash
ts-node src/scripts/rollback-migration.ts postgresql://user:pass@localhost:5432/mydb
```

### Rollback the last 3 migrations

```bash
ts-node src/scripts/rollback-migration.ts postgresql://user:pass@localhost:5432/mydb --steps 3
```

### Using with Neon Database

```bash
ts-node src/scripts/rollback-migration.ts "postgresql://user:pass@ep-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require"
```

## Command Line Options

| Option | Description | Default |
|--------|-------------|---------|
| `<connection-string>` | PostgreSQL connection URL (required) | - |
| `--steps N` | Number of migrations to rollback | 1 |

## Output

The script provides detailed output including:

1. **Connection Status**: Confirms database connection
2. **Migration Identification**: Lists migrations to be rolled back
3. **Rollback Progress**: Shows each migration being reverted
4. **Schema Verification**: Confirms database state after rollback
5. **Summary**: Lists reverted migrations and remaining migrations

### Success Output Example

```
🔧 Migration Rollback Tool

Configuration:
   Steps to rollback: 1

🔌 Connecting to database...
✅ Database connection established

📋 Identified 1 migration(s) to rollback:
   1. CreateUsersTable1700000001000 (1700000001000)

🔄 Rolling back migrations...

   Rolling back: CreateUsersTable1700000001000
   ✅ Successfully rolled back: CreateUsersTable1700000001000

🔍 Verifying schema state...
✅ Schema verification passed - 5 migration(s) remain in database

✅ Rollback completed successfully!
📊 Reverted 1 migration(s):
   - CreateUsersTable1700000001000 (1700000001000)

📋 Remaining migrations in database: 5

🔌 Database connection closed

✨ All done!
```

### Error Output Example

```
❌ Rollback failed!
Error: Migration down method failed

Stack trace:
...

📊 Current database state:
   Executed migrations: 6
   Most recent migration:
      CreateUsersTable1700000001000 (1700000001000)

🔌 Database connection closed

💥 Rollback failed with errors:
  1. Failed to rollback CreateUsersTable1700000001000: Migration down method failed
```

## Exit Codes

- `0`: Rollback completed successfully
- `1`: Rollback failed or encountered errors

## Requirements

- TypeORM configured with migrations
- Valid PostgreSQL connection string
- Database must have migrations table
- Migrations must have `down` methods implemented

## Safety Features

1. **Transaction-based**: All rollbacks run in transactions
2. **Stop on failure**: Stops rolling back if any migration fails
3. **Schema verification**: Verifies database state after rollback
4. **State reporting**: Reports current database state on failure
5. **Connection validation**: Validates connection string before attempting rollback

## Common Use Cases

### Revert a failed migration

If a migration was applied but caused issues:

```bash
ts-node src/scripts/rollback-migration.ts $DATABASE_URL
```

### Revert multiple migrations for testing

When testing migration sequences:

```bash
ts-node src/scripts/rollback-migration.ts $DATABASE_URL --steps 5
```

### Recover from deployment failure

If a deployment with new migrations failed:

```bash
# Rollback the new migrations
ts-node src/scripts/rollback-migration.ts $DATABASE_URL --steps 2

# Redeploy with fixes
# ...

# Re-run migrations
ts-node src/scripts/run-migrations.ts $DATABASE_URL
```

## Troubleshooting

### "No migrations to rollback"

This means the database has no executed migrations. Check:
- Database connection is correct
- Migrations table exists
- Migrations were actually applied

### "Failed to rollback migration"

This usually means:
- The migration's `down` method has an error
- The database state doesn't match what the migration expects
- There are foreign key constraints preventing rollback

**Solution**: Review the migration's `down` method and fix any issues.

### "Schema verification failed"

This indicates the database may be in an inconsistent state after rollback.

**Solution**: 
1. Check the database manually
2. Review the migration that failed
3. Consider manual cleanup if needed

## Integration with Other Scripts

The rollback script works alongside other deployment scripts:

```bash
# Full workflow example
ts-node src/scripts/run-migrations.ts $DATABASE_URL
# ... deployment fails ...
ts-node src/scripts/rollback-migration.ts $DATABASE_URL
# ... fix issues ...
ts-node src/scripts/run-migrations.ts $DATABASE_URL
ts-node src/scripts/verify-deployment.ts $DATABASE_URL
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `MIGRATION_LOGGING` | Enable TypeORM query logging | `false` |

Enable logging for debugging:

```bash
MIGRATION_LOGGING=true ts-node src/scripts/rollback-migration.ts $DATABASE_URL
```

## Notes

- Always backup your database before rolling back migrations in production
- Test rollback procedures in a staging environment first
- Ensure all migrations have properly implemented `down` methods
- Rolling back migrations does not restore data that was deleted
- Consider the impact on application code that depends on the schema
