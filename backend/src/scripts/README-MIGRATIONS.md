# Migration Runner Script

## Overview

The `run-migrations.ts` script provides a standalone way to run TypeORM migrations against any PostgreSQL database using a connection string. This is particularly useful for deployment workflows where you need to initialize cloud databases (like Neon) before deploying the application.

## Features

- ✅ Accepts database connection string as command-line argument
- ✅ Validates connection string format before attempting connection
- ✅ Executes all pending migrations in timestamp order
- ✅ Runs migrations in a single transaction for safety
- ✅ Reports which migrations were applied
- ✅ Verifies schema state after migrations
- ✅ Comprehensive error handling with clear error messages
- ✅ Proper connection cleanup
- ✅ Exit codes for CI/CD integration (0 = success, 1 = failure)

## Usage

### Basic Usage

```bash
ts-node src/scripts/run-migrations.ts <connection-string>
```

### Examples

#### Local Development Database
```bash
ts-node src/scripts/run-migrations.ts "postgresql://postgres:password@localhost:5432/rutty_dev"
```

#### Neon Production Database
```bash
ts-node src/scripts/run-migrations.ts "postgresql://user:pass@ep-cool-name-123456.us-east-2.aws.neon.tech/neondb?sslmode=require"
```

#### Using Environment Variable
```bash
ts-node src/scripts/run-migrations.ts "$DATABASE_URL"
```

## Connection String Format

The script expects a PostgreSQL connection string in the following format:

```
postgresql://[user[:password]@][host][:port][/database][?parameters]
```

### Required Components
- **Protocol**: `postgresql://` or `postgres://`
- **Host**: Database server hostname or IP
- **Database**: Database name

### Optional Components
- **User**: Database username (defaults to connection default)
- **Password**: Database password
- **Port**: Database port (defaults to 5432)
- **Parameters**: Query parameters like `sslmode=require`

### Valid Examples
- `postgresql://user:pass@localhost:5432/database`
- `postgres://user@localhost/database`
- `postgresql://user:pass@neon.tech/mydb?sslmode=require`

## Output

### Successful Migration
```
🔧 Migration Runner

🔌 Connecting to database...
✅ Database connection established
📋 Found pending migrations to apply
🚀 Running migrations...
🔍 Verifying schema state...
✅ Schema verification passed

✅ Migration completed successfully!
📊 Applied 3 migration(s):
   - CreateUsersTable (1700000001000)
   - CreateTripsTable (1700000003000)
   - CreateSessionsTable (1700000004000)

🔌 Database connection closed

✨ All done!
```

### No Pending Migrations
```
🔧 Migration Runner

🔌 Connecting to database...
✅ Database connection established
📋 Found no pending migrations to apply
🚀 Running migrations...
🔍 Verifying schema state...
✅ Schema verification passed

✅ Migration completed successfully!
📊 Applied 0 migration(s):
   (No new migrations to apply - database is up to date)

🔌 Database connection closed

✨ All done!
```

### Failed Migration
```
🔧 Migration Runner

❌ Migration failed!
Error: Connection timeout

Stack trace:
...

🔌 Database connection closed

💥 Migration failed with errors:
  1. Connection timeout
```

## Error Handling

The script handles various error scenarios:

### Invalid Connection String
- Missing protocol
- Missing hostname
- Missing database name
- Invalid URL format

### Connection Errors
- Connection timeout (10 seconds)
- Authentication failures
- Network issues
- SSL/TLS errors

### Migration Errors
- SQL syntax errors
- Constraint violations
- Transaction rollback on failure

## Exit Codes

- **0**: Success - all migrations applied successfully
- **1**: Failure - validation error, connection error, or migration error

## Integration with CI/CD

The script is designed to work in CI/CD pipelines:

```bash
# In your deployment script
ts-node src/scripts/run-migrations.ts "$DATABASE_URL"

if [ $? -eq 0 ]; then
  echo "Migrations successful, proceeding with deployment"
else
  echo "Migrations failed, aborting deployment"
  exit 1
fi
```

## Environment Variables

### Optional Configuration
- `MIGRATION_LOGGING=true` - Enable TypeORM query logging for debugging

## Testing

Run the unit tests:
```bash
npm test -- src/scripts/run-migrations.test.ts
```

## Related Scripts

- `setup-database.ts` - Full database setup using DatabaseService
- `seed-database.ts` - Populate database with test data (coming soon)
- `init-database.ts` - Complete initialization workflow (coming soon)

## Troubleshooting

### "Connection string is required"
Ensure you're passing the connection string as the first argument.

### "Invalid connection string format"
Check that your connection string starts with `postgresql://` or `postgres://` and includes all required components.

### "Connection timeout"
- Verify the database server is running and accessible
- Check firewall rules and network connectivity
- Ensure the hostname and port are correct

### "Authentication failed"
- Verify username and password are correct
- Check that the user has necessary permissions

### SSL/TLS Errors
- For cloud databases (like Neon), ensure SSL is enabled
- The script uses `rejectUnauthorized: false` for compatibility
- Add `?sslmode=require` to your connection string if needed

## Security Notes

- Never commit connection strings with passwords to version control
- Use environment variables for sensitive credentials
- The script automatically closes connections after execution
- Migrations run in a transaction and rollback on failure
