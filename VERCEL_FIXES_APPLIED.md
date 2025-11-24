# Vercel Deployment Fixes Applied

## Issues Fixed

### 1. ✅ Frontend - Missing Output Directory
**Problem**: Vercel couldn't find the build output directory
**Solution**: Created `frontend/vercel.json` with:
- Output directory set to `dist` (matching webpack config)
- SPA routing rewrites configured

### 2. ✅ Backend - Logger Filesystem Error
**Problem**: Backend crashed with `ENOENT: no such file or directory, mkdir 'logs'`
**Root Cause**: Vercel serverless functions have read-only filesystems
**Solution**: Modified `backend/src/config/logger.ts` to:
- Only use console logging in production
- File logging only enabled in development or when `ENABLE_FILE_LOGGING=true`
- Prevents filesystem write attempts in serverless environment

### 3. ✅ Backend - Serverless Configuration
**Problem**: Backend wasn't configured for Vercel's serverless architecture
**Solution**: 
- Created `backend/vercel.json` with proper routing
- Created `backend/api/index.ts` as serverless entry point
- Configured to initialize database and services on cold start

## Files Modified

1. **frontend/vercel.json** (NEW)
   - Configures output directory
   - Sets up SPA routing

2. **backend/src/config/logger.ts** (MODIFIED)
   - Conditional file transport based on environment
   - Console-only logging in production

3. **backend/vercel.json** (NEW)
   - Vercel build configuration
   - Routes all requests to serverless function

4. **backend/api/index.ts** (NEW)
   - Serverless function entry point
   - Handles database initialization
   - Exports Express app handler

## Next Steps

### 1. Commit and Push Changes
```bash
git add .
git commit -m "Fix Vercel deployment issues for frontend and backend"
git push
```

### 2. Configure Backend Environment Variables in Vercel

Go to your backend Vercel project settings and add:

**Required:**
```
NODE_ENV=production
DATABASE_URL=postgresql://user:password@host:5432/database
JWT_SECRET=your-secure-jwt-secret-here
```

**Optional (for route calculation):**
```
ROUTE_API_PROVIDER=google_maps
ROUTE_API_KEY=your-api-key
ROUTE_CACHE_ENABLED=true
ROUTE_CACHE_TTL=60
```

### 3. Configure Frontend Environment Variables in Vercel

Go to your frontend Vercel project settings and add:

```
REACT_APP_API_URL=https://your-backend.vercel.app/api
NODE_ENV=production
```

### 4. Set Up Database

You'll need a PostgreSQL database. Options:

**Option A: Vercel Postgres** (Recommended)
1. Go to Vercel dashboard → Storage → Create Database
2. Select Postgres
3. Copy connection string to `DATABASE_URL` env var

**Option B: External Provider**
- Supabase (free tier available)
- Neon (serverless Postgres)
- Railway
- AWS RDS

### 5. Redeploy Both Projects

After adding environment variables:
1. Go to each project's Deployments tab
2. Click "Redeploy" on the latest deployment
3. Or push a new commit to trigger automatic deployment

### 6. Update CORS

Once backend is deployed, update the CORS configuration in `backend/src/middleware/cors.ts` to include your frontend URL:

```typescript
origin: [
  'https://your-frontend.vercel.app',
  'http://localhost:3000'
]
```

## Testing Checklist

After deployment:

- [ ] Frontend loads without errors
- [ ] Backend health check works: `https://your-backend.vercel.app/health`
- [ ] Backend API responds: `https://your-backend.vercel.app/api/auth/health`
- [ ] Frontend can connect to backend (check browser console)
- [ ] No CORS errors
- [ ] Authentication works
- [ ] Route planning works (if API keys configured)

## Troubleshooting

### Backend still crashing?
1. Check Vercel logs for the specific error
2. Verify all required environment variables are set
3. Ensure DATABASE_URL is valid and accessible from Vercel

### Frontend can't connect to backend?
1. Verify `REACT_APP_API_URL` is set correctly
2. Check CORS configuration in backend
3. Look for errors in browser console (F12)

### Database connection issues?
1. Ensure database allows connections from Vercel IPs
2. Check DATABASE_URL format: `postgresql://user:pass@host:5432/db`
3. Verify database is running and accessible

## Architecture Notes

**Frontend**: Static site with client-side routing
- Deployed as static files
- All routes redirect to index.html for React Router

**Backend**: Serverless functions
- Each request creates a new function instance (cold start)
- Database connections are reused when possible
- No persistent filesystem (logs to console only)
- Stateless architecture required
