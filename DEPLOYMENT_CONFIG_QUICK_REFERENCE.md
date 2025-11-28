# Deployment Configuration Quick Reference

## File Location
- **Main Config**: `deployment-config.json`
- **Schema**: `deployment-config.schema.json`
- **Full Documentation**: `DEPLOYMENT_CONFIG_README.md`

## Quick Setup

### 1. Copy Template Values
Replace placeholder values in `deployment-config.json`:
- `your-xxx-here` → actual values
- `prj_xxxxxxxxxxxxx` → your Vercel project ID
- `ep-xxx.region.aws.neon.tech` → your Neon database host

### 2. Generate Secure Secrets
```bash
# Generate JWT_SECRET
openssl rand -base64 32

# Use different secrets for each environment!
```

### 3. Get API Keys
- **Geoapify**: https://www.geoapify.com/ (free tier available)
- **SendGrid** (optional): https://sendgrid.com/

### 4. Get Neon Connection String
1. Go to https://console.neon.tech
2. Select your project
3. Copy **Pooled connection** string
4. Ensure it includes `?sslmode=require`

### 5. Get Vercel Project ID
1. Go to https://vercel.com/dashboard
2. Select project → Settings → General
3. Copy "Project ID" (format: `prj_xxxxxxxxxxxxx`)

## Critical Variables Checklist

For each environment, ensure these are set:

- [ ] `DATABASE_URL` - PostgreSQL connection string
- [ ] `JWT_SECRET` - Secure random string (32+ chars)
- [ ] `BASE_URL` - Application base URL
- [ ] `GEOAPIFY_API_KEY` - Location services API key
- [ ] `ALLOWED_ORIGINS` - CORS allowed origins
- [ ] `REACT_APP_API_URL` - Frontend API endpoint
- [ ] `REACT_APP_GEOAPIFY_API_KEY` - Frontend API key

## Environment-Specific Values

### Production
```json
{
  "databaseUrl": "postgresql://user:pass@ep-xxx.region.aws.neon.tech/db?sslmode=require",
  "apiBaseUrl": "https://your-app.vercel.app",
  "frontendUrl": "https://your-frontend.vercel.app",
  "vercelProjectId": "prj_xxxxxxxxxxxxx"
}
```

### Staging
```json
{
  "databaseUrl": "postgresql://user:pass@ep-xxx.region.aws.neon.tech/db_staging?sslmode=require",
  "apiBaseUrl": "https://staging-your-app.vercel.app",
  "frontendUrl": "https://staging-your-frontend.vercel.app",
  "vercelProjectId": "prj_staging_xxxxxxxx"
}
```

### Development
```json
{
  "databaseUrl": "postgresql://postgres:postgres@localhost:5432/rutty_dev",
  "apiBaseUrl": "http://localhost:8080",
  "frontendUrl": "http://localhost:3000"
}
```

## Common Commands

```bash
# Initialize database
npm run db:init -- --env=production

# Verify deployment
npm run deploy:verify -- --env=production

# Setup Vercel environment
npm run vercel:setup-env -- --env=production

# Run health checks
npm run deploy:health -- --env=production

# Pre-deployment checklist
npm run deploy:check -- --env=production
```

## Validation

Validate your configuration:
```bash
# Check JSON syntax
node -e "JSON.parse(require('fs').readFileSync('deployment-config.json', 'utf8')); console.log('✓ Valid JSON')"

# Validate against schema (if ajv-cli installed)
ajv validate -s deployment-config.schema.json -d deployment-config.json
```

## Security Reminders

⚠️ **NEVER commit actual secrets to git!**

✅ Use placeholder values in version control
✅ Store actual secrets in:
  - Vercel environment variables
  - Local `.env` files (gitignored)
  - Secure secret management system

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Database connection fails | Check connection string format and SSL mode |
| JWT errors | Verify JWT_SECRET is set and consistent |
| CORS errors | Add frontend URL to ALLOWED_ORIGINS |
| API key errors | Verify keys are valid and have quota |
| Vercel deployment fails | Check all required env vars are set |

## Need More Help?

- **Full Documentation**: See `DEPLOYMENT_CONFIG_README.md`
- **Deployment Guide**: See `DEPLOYMENT_WORKFLOW.md`
- **Database Setup**: See `backend/DATABASE_SETUP.md`
- **API Reference**: See `backend/API_ENDPOINTS.md`
