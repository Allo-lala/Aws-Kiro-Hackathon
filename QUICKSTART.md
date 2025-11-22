# Quick Start Guide

Get Rutty up and running in minutes!

## Prerequisites

- Node.js 18+ installed
- npm or yarn package manager

## Installation

### Option 1: Install All Dependencies at Once

```bash
npm run install:all
```

This will install dependencies for the root project, backend, and frontend.

### Option 2: Install Separately

```bash
# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

## Running the Application

### Option 1: Run Both Services Together

From the root directory:

```bash
npm run dev
```

This will start:
- Backend API server on `http://localhost:8080`
- Frontend dev server on `http://localhost:3000`

### Option 2: Run Services Separately

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

## Verify Installation

1. **Backend Health Check:**
   Open `http://localhost:8080/api/health` in your browser
   You should see a JSON response with system health status

2. **Frontend:**
   Open `http://localhost:3000` in your browser
   You should see the Rutty application interface

## Testing

### Run All Tests

```bash
npm test
```

### Run Backend Tests Only

```bash
npm run test:backend
```

### Run Frontend Tests Only

```bash
npm run test:frontend
```

### Run Property-Based Tests

```bash
npm run test:pbt
```

## Building for Production

### Build Both Services

```bash
npm run build
```

### Build Separately

```bash
# Build backend
npm run build:backend

# Build frontend
npm run build:frontend
```

## Project Structure

```
rutty-eco-route-planner/
├── backend/          # API server (Node.js/Express)
├── frontend/         # Web app (TypeScript/Webpack)
├── src/              # Legacy code (to be removed)
└── .kiro/            # Specs and configuration
```

## Next Steps

1. ✅ Project structure created
2. 🔄 Set up PostgreSQL database (see Task 2)
3. 🔄 Implement user authentication (see Task 3)
4. 🔄 Integrate real routing API (see Task 7)

## Troubleshooting

### Port Already in Use

If port 8080 or 3000 is already in use:

**Backend:**
```bash
PORT=8081 npm run dev:backend
```

**Frontend:**
Edit `frontend/webpack.config.js` and change the `devServer.port` value

### Module Not Found Errors

Make sure all dependencies are installed:
```bash
npm run install:all
```

### Build Errors

Clear node_modules and reinstall:
```bash
rm -rf node_modules backend/node_modules frontend/node_modules
npm run install:all
```

## Documentation

- [Backend README](./backend/README.md)
- [Frontend README](./frontend/README.md)
- [Deployment Guide](./DEPLOYMENT.md)
- [Requirements](./kiro/specs/user-auth-and-real-routing/requirements.md)
- [Design Document](./kiro/specs/user-auth-and-real-routing/design.md)
