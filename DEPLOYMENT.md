# Deployment Guide

This guide explains how to deploy the backend and frontend services independently.

## Backend Deployment

### Build

```bash
cd backend
npm install
npm run build
```

The compiled JavaScript will be in `backend/dist/`

### Run

```bash
cd backend
npm start
```

### Environment Variables

Set the following environment variables in your deployment environment:

- `PORT` - Server port (default: 8080)
- `NODE_ENV` - Environment (production/development)
- Database credentials (to be added in Task 2)
- JWT secret (to be added in Task 3)
- External API keys (to be added in Task 7)

### Docker Deployment (Future)

A Dockerfile will be created in Task 18 for containerized deployment.

## Frontend Deployment

### Build

```bash
cd frontend
npm install
npm run build
```

The static assets will be in `frontend/dist/`

### Serve

The frontend can be served using any static file server:

**Using Nginx:**
```nginx
server {
    listen 80;
    server_name your-domain.com;
    
    root /path/to/frontend/dist;
    index index.html;
    
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    location /api {
        proxy_pass http://backend-server:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

**Using a CDN:**
Upload the contents of `frontend/dist/` to your CDN provider (AWS S3, Cloudflare, Netlify, etc.)

### Environment Configuration

Update the API endpoint in the frontend build:
- Development: `http://localhost:8080/api`
- Production: `https://api.your-domain.com/api`

## Independent Deployment Benefits

1. **Scalability**: Scale backend and frontend independently based on load
2. **Flexibility**: Deploy to different hosting providers
3. **Development**: Teams can work on backend and frontend separately
4. **Updates**: Deploy updates to one service without affecting the other
5. **Cost Optimization**: Use appropriate hosting for each service type

## Deployment Checklist

### Backend
- [ ] Build TypeScript to JavaScript
- [ ] Set environment variables
- [ ] Configure database connection
- [ ] Set up health check monitoring
- [ ] Configure logging
- [ ] Set up SSL/TLS certificates

### Frontend
- [ ] Build production bundle
- [ ] Configure API endpoint
- [ ] Set up CDN or static hosting
- [ ] Configure CORS on backend
- [ ] Set up SSL/TLS certificates
- [ ] Configure caching headers

## Monitoring

### Backend
- Monitor `/api/health` endpoint
- Track API response times
- Monitor database connections
- Track error rates

### Frontend
- Monitor page load times
- Track JavaScript errors
- Monitor API call success rates
- Track user engagement metrics
