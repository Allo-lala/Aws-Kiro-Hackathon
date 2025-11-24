# Local Development Setup Guide

## Prerequisites

- Node.js 18+ and npm
- PostgreSQL 14+ (or use Docker)
- Git

## Quick Start (Recommended - Using Docker)

### 1. Start Everything with Docker Compose

```bash
# Start all services (database, backend, frontend)
docker-compose up -d

# Check logs
docker-compose logs -f

# Stop everything
docker-compose down
```

That's it! Your app will be running at:
- Frontend: http://localhost:8080
- Backend API: http://localhost:3000
- Database: localhost:5432

---

## Manual Setup (Without Docker)

### 1. Set Up PostgreSQL Database

**Option A: Install PostgreSQL locally**
```bash
# Ubuntu/Debian
sudo apt-get install postgresql postgresql-contrib

# macOS (using Homebrew)
brew install postgresql@14
brew services start postgresql@14

# Create database
psql -U postgres
CREATE DATABASE rutty_dev;
\q
```

**Option B: Use Docker for database only**
```bash
docker run -d \
  --name rutty-postgres \
  -e POSTGRES_DB=rutty_dev \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -p 5432:5432 \
  postgres:14-alpine
```

### 2. Set Up Backend

```bash
cd backend

# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Edit .env and update these values:
# DATABASE_URL=postgresql://postgres:postgres@localhost:5432/rutty_dev
# JWT_SECRET=your-random-secret-here-change-this
# PORT=8080

# Run database migrations
npm run migration:run

# Start backend in development mode
npm run dev
```

Backend will run at: http://localhost:8080

### 3. Set Up Frontend

Open a new terminal:

```bash
cd frontend

# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Edit .env:
# REACT_APP_API_URL=http://localhost:8080/api

# Start frontend in development mode
npm start
```

Frontend will run at: http://localhost:3000

---

## Environment Variables

### Backend (.env)

**Required:**
```env
PORT=8080
NODE_ENV=development
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/rutty_dev
JWT_SECRET=change-this-to-a-random-secret
```

**Optional (for route calculation):**
```env
ROUTE_API_PROVIDER=google_maps
ROUTE_API_KEY=your-google-maps-api-key
```

### Frontend (.env)

```env
REACT_APP_API_URL=http://localhost:8080/api
NODE_ENV=development
```

---

## Testing the Setup

### 1. Check Backend Health
```bash
curl http://localhost:8080/health
```

Should return:
```json
{
  "status": "healthy",
  "database": "connected"
}
```

### 2. Test API
```bash
# Register a user
curl -X POST http://localhost:8080/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test123!",
    "name": "Test User"
  }'
```

### 3. Open Frontend
Visit http://localhost:3000 (or http://localhost:8080 if using Docker)

---

## Common Issues

### Issue: Port already in use
```bash
# Find what's using the port
lsof -i :8080
lsof -i :3000

# Kill the process
kill -9 <PID>
```

### Issue: Database connection refused
- Check PostgreSQL is running: `pg_isready`
- Check DATABASE_URL in .env matches your setup
- If using Docker: `docker ps` to see if postgres container is running

### Issue: npm install fails
```bash
# Clear cache and try again
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

### Issue: Migration fails
```bash
# Reset database
psql -U postgres
DROP DATABASE rutty_dev;
CREATE DATABASE rutty_dev;
\q

# Run migrations again
cd backend
npm run migration:run
```

---

## Development Workflow

### Running Tests
```bash
# Backend tests
cd backend
npm test

# Frontend tests
cd frontend
npm test
```

### Database Migrations
```bash
cd backend

# Create a new migration
npm run migration:create -- src/migrations/YourMigrationName

# Generate migration from entity changes
npm run migration:generate -- src/migrations/YourMigrationName

# Run migrations
npm run migration:run

# Revert last migration
npm run migration:revert
```

### Code Formatting
```bash
# Backend
cd backend
npm run format
npm run lint

# Frontend
cd frontend
npm run format
npm run lint
```

---

## Next Steps

Once everything is running locally:

1. ✅ Test user registration and login
2. ✅ Test route planning features
3. ✅ Make any needed changes
4. ✅ Commit and push to GitHub
5. ✅ Deploy to Vercel with proper environment variables

---

## Stopping Services

### Docker Compose
```bash
docker-compose down
```

### Manual Setup
- Press `Ctrl+C` in each terminal running dev servers
- Stop PostgreSQL:
  - Ubuntu/Debian: `sudo systemctl stop postgresql`
  - macOS: `brew services stop postgresql@14`
  - Docker: `docker stop rutty-postgres`
