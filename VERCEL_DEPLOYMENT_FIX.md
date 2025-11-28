# Vercel Deployment Fix Guide

## Issues Fixed

1. ✅ **Database Authentication Error** - Fixed connection configuration
2. ✅ **CORS Errors** - Updated CORS middleware and Vercel config

## Critical Steps to Fix Your Deployment

### 1. Fix Database Connection (URGENT)

Your backend is failing because the database credentials aren't set in Vercel. You need to add these environment variables in your Vercel project:

#### Go to Vercel Dashboard:
1. Open your backend project: `aws-kiro-hackathon-ijw4`
2. Go to **Settings** → **Environment Variables**
3. Add the following variables:

```bash
# Required Database Variables
DATABASE_URL=your_neon_database_url_here

# Example Neon URL format:
# postgresql://username:password@ep-xxx-xxx.region.aws.neon.tech/database?sslmode=require

# Additional Required Variables
JWT_SECRET=a13e170856cc6e0623ae657b7cc8748f
NODE_ENV=production
ALLOWED_ORIGINS=https://rutty.vercel.app

# Optional but Recommended
ROUTE_API_PROVIDER=geoapify
ROUTE_API_KEY=1b98641552864bc788a642b33d1be30d
GEOAPIFY_API_KEY=1b98641552864bc788a642b33d1be30d
```

#### How to Get Your Neon Database URL:
1. Go to your Neon dashboard: https://console.neon.tech
2. Select your project
3. Go to **Connection Details**
4. Copy the **Connection String** (it should look like: `postgresql://username:password@ep-xxx.region.aws.neon.tech/database`)
5. Make sure to use the **pooled connection** string for serverless

### 2. Redeploy Backend

After adding environment variables:
```bash
cd backend
git add .
git commit -m "Fix CORS and database configuration"
git push
```

Or trigger a redeploy in Vercel dashboard.

### 3. Verify CORS Configuration

The CORS middleware has been updated to:
- Allow `https://rutty.vercel.app` by default
- Allow all `.vercel.app` domains (for preview deployments)
- Properly handle OPTIONS preflight requests

### 4. Test the Deployment

After redeployment, test:
```bash
# Test backend health
curl https://aws-kiro-hackathon-ijw4.vercel.app/

# Test CORS
curl -H "Origin: https://rutty.vercel.app" \
     -H "Access-Control-Request-Method: POST" \
     -H "Access-Control-Request-Headers: Content-Type" \
     -X OPTIONS \
     https://aws-kiro-hackathon-ijw4.vercel.app/auth/login
```

## Common Issues

### Issue: "password authentication failed for user 'neondb_owner'"
**Solution**: Your DATABASE_URL environment variable is not set in Vercel or is incorrect.

### Issue: "No 'Access-Control-Allow-Origin' header"
**Solution**: 
1. Make sure ALLOWED_ORIGINS includes your frontend URL
2. Redeploy after updating environment variables
3. Clear browser cache

### Issue: Database connection timeout
**Solution**: 
1. Use Neon's **pooled connection string** (not direct)
2. Add `?sslmode=require` to the connection string
3. Increase DB_CONNECTION_TIMEOUT to 10000ms

## Environment Variables Checklist

Make sure these are set in Vercel:

- [ ] `DATABASE_URL` - Your Neon database connection string
- [ ] `JWT_SECRET` - Secret for JWT tokens
- [ ] `NODE_ENV` - Set to "production"
- [ ] `ALLOWED_ORIGINS` - Your frontend URL(s)
- [ ] `ROUTE_API_KEY` - Your Geoapify API key (optional)

## Next Steps

1. Add environment variables in Vercel dashboard
2. Redeploy backend
3. Test login from frontend
4. Monitor logs in Vercel dashboard

## Monitoring

Check logs in Vercel:
- Go to your project → Deployments
- Click on the latest deployment
- View **Function Logs** to see any errors

## Need Help?

If you still see errors:
1. Check Vercel function logs for specific error messages
2. Verify DATABASE_URL format matches Neon's connection string
3. Ensure frontend is using correct backend URL: `https://aws-kiro-hackathon-ijw4.vercel.app`
