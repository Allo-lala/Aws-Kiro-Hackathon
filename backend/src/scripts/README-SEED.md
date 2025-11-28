# Seed Database Script

## Overview

The `seed-database.ts` script populates your database with initial test data including test users, user preferences, and sample trips.

## Features

- ✅ **Duplicate checking**: Automatically skips existing records to avoid duplicates
- ✅ **Transaction support**: All operations run in a transaction with automatic rollback on failure
- ✅ **Test users**: Creates regular and admin users with verified emails
- ✅ **Sample data**: Creates user preferences and sample trips for testing
- ✅ **Detailed reporting**: Shows exactly what was created

## Usage

### Basic Usage

```bash
ts-node src/scripts/seed-database.ts <connection-string>
```

### Example

```bash
ts-node src/scripts/seed-database.ts postgresql://user:pass@localhost:5432/rutty_dev
```

### With Neon Database

```bash
ts-node src/scripts/seed-database.ts "postgresql://neondb_owner:password@host.neon.tech/neondb?sslmode=require"
```

## Test Users Created

The script creates the following test users:

1. **Regular User**
   - Email: `test@example.com`
   - Password: `TestPassword123!`
   - Email Verified: Yes

2. **Admin User**
   - Email: `admin@example.com`
   - Password: `AdminPassword123!`
   - Email Verified: Yes
   - Admin: Yes

3. **Additional User**
   - Email: `user@example.com`
   - Password: `UserPassword123!`
   - Email Verified: Yes

## Data Created

For each user, the script creates:

- **User Preferences**
  - Max walking distance: 1.5 km
  - Preferred modes: walking, transit, bicycling
  - Sustainability priority: high
  - Time vs environment weight: 0.7

- **Sample Trips** (for non-admin users)
  - 2 sample trips with different transportation modes
  - Includes carbon savings and route details

## Output

The script provides detailed output:

```
🌱 Seed Data Manager

🔌 Connecting to database...
✅ Database connection established
🌱 Starting seed process...
👤 Creating test users...
   ✅ Created user: test@example.com (Regular)
   ✅ Created user: admin@example.com (Admin)
   ✅ Created user: user@example.com (Regular)
⚙️  Creating user preferences...
   ✅ Created preferences for: test@example.com
   ✅ Created preferences for: admin@example.com
   ✅ Created preferences for: user@example.com
🚗 Creating sample trips...
   ✅ Created 2 trips for: test@example.com
   ✅ Created 2 trips for: user@example.com
✅ Seed process completed successfully!

📊 Seeding Summary:
   Users created: 3
   Preferences created: 3
   Trips created: 4

🔌 Database connection closed

✨ All done!
```

## Error Handling

- **Invalid connection string**: Script validates format before connecting
- **Connection failures**: Clear error messages with troubleshooting hints
- **Duplicate data**: Automatically skips existing records
- **Transaction rollback**: Any failure rolls back all changes

## Idempotency

The script is idempotent - you can run it multiple times safely:
- Existing users are skipped
- Existing preferences are skipped
- Existing trips are skipped

## Testing

Run the unit tests:

```bash
npm test -- seed-database.test.ts
```

## Requirements Validated

This script validates the following requirements:

- **2.1**: Connects to target database
- **2.2**: Checks if data already exists to avoid duplicates
- **2.3**: Creates test users, sample routes, and reference data
- **2.4**: Reports specific errors and rolls back on failure
- **2.5**: Reports number of records created in each table
