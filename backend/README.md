# Rutty Backend

Backend API server for the Rutty Eco-Friendly Route Planner.

## Structure

```
backend/
├── src/
│   ├── api/          # API controllers and route handlers
│   ├── services/     # Business logic services
│   ├── models/       # Data models and types
│   ├── middleware/   # Express middleware (auth, validation, etc.)
│   ├── config/       # Configuration files
│   ├── gateway/      # External API gateway
│   ├── utils/        # Utility functions
│   └── test-utils/   # Testing utilities
├── dist/             # Compiled JavaScript output
├── package.json
├── tsconfig.json
└── vitest.config.ts
```

## Getting Started

### Installation

```bash
cd backend
npm install
```

### Development

```bash
npm run dev
```

The server will start on `http://localhost:8080`

### Build

```bash
npm run build
```

### Production

```bash
npm start
```

### Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run property-based tests
npm run test:pbt
```

## API Endpoints

- `GET /api/health` - Health check
- `POST /api/routes/calculate` - Calculate eco-friendly routes
- `GET /api/user/:userId/preferences` - Get user preferences
- `PUT /api/user/:userId/preferences` - Update user preferences
- `POST /api/user/:userId/trips` - Record a trip
- `GET /api/user/:userId/metrics` - Get sustainability metrics

## Environment Variables

Create a `.env` file in the backend directory:

```
PORT=8080
NODE_ENV=development
```
