# Database Setup Guide

This guide explains how to set up and manage the PostgreSQL database for the Rutty backend.

## Prerequisites

- PostgreSQL 14+ installed and running
- Node.js 18+ installed
- npm or yarn package manager

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Copy the `.env.example` file to `.env` and update the database credentials:

```bash
cp .env.example .env
```

Edit `.env` with your PostgreSQL credentials:

```env
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=your_password
DB_NAME=rutty_dev
DB_LOGGING=false
DB_POOL_MAX=20
DB_POOL_MIN=5
```

### 3. Create Database

Create the database in PostgreSQL:

```bash
psql -U postgres -c "CREATE DATABASE rutty_dev;"
```

### 4. Run Migrations

Run the automated setup script that connects to the database and runs all migrations:

```bash
npm run db:setup
```

This script will:
- Connect to the database
- Run all pending migrations
- Verify the schema creation
- Perform a health check

## Manual Migration Commands

If you prefer to run migrations manually:

```bash
# Run all pending migrations
npm run migration:run

# Show migration status
npm run migration:show

# Revert the last migration
npm run migration:revert

# Generate a new migration from entity changes
npm run migration:generate -- src/database/migrations/MigrationName

# Create a blank migration file
npm run migration:create -- src/database/migrations/MigrationName
```

## Database Schema

The database includes the following tables:

### users
- Stores user account information
- Includes authentication fields (email, password_hash)
- Tracks login attempts and account status
- Indexes on: email, is_active

### user_preferences
- Stores user-specific preferences for route planning
- One-to-one relationship with users
- Includes accessibility needs and sustainability priorities

### trips
- Records completed trips with route details
- Many-to-one relationship with users
- Stores carbon savings and trip metrics
- Indexes on: user_id, completed_at

### sessions
- Manages active user sessions
- Stores JWT tokens and expiration times
- Many-to-one relationship with users
- Indexes on: token, user_id, expires_at

### audit_logs
- Records all administrative actions
- Tracks who did what and when
- References both admin and target users
- Indexes on: admin_id, timestamp, action

## Connection Pooling

The database service uses connection pooling with the following default settings:

- **Max connections**: 20
- **Min connections**: 5
- **Idle timeout**: 30 seconds
- **Connection timeout**: 2 seconds

These can be configured via environment variables.

## Using the Database Service

```typescript
import { databaseService } from './services/DatabaseService';

// Connect to database
await databaseService.connect();

// Run migrations
await databaseService.runMigrations();

// Execute a transaction
await databaseService.transaction(async (manager) => {
  // Your transactional operations here
  const user = await manager.save(UserEntity, { email: 'test@example.com' });
  return user;
});

// Health check
const isHealthy = await databaseService.healthCheck();

// Disconnect
await databaseService.disconnect();
```

## Troubleshooting

### Connection Refused

If you get a connection refused error:
1. Ensure PostgreSQL is running: `sudo service postgresql status`
2. Check the host and port in your `.env` file
3. Verify your PostgreSQL user has the correct permissions

### Migration Errors

If migrations fail:
1. Check the database exists: `psql -U postgres -l`
2. Verify your user has CREATE privileges
3. Review the migration logs for specific errors
4. Try reverting the last migration: `npm run migration:revert`

### Permission Denied

If you get permission errors:
```bash
psql -U postgres
GRANT ALL PRIVILEGES ON DATABASE rutty_dev TO your_username;
```

## Development vs Production

- **Development**: Set `DB_LOGGING=true` to see all SQL queries
- **Production**: 
  - Use strong passwords
  - Enable SSL connections
  - Set appropriate pool sizes based on load
  - Never use `synchronize: true` in TypeORM config
  - Always use migrations for schema changes

## Testing

The database service includes a health check endpoint that can be used for monitoring:

```typescript
const isHealthy = await databaseService.healthCheck();
```

This executes a simple `SELECT 1` query to verify connectivity.
