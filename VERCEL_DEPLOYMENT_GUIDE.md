# Vercel Frontend Deployment Guide

## Current Status
✅ Frontend deployed to Vercel
⚠️ React app not rendering (showing "skip to main content")
✅ Backend logger fixed for serverless environment
✅ Backend Vercel configuration created

## Next Steps

### 1. Configure Environment Variables in Vercel

1. Go to your Vercel project dashboard
2. Navigate to **Settings** → **Environment Variables**
3. Add the following variables:

```
REACT_APP_API_URL=https://your-backend-api-url.com/api
NODE_ENV=production
```

**Important:** After adding environment variables, you must **redeploy** for them to take effect.

### 2. Troubleshoot React App

Open your deployed site and check the browser console (F12 → Console tab) for errors. Common issues:

- **API URL not set**: The app might be trying to connect to localhost
- **CORS errors**: Backend needs to allow requests from your Vercel domain
- **JavaScript errors**: Check for any runtime errors preventing React from mounting

### 3. Deploy Backend

Your frontend needs a backend API to function. Options:

#### Option A: Deploy Backend to AWS (Recommended for your setup)
You have AWS deployment configurations ready. Deploy using:
```bash
cd aws-deployment
./scripts/deploy-infrastructure.sh
```

#### Option B: Deploy Backend to Render/Railway/Heroku
Quick alternative for testing:
1. Create account on Render.com or Railway.app
2. Connect your GitHub repo
3. Deploy the `backend` directory
4. Copy the deployed API URL
5. Update `REACT_APP_API_URL` in Vercel

### 4. Update CORS Settings

Once backend is deployed, update backend CORS to allow your Vercel domain:

In `backend/src/index.ts` or similar, ensure CORS allows:
```typescript
cors({
  origin: [
    'https://your-vercel-app.vercel.app',
    'http://localhost:3000' // for local development
  ]
})
```

### 5. Test the Full Flow

1. Open browser console (F12)
2. Visit your Vercel URL
3. Check for:
   - React app renders (you should see the login/home page)
   - No console errors
   - API calls work (check Network tab)

## Quick Verification Checklist

- [ ] Environment variables added in Vercel
- [ ] Redeployed after adding env vars
- [ ] Backend deployed and accessible
- [ ] Backend CORS configured for Vercel domain
- [ ] Browser console shows no errors
- [ ] React app renders properly

## Common Issues

### Issue: Still seeing "skip to main content"
**Solution**: Check browser console for JavaScript errors. The React app isn't mounting.

### Issue: CORS errors in console
**Solution**: Update backend CORS settings to include your Vercel domain.

### Issue: API calls fail
**Solution**: Verify `REACT_APP_API_URL` is set correctly and backend is running.

### Issue: Changes not reflected
**Solution**: Redeploy in Vercel after making configuration changes.

### Issue: Backend crashes with "ENOENT: no such file or directory, mkdir 'logs'"
**Solution**: ✅ FIXED - Logger now only writes to files in development mode. In production (Vercel), it only logs to console.
