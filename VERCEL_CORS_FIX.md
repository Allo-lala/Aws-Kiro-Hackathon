# Vercel CORS Fix - Deployment Guide

## Problem
Frontend at `https://rutty.vercel.app` cannot access backend at `https://aws-kiro-hackathon-2an4.vercel.app` due to CORS policy.

## Solution

### Step 1: Add Environment Variable on Vercel Backend

1. Go to https://vercel.com/dashboard
2. Select your backend project: `aws-kiro-hackathon-2an4`
3. Go to **Settings** → **Environment Variables**
4. Add this variable:
   - **Key**: `ALLOWED_ORIGINS`
   - **Value**: `https://rutty.vercel.app`
   - **Environments**: Check all (Production, Preview, Development)
5. Click **Save**

### Step 2: Verify Other Required Environment Variables

Make sure these are also set in Vercel:

- `DATABASE_URL` - Your Neon PostgreSQL connection string
- `JWT_SECRET` - Your JWT secret key
- `ROUTE_API_PROVIDER` - `geoapify`
- `ROUTE_API_KEY` - Your Geoapify API key
- `GEOAPIFY_API_KEY` - Your Geoapify API key
- `NODE_ENV` - `production`

### Step 3: Deploy Backend

Option A - Push to Git (Recommended):
```bash
cd backend
git add .
git commit -m "Fix CORS configuration for production"
git push
```

Option B - Manual Redeploy:
1. Go to **Deployments** tab in Vercel
2. Click the three dots (⋯) on latest deployment
3. Click **Redeploy**

### Step 4: Wait for Deployment

- Wait 1-2 minutes for deployment to complete
- Check deployment logs for any errors
- Look for the log message showing allowed origins

### Step 5: Test

1. Go to https://rutty.vercel.app
2. Try to log in
3. Check browser console - CORS error should be gone

## What Was Changed

### Updated Files:
- `backend/src/middleware/cors.ts` - Improved CORS handling with better logging
- `backend/.env` - Added ALLOWED_ORIGINS (for local development)
- `backend/.env.example` - Added ALLOWED_ORIGINS example

### Key Improvements:
- Better origin validation with trimming
- Improved preflight OPTIONS handling
- Added logging for rejected origins (helps debugging)
- Added Access-Control-Max-Age header for better performance

## Troubleshooting

### If CORS error persists:

1. **Check Vercel Logs**
   - Go to your backend deployment in Vercel
   - Click on the deployment
   - Check the **Functions** logs
   - Look for "CORS: Rejected origin" messages

2. **Verify Environment Variable**
   - Go to Settings → Environment Variables
   - Make sure `ALLOWED_ORIGINS` is exactly: `https://rutty.vercel.app`
   - No trailing slashes, no extra spaces

3. **Clear Browser Cache**
   - Hard refresh: Ctrl+Shift+R (Windows/Linux) or Cmd+Shift+R (Mac)
   - Or open in incognito/private window

4. **Check Frontend URL**
   - Make sure `frontend/.env` has: `REACT_APP_API_URL=https://aws-kiro-hackathon-2an4.vercel.app/api`
   - Rebuild and redeploy frontend if changed

### Alternative: Allow All Origins (Not Recommended for Production)

If you need a quick fix for testing, you can temporarily allow all origins:

In Vercel environment variables, set:
- **Key**: `NODE_ENV`
- **Value**: `development`

This will allow all origins, but is NOT secure for production use.

## Next Steps After Fix

Once CORS is working:
1. Test all API endpoints (login, register, routes, etc.)
2. Set up proper error monitoring
3. Configure rate limiting if needed
4. Set up database backups
