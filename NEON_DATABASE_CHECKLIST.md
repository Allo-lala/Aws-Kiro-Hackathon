# Neon Database Setup Checklist

## Getting Your Connection String

### Step 1: Access Neon Console
1. Go to https://console.neon.tech
2. Log in to your account
3. Select your project (or create one if needed)

### Step 2: Get Connection Details
1. In your project dashboard, look for **Connection Details**
2. You'll see different connection options:
   - **Direct connection** - Don't use this for Vercel
   - **Pooled connection** - ✅ Use this for Vercel serverless

### Step 3: Copy the Correct String

The pooled connection string should look like:
```
postgresql://username:password@ep-xxx-xxx.region.aws.neon.tech/database?sslmode=require
```

**Important parts:**
- `username` - Your database user (usually `neondb_owner` or similar)
- `password` - Your database password
- `ep-xxx-xxx.region.aws.neon.tech` - Your Neon endpoint
- `database` - Your database name (usually `neondb`)
- `?sslmode=require` - Required for secure connection

## Common Issues

### Issue: "password authentication failed"
**Causes:**
1. Wrong password in connection string
2. Using direct connection instead of pooled
3. Password contains special characters that need URL encoding

**Solutions:**
1. Reset your database password in Neon console
2. Make sure to use the **pooled connection** string
3. URL encode special characters:
   - `@` → `%40`
   - `#` → `%23`
   - `$` → `%24`
   - `%` → `%25`
   - `&` → `%26`

### Issue: "Connection timeout"
**Causes:**
1. Using direct connection (not pooled)
2. Network/firewall issues
3. Database is suspended (free tier)

**Solutions:**
1. Use pooled connection string
2. Check Neon dashboard - database should show "Active"
3. Free tier databases auto-suspend after inactivity - they wake up on first connection

### Issue: "Database does not exist"
**Causes:**
1. Wrong database name in connection string
2. Database was deleted

**Solutions:**
1. Check database name in Neon console
2. Create database if needed

## Vercel Environment Variable Setup

### Format
```bash
DATABASE_URL=postgresql://username:password@ep-xxx.region.aws.neon.tech/database?sslmode=require
```

### Where to Add
1. Go to Vercel Dashboard
2. Select your backend project: `aws-kiro-hackathon-ijw4`
3. Go to **Settings** → **Environment Variables**
4. Click **Add New**
5. Name: `DATABASE_URL`
6. Value: Your pooled connection string
7. Select environments: **Production**, **Preview**, **Development**
8. Click **Save**

## Testing Connection Locally

Before deploying, test your connection string locally:

```bash
cd backend

# Create a .env file with your connection string
echo "DATABASE_URL=your_connection_string_here" > .env

# Test the connection
npm run dev
```

If it connects successfully locally, it should work on Vercel too.

## Neon Free Tier Limits

Be aware of free tier limits:
- **Storage**: 512 MB
- **Compute**: Shared CPU
- **Auto-suspend**: After 5 minutes of inactivity
- **Active time**: 100 hours/month

For production, consider upgrading to a paid plan.

## Security Best Practices

1. ✅ Never commit `.env` files to git
2. ✅ Use different databases for development and production
3. ✅ Rotate passwords regularly
4. ✅ Use environment variables for all sensitive data
5. ✅ Enable SSL/TLS (sslmode=require)

## Need to Create a New Database?

If you need to set up a fresh Neon database:

1. Go to https://console.neon.tech
2. Click **New Project**
3. Choose a name and region
4. Click **Create Project**
5. Copy the connection string
6. Run migrations:
   ```bash
   cd backend
   DATABASE_URL="your_connection_string" npm run migration:run
   ```

## Verification

After setting up, verify:
- [ ] Connection string is in Vercel environment variables
- [ ] Using **pooled** connection (not direct)
- [ ] Connection string includes `?sslmode=require`
- [ ] Database is **Active** in Neon console
- [ ] Backend redeploys after adding env vars
- [ ] No authentication errors in Vercel logs
