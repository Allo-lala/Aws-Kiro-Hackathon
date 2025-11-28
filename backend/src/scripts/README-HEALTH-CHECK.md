# Health Check Script

## Overview

The health check script performs post-deployment validation to ensure your deployed application is working correctly. It tests critical endpoints, measures response times, and verifies database connectivity through the API.

## Features

- ✅ Tests authentication endpoints (register, login)
- ✅ Tests route planning endpoints
- ✅ Verifies database connectivity through API
- ✅ Measures response times for each endpoint
- ✅ Generates comprehensive deployment success report
- ✅ Provides detailed troubleshooting guidance on failures

## Usage

### Basic Usage

```bash
# Test deployed application
npm run deploy:health https://api.rutty.app

# Or use ts-node directly
ts-node src/scripts/health-check.ts https://api.rutty.app
```

### Test Local Development Server

```bash
npm run deploy:health http://localhost:3000
```

### With Options

```bash
# Verbose output with detailed request/response information
npm run deploy:health https://api.rutty.app -- --verbose

# Custom timeout (default: 10000ms)
npm run deploy:health https://api.rutty.app -- --timeout 15000

# Skip specific test categories
npm run deploy:health https://api.rutty.app -- --skip-auth
npm run deploy:health https://api.rutty.app -- --skip-routes
npm run deploy:health https://api.rutty.app -- --skip-database
```

## Command Line Options

| Option | Description | Default |
|--------|-------------|---------|
| `--timeout <ms>` | Request timeout in milliseconds | 10000 |
| `--skip-auth` | Skip authentication endpoint tests | false |
| `--skip-routes` | Skip route planning endpoint tests | false |
| `--skip-database` | Skip database connectivity tests | false |
| `--verbose` | Show detailed request/response information | false |

## What It Tests

### 1. Authentication Endpoints

- **POST /api/auth/register** - Tests user registration
- **POST /api/auth/login** - Tests user login

### 2. Route Planning Endpoints

- **POST /api/routes/calculate** - Tests route calculation with sample data

### 3. Database Connectivity

- **GET /health** - Tests health endpoint (if available)
- **Database queries** - Verifies database is accessible through API

## Output

### Successful Deployment

```
🏥 Health Check Started

═══════════════════════════════════════════════════════════
Target: https://api.rutty.app
Timeout: 10000ms
═══════════════════════════════════════════════════════════

🔐 Testing Authentication Endpoints...
   Testing POST /api/auth/register...
   ✅ Register: 201 (245ms)
   Testing POST /api/auth/login...
   ✅ Login: 200 (189ms)

🗺️  Testing Route Planning Endpoints...
   Testing POST /api/routes/calculate...
   ✅ Route Calculate: 200 (523ms)

🗄️  Testing Database Connectivity...
   Testing GET /health...
   ✅ Health: 200 (87ms)
   Testing database query through login...
   ✅ Database Query: Working (156ms)

═══════════════════════════════════════════════════════════
📊 HEALTH CHECK REPORT
═══════════════════════════════════════════════════════════

🔍 Endpoint Results:
   ✅ POST /api/auth/register
      Status: 201 | Response Time: 245ms
   ✅ POST /api/auth/login
      Status: 200 | Response Time: 189ms
   ✅ POST /api/routes/calculate
      Status: 200 | Response Time: 523ms
   ✅ GET /health
      Status: 200 | Response Time: 87ms

🗄️  Database Status:
   ✅ Database is connected and responding

📈 Statistics:
   Total Endpoints Tested: 4
   Healthy: 4
   Failed: 0
   Average Response Time: 250ms

────────────────────────────────────────────────────────────
✅ DEPLOYMENT SUCCESSFUL

🎉 All health checks passed!
   Your application is deployed and functioning correctly.
   Average response time: 250ms

📋 Deployment Success Report:
   ✅ Authentication endpoints: Working
   ✅ Route planning endpoints: Working
   ✅ Database connectivity: Verified
   ✅ API response times: Acceptable

   Deployment completed successfully at: 2024-11-28T17:00:00.000Z
═══════════════════════════════════════════════════════════
```

### Failed Deployment

When issues are detected, the script provides detailed troubleshooting guidance:

```
❌ DEPLOYMENT ISSUES DETECTED

💥 2 endpoint(s) failed health checks!
   ⚠️  Database connectivity could not be verified

💡 Troubleshooting Steps:
   1. Verify the API base URL is correct
   2. Ensure the application is deployed and running
   3. Check network connectivity and firewall rules
   
   1. Verify DATABASE_URL environment variable is set
   2. Check database is accessible from deployment environment
   3. Run: ts-node src/scripts/verify-deployment.ts <connection-string>
```

## Exit Codes

- **0** - All health checks passed
- **1** - One or more health checks failed

## Integration with CI/CD

You can integrate this script into your deployment pipeline:

```yaml
# Example GitHub Actions workflow
- name: Run health checks
  run: npm run deploy:health ${{ secrets.API_BASE_URL }}
  
- name: Notify on failure
  if: failure()
  run: echo "Health checks failed!"
```

## Troubleshooting

### Connection Refused

```
Error: connect ECONNREFUSED
```

**Solutions:**
1. Verify the API base URL is correct
2. Ensure the application is deployed and running
3. Check firewall rules and network connectivity

### Timeout Errors

```
Error: timeout of 10000ms exceeded
```

**Solutions:**
1. Increase timeout: `--timeout 20000`
2. Check if server is overloaded
3. Verify database and external service connectivity

### Authentication Failures

```
❌ Login: 500 - Internal Server Error
```

**Solutions:**
1. Check JWT_SECRET environment variable is set
2. Verify database has users table
3. Run seed script to create test users

### Route Planning Failures

```
❌ Route Calculate: 500 - Server error
```

**Solutions:**
1. Check GEOAPIFY_API_KEY is set
2. Verify external API connectivity
3. Check route calculation service logs

## Best Practices

1. **Run after every deployment** - Verify the deployment was successful
2. **Use in CI/CD pipelines** - Automate health checks
3. **Monitor response times** - Track performance over time
4. **Test all environments** - Run against staging before production
5. **Keep test data updated** - Ensure test users exist in database

## Related Scripts

- `verify-deployment.ts` - Pre-deployment database verification
- `deployment-checklist.ts` - Pre-deployment checklist
- `init-database.ts` - Database initialization
- `seed-database.ts` - Seed test data

## Examples

### Complete Deployment Workflow

```bash
# 1. Initialize database
npm run db:init $DATABASE_URL

# 2. Run pre-deployment checklist
npm run deploy:check

# 3. Deploy application (e.g., to Vercel)
vercel --prod

# 4. Run health checks
npm run deploy:health https://api.rutty.app

# 5. Verify everything is working
npm run db:verify $DATABASE_URL
```

### Testing Specific Endpoints

```bash
# Only test authentication
npm run deploy:health https://api.rutty.app -- --skip-routes --skip-database

# Only test routes
npm run deploy:health https://api.rutty.app -- --skip-auth --skip-database

# Only test database
npm run deploy:health https://api.rutty.app -- --skip-auth --skip-routes
```

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review deployment logs
3. Verify environment variables are set correctly
4. Run `npm run deploy:check` for pre-deployment validation
