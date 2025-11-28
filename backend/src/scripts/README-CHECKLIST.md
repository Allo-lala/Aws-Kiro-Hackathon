# Deployment Checklist Script

## Overview

The deployment checklist script (`deployment-checklist.ts`) performs comprehensive pre-deployment validation to ensure all prerequisites are met before deploying the application. It provides a clear pass/fail report for each check and indicates whether the application is ready for deployment.

## Features

- ✅ Validates all required environment variables are set
- ✅ Checks recommended environment variables
- ✅ Validates API keys and URLs format
- ✅ Verifies JWT secret strength
- ✅ Tests database connectivity
- ✅ Checks that all migrations are applied
- ✅ Verifies database schema completeness
- ✅ Confirms seed data is present
- ✅ Provides clear "Ready to Deploy" or "Not Ready" status
- ✅ Offers remediation steps for failed checks

## Usage

### Basic Usage

Run the checklist using environment variables:

```bash
npm run deploy:check
```

Or directly with ts-node:

```bash
ts-node src/scripts/deployment-checklist.ts
```

### With Connection String

Provide a database connection string explicitly:

```bash
ts-node src/scripts/deployment-checklist.ts --connection-string postgresql://user:pass@host:5432/database
```

### With Environment

Specify the environment to check:

```bash
ts-node src/scripts/deployment-checklist.ts --environment production
```

### With Custom Config

Use a custom deployment configuration file:

```bash
ts-node src/scripts/deployment-checklist.ts --config ./my-config.json
```

## Command Line Options

| Option | Description | Example |
|--------|-------------|---------|
| `--connection-string <url>` | Database connection string (overrides DATABASE_URL) | `--connection-string postgresql://...` |
| `--environment <env>` | Environment to check (production, staging, development) | `--environment production` |
| `--config <path>` | Path to deployment config file | `--config ./deployment-config.json` |

## Checks Performed

### 1. Environment Variables

**Required Variables:**
- `DATABASE_URL` - PostgreSQL database connection string
- `JWT_SECRET` - Secret key for JWT token signing
- `BASE_URL` - Base URL for the API

**Recommended Variables:**
- `GEOAPIFY_API_KEY` - API key for Geoapify geocoding service
- `SMTP_HOST` - SMTP server hostname
- `SMTP_PORT` - SMTP server port
- `SMTP_USER` - SMTP authentication username
- `SMTP_PASS` - SMTP authentication password
- `NODE_ENV` - Node environment (production, staging, development)

### 2. API Keys and URLs

- Validates `DATABASE_URL` format (must be valid PostgreSQL URL)
- Validates `BASE_URL` format (must be valid HTTP/HTTPS URL)
- Checks `JWT_SECRET` strength (recommends 32+ characters)
- Validates `GEOAPIFY_API_KEY` if present

### 3. Database

- Tests database connectivity
- Verifies all migrations are applied
- Checks that all required tables exist:
  - `users`
  - `user_preferences`
  - `trips`
  - `sessions`
  - `audit_logs`
  - `migrations`
- Confirms seed data is present (checks for users)

## Output

The script provides a comprehensive report with:

1. **Real-time Progress**: Shows each check as it runs
2. **Categorized Results**: Groups checks by category (Environment, APIs, Security, Database)
3. **Summary Statistics**: Total checks, passed, critical failures, warnings
4. **Deployment Status**: Clear "READY TO DEPLOY" or "NOT READY TO DEPLOY" message
5. **Remediation Steps**: Specific guidance for fixing failed checks

### Example Output (Success)

```
🚀 Deployment Checklist
════════════════════════════════════════════════════════════
📋 Checking Environment Variables...
   ✅ Required variables: All 3 present
   ✅ Recommended variables: All 6 present

🔑 Checking API Keys and URLs...
   ✅ DATABASE_URL: Valid format
   ✅ BASE_URL: Valid format
   ✅ JWT_SECRET: Adequate strength
   ✅ GEOAPIFY_API_KEY: Present

🗄️  Checking Database...
   ✅ Connectivity: Connected
   ✅ Migrations: All applied
   ✅ Schema: All tables present
   ✅ Seed data: 5 user(s) found

════════════════════════════════════════════════════════════
📊 DEPLOYMENT CHECKLIST REPORT
════════════════════════════════════════════════════════════

Environment:
   ✅ Required Environment Variables
      All 3 required variables are set
   ✅ Recommended Environment Variables
      All 6 recommended variables are set

APIs:
   ✅ DATABASE_URL Format
      Valid PostgreSQL connection string
   ✅ BASE_URL Format
      Valid HTTP(S) URL

Security:
   ✅ JWT_SECRET Strength
      JWT secret has adequate length

Database:
   ✅ Database Connectivity
      Successfully connected to database
   ✅ Migrations Applied
      All migrations are applied
   ✅ Schema Validation
      All 6 required tables exist
   ✅ Seed Data Present
      Found 5 user(s) in database

────────────────────────────────────────────────────────────
📈 Summary:
   Total Checks: 10
   Passed: 10
   Critical Failures: 0
   Warnings: 0

────────────────────────────────────────────────────────────
✅ READY TO DEPLOY

🎉 All critical checks passed!
   Your application is ready for deployment.
════════════════════════════════════════════════════════════
```

### Example Output (Failure)

```
🚀 Deployment Checklist
════════════════════════════════════════════════════════════
📋 Checking Environment Variables...
   ❌ Required variables: Missing 2
      - DATABASE_URL
      - JWT_SECRET

🔑 Checking API Keys and URLs...
   ❌ DATABASE_URL: Not set
   ❌ BASE_URL: Invalid format

🗄️  Checking Database...
   ❌ No connection string available

════════════════════════════════════════════════════════════
📊 DEPLOYMENT CHECKLIST REPORT
════════════════════════════════════════════════════════════

────────────────────────────────────────────────────────────
📈 Summary:
   Total Checks: 5
   Passed: 1
   Critical Failures: 4
   Warnings: 0

────────────────────────────────────────────────────────────
❌ NOT READY TO DEPLOY

💥 4 critical check(s) failed!
   Please address the failures above before deploying.

💡 Remediation Steps:
   1. Set all required environment variables
      - Check deployment-config.json for required values
      - Use setup-vercel-env.ts to configure Vercel
   2. Validate API keys and URLs
      - Ensure DATABASE_URL is a valid PostgreSQL connection string
      - Ensure BASE_URL is a valid HTTP(S) URL
      - Verify JWT_SECRET is set and secure
   3. Initialize and verify database
      - Run: ts-node src/scripts/init-database.ts <connection-string>
      - Or run migrations: ts-node src/scripts/run-migrations.ts <connection-string>
      - Then seed: ts-node src/scripts/seed-database.ts <connection-string>
════════════════════════════════════════════════════════════
```

## Exit Codes

- `0` - All critical checks passed (ready to deploy)
- `1` - One or more critical checks failed (not ready to deploy)

## Integration with CI/CD

You can integrate this script into your CI/CD pipeline:

```yaml
# Example GitHub Actions workflow
- name: Run Deployment Checklist
  run: npm run deploy:check
  env:
    DATABASE_URL: ${{ secrets.DATABASE_URL }}
    JWT_SECRET: ${{ secrets.JWT_SECRET }}
    BASE_URL: ${{ secrets.BASE_URL }}
```

The script will exit with code 1 if any critical checks fail, causing the CI/CD pipeline to stop.

## Severity Levels

The script uses three severity levels:

- **Critical**: Must pass for deployment to proceed
- **Warning**: Should be addressed but won't block deployment
- **Info**: Informational checks that passed

## Related Scripts

- `init-database.ts` - Initialize database with migrations and seeding
- `run-migrations.ts` - Run database migrations
- `seed-database.ts` - Seed database with test data
- `verify-deployment.ts` - Verify deployment after it's complete
- `setup-vercel-env.ts` - Configure Vercel environment variables

## Troubleshooting

### "Missing required variables"

Set the required environment variables in your shell or `.env` file:

```bash
export DATABASE_URL="postgresql://user:pass@host:5432/database"
export JWT_SECRET="your-secret-key-here"
export BASE_URL="https://api.example.com"
```

### "Failed to connect to database"

1. Verify the connection string is correct
2. Ensure the database server is running
3. Check firewall rules and network connectivity
4. Verify SSL settings if required

### "Pending migrations detected"

Run migrations before deploying:

```bash
npm run db:init
# or
ts-node src/scripts/run-migrations.ts <connection-string>
```

### "Missing tables"

The database schema is incomplete. Run migrations:

```bash
ts-node src/scripts/init-database.ts <connection-string>
```

### "No users found"

Seed the database with test data:

```bash
npm run db:seed
# or
ts-node src/scripts/seed-database.ts <connection-string>
```

## Best Practices

1. **Run Before Every Deployment**: Always run the checklist before deploying to catch issues early
2. **Automate in CI/CD**: Integrate into your deployment pipeline
3. **Address Warnings**: While warnings won't block deployment, they should be addressed
4. **Keep Secrets Secure**: Never commit secrets to version control
5. **Use Environment-Specific Configs**: Maintain separate configurations for each environment

## Example Workflow

```bash
# 1. Set environment variables
export DATABASE_URL="postgresql://..."
export JWT_SECRET="..."
export BASE_URL="https://..."

# 2. Run the checklist
npm run deploy:check

# 3. If checks pass, proceed with deployment
# If checks fail, address the issues and re-run

# 4. After deployment, verify with health checks
npm run deploy:health
```
