# Deployment Guide

This guide provides comprehensive instructions for deploying the Eco-Friendly Route Planner application.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Configuration](#environment-configuration)
3. [Local Development Setup](#local-development-setup)
4. [Production Deployment](#production-deployment)
5. [Database Management](#database-management)
6. [Health Checks](#health-checks)
7. [Monitoring and Logging](#monitoring-and-logging)
8. [Troubleshooting](#troubleshooting)

## Prerequisites

### Required Software

- **Docker** (version 20.10+) and **Docker Compose** (version 2.0+)
- **Node.js** (version 18+) for local development
- **PostgreSQL** (version 14+) if running without Docker
- **Git** for version control

### Required Accounts and API Keys

- Google Maps API key OR Geoapify API key
- SendGrid API key OR AWS SES credentials
- Domain name (for production deployment)
- SSL certificate (for production deployment)

## Environment Configuration

### 1. Create Environment File

Copy the example environment file and configure it:

```bash
cp .env.example .env
```

### 2. Configure Required Variables

Edit `.env` and set the following critical variables:

```bash
# Security - MUST CHANGE IN PRODUCTION
JWT_SECRET=<generate-strong-random-secret>
SESSION_SECRET=<generate-strong-random-secret>
DB_PASSWORD=<strong-database-password>

# External APIs
GOOGLE_MAPS_API_KEY=<your-api-key>
# OR
GEOAPIFY_API_KEY=<your-api-key>

# Email Service
SENDGRID_API_KEY=<your-sendgrid-key>
EMAIL_FROM=noreply@yourdomain.com

# Production URLs
REACT_APP_API_URL=https://api.yourdomain.com
FRONTEND_URL=https://yourdomain.com
```

### 3. Generate Secure Secrets

Use these commands to generate secure secrets:

```bash
# Generate JWT secret
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Generate session secret
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Local Development Setup

### Using Docker Compose (Recommended)

1. **Start all services:**

```bash
docker-compose up -d
```

2. **View logs:**

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f postgres
```

3. **Stop services:**

```bash
docker-compose down
```

4. **Stop and remove volumes (clean slate):**

```bash
docker-compose down -v
```

### Without Docker

1. **Install dependencies:**

```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

2. **Set up PostgreSQL:**

```bash
# Create database
createdb eco_route_planner

# Run migrations
cd backend
npm run migrate
```

3. **Start services:**

```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend
cd frontend
npm run dev
```

## Production Deployment

### Option 1: Docker Deployment

#### 1. Build Production Images

```bash
# Build backend
docker build -t eco-route-backend:latest ./backend

# Build frontend
docker build -t eco-route-frontend:latest ./frontend
```

#### 2. Push to Container Registry

```bash
# Tag images
docker tag eco-route-backend:latest your-registry.com/eco-route-backend:latest
docker tag eco-route-frontend:latest your-registry.com/eco-route-frontend:latest

# Push images
docker push your-registry.com/eco-route-backend:latest
docker push your-registry.com/eco-route-frontend:latest
```

#### 3. Deploy to Server

```bash
# SSH to production server
ssh user@your-server.com

# Pull images
docker pull your-registry.com/eco-route-backend:latest
docker pull your-registry.com/eco-route-frontend:latest

# Run with docker-compose
docker-compose -f docker-compose.prod.yml up -d
```

### Option 2: Cloud Platform Deployment

#### AWS Elastic Beanstalk

1. Install EB CLI:
```bash
pip install awsebcli
```

2. Initialize and deploy:
```bash
eb init eco-route-planner
eb create production
eb deploy
```

#### Google Cloud Run

```bash
# Backend
gcloud run deploy eco-route-backend \
  --source ./backend \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated

# Frontend
gcloud run deploy eco-route-frontend \
  --source ./frontend \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated
```

#### Azure Container Instances

```bash
# Create resource group
az group create --name eco-route-rg --location eastus

# Deploy backend
az container create \
  --resource-group eco-route-rg \
  --name eco-route-backend \
  --image your-registry.com/eco-route-backend:latest \
  --dns-name-label eco-route-backend \
  --ports 3000

# Deploy frontend
az container create \
  --resource-group eco-route-rg \
  --name eco-route-frontend \
  --image your-registry.com/eco-route-frontend:latest \
  --dns-name-label eco-route-frontend \
  --ports 8080
```

### Option 3: Kubernetes Deployment

Create Kubernetes manifests:

```yaml
# k8s/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: eco-route-backend
spec:
  replicas: 3
  selector:
    matchLabels:
      app: eco-route-backend
  template:
    metadata:
      labels:
        app: eco-route-backend
    spec:
      containers:
      - name: backend
        image: your-registry.com/eco-route-backend:latest
        ports:
        - containerPort: 3000
        env:
        - name: NODE_ENV
          value: "production"
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: 3000
          initialDelaySeconds: 10
          periodSeconds: 5
```

Deploy:
```bash
kubectl apply -f k8s/
```

## Database Management

### Running Migrations

```bash
# Using Docker
docker-compose exec backend npm run migrate

# Without Docker
cd backend
npm run migrate
```

### Creating Backups

```bash
# Make scripts executable
chmod +x scripts/backup/*.sh

# Run backup
./scripts/backup/backup-database.sh
```

### Restoring from Backup

```bash
# Restore specific backup
./scripts/backup/restore-database.sh ./scripts/backup/backup_eco_route_planner_20231201_120000.sql.gz
```

### Automated Backups

Add to crontab for daily backups at 2 AM:

```bash
crontab -e

# Add this line:
0 2 * * * cd /path/to/project && ./scripts/backup/backup-database.sh >> /var/log/db-backup.log 2>&1
```

## Health Checks

### Endpoints

The application provides two health check endpoints:

#### 1. Liveness Probe (`/health`)

Basic health check to verify the application is running:

```bash
curl http://localhost:3000/health
```

Response:
```json
{
  "status": "healthy",
  "timestamp": "2023-12-01T12:00:00.000Z",
  "uptime": 3600,
  "database": "connected"
}
```

#### 2. Readiness Probe (`/ready`)

Detailed readiness check with system metrics:

```bash
curl http://localhost:3000/ready
```

Response:
```json
{
  "status": "ready",
  "timestamp": "2023-12-01T12:00:00.000Z",
  "checks": {
    "database": "ok",
    "memory": "ok"
  },
  "details": {
    "uptime": 3600,
    "memoryUsage": {
      "heapUsed": "45MB",
      "heapTotal": "128MB",
      "rss": "150MB"
    },
    "nodeVersion": "v18.17.0",
    "environment": "production"
  }
}
```

### Frontend Health Check

```bash
curl http://localhost:8080/health
```

## Monitoring and Logging

### Application Logs

Logs are stored in the `backend/logs` directory:

- `combined.log` - All application logs
- `error.log` - Error logs only

View logs:
```bash
# Real-time logs
tail -f backend/logs/combined.log

# Error logs
tail -f backend/logs/error.log

# Docker logs
docker-compose logs -f backend
```

### Log Levels

Configure log level in `.env`:
```bash
LOG_LEVEL=info  # Options: error, warn, info, debug
```

### Monitoring Metrics

Access admin dashboard for system metrics:
- Active users
- API usage
- Error rates
- Database connections
- Cache hit rates

## Troubleshooting

### Common Issues

#### 1. Database Connection Failed

**Symptoms:** Backend fails to start, "connection refused" errors

**Solutions:**
```bash
# Check if PostgreSQL is running
docker-compose ps postgres

# Check database logs
docker-compose logs postgres

# Verify environment variables
echo $DB_HOST $DB_PORT $DB_NAME

# Test connection manually
psql -h localhost -p 5432 -U postgres -d eco_route_planner
```

#### 2. Frontend Cannot Connect to Backend

**Symptoms:** API calls fail with CORS or network errors

**Solutions:**
```bash
# Verify backend is running
curl http://localhost:3000/health

# Check REACT_APP_API_URL in frontend
echo $REACT_APP_API_URL

# Verify CORS configuration in backend
# Check backend/.env for CORS_ORIGIN
```

#### 3. Docker Build Fails

**Symptoms:** Build errors during `docker build` or `docker-compose up`

**Solutions:**
```bash
# Clear Docker cache
docker system prune -a

# Rebuild without cache
docker-compose build --no-cache

# Check Docker disk space
docker system df
```

#### 4. High Memory Usage

**Symptoms:** Application becomes slow, OOM errors

**Solutions:**
```bash
# Check memory usage
docker stats

# Restart services
docker-compose restart

# Increase memory limits in docker-compose.yml
# Add under service definition:
# deploy:
#   resources:
#     limits:
#       memory: 1G
```

#### 5. Migration Failures

**Symptoms:** Database schema errors, migration errors on startup

**Solutions:**
```bash
# Check migration status
docker-compose exec backend npm run migrate:status

# Rollback last migration
docker-compose exec backend npm run migrate:rollback

# Re-run migrations
docker-compose exec backend npm run migrate
```

### Getting Help

1. Check application logs for detailed error messages
2. Verify all environment variables are set correctly
3. Ensure all external services (database, APIs) are accessible
4. Review the health check endpoints for system status
5. Consult the API documentation for endpoint-specific issues

## Security Checklist

Before deploying to production:

- [ ] Change all default passwords and secrets
- [ ] Use HTTPS for all connections
- [ ] Configure firewall rules to restrict access
- [ ] Enable rate limiting
- [ ] Set up automated backups
- [ ] Configure monitoring and alerting
- [ ] Review and update CORS settings
- [ ] Enable audit logging
- [ ] Implement API key rotation
- [ ] Set up SSL certificates
- [ ] Configure secure headers
- [ ] Review database permissions
- [ ] Enable database encryption at rest
- [ ] Set up VPN or private network for database access

## Maintenance

### Regular Tasks

- **Daily:** Monitor logs and error rates
- **Weekly:** Review system metrics and performance
- **Monthly:** Update dependencies and security patches
- **Quarterly:** Review and rotate API keys
- **Annually:** Review and update SSL certificates

### Updates and Patches

```bash
# Update dependencies
cd backend && npm update
cd frontend && npm update

# Rebuild and redeploy
docker-compose build
docker-compose up -d
```

## Support

For additional support:
- Review application logs
- Check health endpoints
- Consult API documentation
- Review GitHub issues
