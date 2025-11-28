# Quick Fix Checklist for Vercel Deployment

## 🚨 IMMEDIATE ACTIONS REQUIRED

### 1. Backend Environment Variables (CRITICAL)

Go to Vercel Dashboard → `aws-kiro-hackathon-ijw4` → Settings → Environment Variables

Add these variables:

```bash
DATABASE_URL=<your_neon_connection_string>
JWT_SECRET=a13e170856cc6e0623ae657b7cc8748f
NODE_ENV=production
ALLOWED_ORIGINS=https://rutty.vercel.app
ROUTE_API_KEY=1b98641552864bc788a642b33d1be30d
GEOAPIFY_API_KEY=1b98641552864bc788a642b33d1be30d
```

**Where to get DATABASE_URL:**
1. Go to https://console.neon.tech
2. Select your project
3. Click "Connection Details"
4. Copy the **Pooled connection** string
5. It should look like: `postgresql://username:password@ep-xxx.region.aws.neon.tech/database?sslmode=require`

### 2. Frontend Environment Variables

Go to Vercel Dashboard → `rutty` → Settings → Environment Variables

Add this variable:

```bash
REACT_APP_API_URL=https://aws-kiro-hackathon-ijw4.vercel.app
```

### 3. Redeploy Both Projects

After adding environment variables:

**Option A: Via Vercel Dashboard**
1. Go to Deployments tab
2. Click "..." on latest deployment
3. Click "Redeploy"

**Option B: Via Git Push**
```bash
# Backend
cd backend
git add .
git commit -m "Fix deployment configuration"
git push

# Frontend  
cd ../frontend
git add .
git commit -m "Update backend URL"
git push
```

## ✅ Verification Steps

### 1. Check Backend Health
```bash
curl https://aws-kiro-hackathon-ijw4.vercel.app/
```
Should return: `{"message":"Rutty API is running"}`

### 2. Check CORS
```bash
curl -I -X OPTIONS \
  -H "Origin: https://rutty.vercel.app" \
  -H "Access-Control-Request-Method: POST" \
  https://aws-kiro-hackathon-ijw4.vercel.app/auth/login
```
Should include: `Access-Control-Allow-Origin: https://rutty.vercel.app`

### 3. Test Login
Open https://rutty.vercel.app and try logging in.

## 🔍 Troubleshooting

### Still seeing database errors?
- Verify DATABASE_URL is correct in Vercel
- Make sure you're using the **pooled** connection string from Neon
- Check that the database exists and is accessible

### Still seeing CORS errors?
- Clear browser cache
- Check that ALLOWED_ORIGINS includes your frontend URL
- Verify both projects have been redeployed after env var changes

### Login still not working?
- Open browser DevTools → Network tab
- Try logging in
- Check the request to `/auth/login`
- Look at the response status and error message
- Share the error details

## 📝 What Was Fixed

1. ✅ Updated CORS middleware to allow Vercel domains
2. ✅ Fixed Vercel.json to properly handle CORS headers
3. ✅ Updated frontend to point to correct backend URL
4. ✅ Improved database connection configuration
5. ✅ Added proper environment variable documentation

## 🎯 Expected Result

After completing these steps:
- Backend should connect to Neon database successfully
- Frontend should be able to make API calls without CORS errors
- Login should work properly
- No more 500 errors in backend logs
