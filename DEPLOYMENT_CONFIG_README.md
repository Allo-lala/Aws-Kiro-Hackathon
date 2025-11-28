# Deployment Configuration Guide

## Overview

The `deployment-config.json` file contains environment-specific configuration for the Rutty application deployment workflow. This file is used by various deployment scripts to initialize databases, verify deployments, and configure environment variables.

## File Structure

```json
{
  "environments": {
    "production": { ... },
    "staging": { ... },
    "development": { ... }
  }
}
```

## Environment Configuration

Each environment object contains the following properties:

### Required Properties

| Property | Type | Description | Example |
|----------|------|-------------|---------|
| `name` | string | Environment identifier | `"production"` |
| `databaseUrl` | string | PostgreSQL connection string | `"postgresql://user:pass@host/db?sslmode=require"` |
| `apiBaseUrl` | string | Backend API base URL | `"https://api.rutty.app"` |
| `environmentVariables` | object | Key-value pairs of environment variables | See below |

### Optional Properties

| Property | Type | Description | Example |
|----------|------|-------------|---------|
| `description` | string | Human-readable environment description | `"Production environment"` |
| `frontendUrl` | string | Frontend application URL | `"https://rutty.vercel.app"` |
| `vercelProjectId` | string | Vercel project ID (for cloud deployments) | `"prj_xxxxxxxxxxxxx"` |
| `vercelTeamId` | string | Vercel team ID (for team accounts) | `"team_xxxxxxxxxxxxx"` |

## Environment Variables

### Critical Variables (Required)

These variables MUST be set for the application to function:

- **`DATABASE_URL`**: PostgreSQL connection string
  - For Neon (production): Use pooled connection with `?sslmode=require`
  - For local dev: Standard PostgreSQL connection string
  - Example: `postgresql://user:pass@ep-xxx.region.aws.neon.tech/db?sslmode=require`

- **`JWT_SECRET`**: Secret key for JWT token signing
  - Must be a secure random string (minimum 32 characters)
  - Generate using: `openssl rand -base64 32`
  - Use different secrets for each environment
  - Example: `"a13e170856cc6e0623ae657b7cc8748f"`

- **`BASE_URL`**: Base URL of the deployed application
  - Used for email verification links and CORS
  - Example: `"https://aws-kiro-hackathon-ijw4.vercel.app"`

- **`GEOAPIFY_API_KEY`**: API key for Geoapify location services
  - Required for location autocomplete and routing
  - Get free key at: https://www.geoapify.com/
  - Example: `"1b98641552864bc788a642b33d1be30d"`

### Server Configuration

- **`PORT`**: Server port number (default: `8080`)
- **`NODE_ENV`**: Node environment (`development`, `staging`, `production`)

### Database Configuration

- **`DB_LOGGING`**: Enable database query logging (`true`/`false`)
- **`DB_POOL_MAX`**: Maximum database connection pool size (default: `20`)
- **`DB_POOL_MIN`**: Minimum database connection pool size (default: `5`)
- **`DB_IDLE_TIMEOUT`**: Connection idle timeout in milliseconds (default: `30000`)
- **`DB_CONNECTION_TIMEOUT`**: Connection timeout in milliseconds (default: `10000`)

### Authentication Configuration

- **`JWT_EXPIRATION`**: JWT token expiration time (default: `24h`)
  - Format: `<number><unit>` where unit is `s`, `m`, `h`, or `d`
  - Examples: `24h`, `7d`, `30m`

### External API Configuration

- **`ROUTE_API_PROVIDER`**: Route API provider (`geoapify` or `google_maps`)
- **`ROUTE_API_KEY`**: API key for route calculation service
- **`ROUTE_API_TIMEOUT`**: API request timeout in milliseconds (default: `5000`)
- **`ROUTE_API_MAX_RETRIES`**: Maximum retry attempts for failed requests (default: `3`)
- **`ROUTE_CACHE_ENABLED`**: Enable route caching (`true`/`false`)
- **`ROUTE_CACHE_TTL_MINUTES`**: Cache time-to-live in minutes (default: `60`)

### CORS Configuration

- **`ALLOWED_ORIGINS`**: Comma-separated list of allowed CORS origins
  - Example: `"https://rutty.vercel.app,https://api.rutty.app"`

### Email Configuration (Optional)

- **`SENDGRID_API_KEY`**: SendGrid API key for email functionality
- **`EMAIL_FROM`**: Sender email address for system emails

### Frontend Variables

- **`REACT_APP_API_URL`**: Frontend API endpoint URL
- **`REACT_APP_GEOAPIFY_API_KEY`**: Geoapify API key for frontend

## Usage Examples

### Database Initialization

Initialize a database for a specific environment:

```bash
# Using npm script
npm run db:init -- --env=production

# Direct execution
ts-node backend/src/scripts/init-database.ts --config=deployment-config.json --env=production
```

### Deployment Verification

Verify deployment readiness:

```bash
# Using npm script
npm run deploy:verify -- --env=production

# Direct execution
ts-node backend/src/scripts/verify-deployment.ts --config=deployment-config.json --env=production
```

### Vercel Environment Setup

Configure Vercel environment variables:

```bash
# Using npm script
npm run vercel:setup-env -- --env=production

# Direct execution
ts-node backend/src/scripts/setup-vercel-env.ts --config=deployment-config.json --env=production
```

### Health Check

Run post-deployment health checks:

```bash
# Using npm script
npm run deploy:health -- --env=production

# Direct execution
ts-node backend/src/scripts/health-check.ts --config=deployment-config.json --env=production
```

## Environment-Specific Notes

### Production Environment

- **Database**: Use Neon pooled connection string with SSL
- **Security**: Use strong, randomly generated JWT_SECRET
- **Logging**: Disable database logging (`DB_LOGGING=false`)
- **Pool Size**: Higher pool size for better concurrency (`DB_POOL_MAX=20`)
- **CORS**: Restrict to production domains only
- **Vercel**: Requires `vercelProjectId` for automated deployment

### Staging Environment

- **Database**: Separate Neon database for staging
- **Logging**: Enable for debugging (`DB_LOGGING=true`)
- **Pool Size**: Moderate pool size (`DB_POOL_MAX=10`)
- **Testing**: Safe environment for pre-production testing

### Development Environment

- **Database**: Local PostgreSQL instance
- **Security**: Simple JWT_SECRET (not for production use)
- **Logging**: Enable for debugging (`DB_LOGGING=true`)
- **CORS**: Allow localhost origins
- **No Vercel**: Local development doesn't need Vercel configuration

## Security Best Practices

### DO:
✅ Use different JWT_SECRET for each environment
✅ Generate strong secrets: `openssl rand -base64 32`
✅ Use environment variables or secret management for actual values
✅ Include `?sslmode=require` for cloud database connections
✅ Restrict CORS origins to known domains
✅ Keep this file in `.gitignore` if it contains actual secrets

### DON'T:
❌ Commit actual secrets to version control
❌ Use the same JWT_SECRET across environments
❌ Use weak or predictable secrets
❌ Share production credentials
❌ Disable SSL for production databases

## Neon Database Configuration

### Connection String Format

Neon provides two types of connection strings:

1. **Pooled Connection** (recommended for serverless):
   ```
   postgresql://user:pass@ep-xxx.region.aws.neon.tech/db?sslmode=require
   ```

2. **Direct Connection** (for long-running processes):
   ```
   postgresql://user:pass@ep-xxx.region.aws.neon.tech/db?sslmode=require&connect_timeout=10
   ```

### Finding Your Connection String

1. Log in to [Neon Console](https://console.neon.tech)
2. Select your project
3. Go to "Connection Details"
4. Copy the **Pooled connection** string
5. Ensure it includes `?sslmode=require`

### SSL Configuration

Always use SSL for Neon connections:
- Include `?sslmode=require` in the connection string
- Neon automatically handles SSL certificates
- No additional SSL configuration needed

## Vercel Configuration

### Finding Your Project ID

1. Log in to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project
3. Go to Settings → General
4. Copy the "Project ID" (format: `prj_xxxxxxxxxxxxx`)

### Finding Your Team ID (if applicable)

1. Go to your team settings
2. Copy the "Team ID" (format: `team_xxxxxxxxxxxxx`)

### Setting Environment Variables

You can set variables in three ways:

1. **Vercel Dashboard**: Project Settings → Environment Variables
2. **Vercel CLI**: `vercel env add VARIABLE_NAME`
3. **Automated Script**: `npm run vercel:setup-env -- --env=production`

## Troubleshooting

### Common Issues

**Issue**: Database connection fails
- **Solution**: Verify connection string format and SSL mode
- **Check**: Ensure `?sslmode=require` is included for Neon
- **Test**: Run `npm run db:verify -- --env=<environment>`

**Issue**: JWT authentication fails
- **Solution**: Ensure JWT_SECRET is set and matches across services
- **Check**: Verify JWT_SECRET is at least 16 characters
- **Generate**: Use `openssl rand -base64 32` for new secret

**Issue**: CORS errors in browser
- **Solution**: Add frontend URL to ALLOWED_ORIGINS
- **Format**: Comma-separated list without spaces
- **Example**: `"https://app.com,https://api.com"`

**Issue**: Geoapify API errors
- **Solution**: Verify API key is valid and has quota remaining
- **Check**: Test key at https://www.geoapify.com/
- **Limit**: Free tier has request limits

**Issue**: Vercel deployment fails
- **Solution**: Verify all required environment variables are set
- **Check**: Run `npm run deploy:check -- --env=production`
- **Verify**: Ensure vercelProjectId is correct

## Schema Validation

The configuration file includes a JSON schema reference for validation:

```json
{
  "$schema": "./deployment-config.schema.json"
}
```

### Validating Your Configuration

Use a JSON schema validator or IDE with JSON schema support:

```bash
# Using ajv-cli
npm install -g ajv-cli
ajv validate -s deployment-config.schema.json -d deployment-config.json
```

Most modern IDEs (VS Code, WebStorm) will automatically validate against the schema and provide:
- Auto-completion for property names
- Inline documentation
- Validation errors for incorrect values

## Template for New Environments

To add a new environment, copy this template:

```json
{
  "your-environment-name": {
    "name": "your-environment-name",
    "description": "Description of this environment",
    "databaseUrl": "postgresql://user:pass@host:5432/database",
    "apiBaseUrl": "https://your-api-url.com",
    "frontendUrl": "https://your-frontend-url.com",
    "vercelProjectId": "prj_xxxxxxxxxxxxx",
    "environmentVariables": {
      "PORT": "8080",
      "NODE_ENV": "production",
      "DATABASE_URL": "postgresql://user:pass@host:5432/database",
      "JWT_SECRET": "your-secure-secret-here",
      "JWT_EXPIRATION": "24h",
      "BASE_URL": "https://your-api-url.com",
      "GEOAPIFY_API_KEY": "your-api-key",
      "ROUTE_API_PROVIDER": "geoapify",
      "ROUTE_API_KEY": "your-api-key",
      "ALLOWED_ORIGINS": "https://your-frontend-url.com",
      "REACT_APP_API_URL": "https://your-api-url.com/api",
      "REACT_APP_GEOAPIFY_API_KEY": "your-api-key"
    }
  }
}
```

## Related Documentation

- [Deployment Workflow Guide](./DEPLOYMENT_WORKFLOW.md) - Step-by-step deployment instructions
- [Database Setup Guide](./backend/DATABASE_SETUP.md) - Database initialization and migration
- [Vercel Deployment Guide](./VERCEL_DEPLOYMENT_GUIDE.md) - Vercel-specific deployment steps
- [API Documentation](./backend/API_ENDPOINTS.md) - API endpoint reference

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review related documentation
3. Check deployment script logs for detailed error messages
4. Verify all required environment variables are set correctly
