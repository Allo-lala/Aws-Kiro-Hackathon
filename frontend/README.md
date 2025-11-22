# Rutty Frontend

Frontend web application for the Rutty Eco-Friendly Route Planner.

## Structure

```
frontend/
├── src/
│   ├── components/   # Reusable UI components
│   ├── pages/        # Page components
│   ├── services/     # API client services
│   ├── store/        # State management
│   ├── types/        # TypeScript type definitions
│   ├── index.ts      # Application entry point
│   ├── index.html    # HTML template
│   └── styles.css    # Global styles
├── dist/             # Built assets
├── package.json
├── tsconfig.json
├── webpack.config.js
└── vitest.config.ts
```

## Getting Started

### Installation

```bash
cd frontend
npm install
```

### Development

```bash
npm run dev
```

The application will open at `http://localhost:3000`

### Build

```bash
npm run build
```

### Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch
```

## Features

- Route planning with eco-friendly alternatives
- Carbon footprint visualization
- User preferences management
- Trip history tracking
- Real-time transportation updates

## API Integration

The frontend communicates with the backend API at `http://localhost:8080/api` in development mode.

Configure the API endpoint in production by updating the webpack proxy configuration.
