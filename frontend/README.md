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

### Prerequisites

Before running the application, you'll need to obtain a free Geoapify API key for location autocomplete functionality:

1. Visit [Geoapify](https://www.geoapify.com/)
2. Sign up for a free account
3. Navigate to your dashboard and create a new API key
4. Copy the API key

### Installation

```bash
cd frontend
npm install
```

### Configuration

1. Copy the `.env.example` file to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Open `.env` and replace `your_api_key_here` with your actual Geoapify API key:
   ```
   REACT_APP_GEOAPIFY_API_KEY=your_actual_api_key_here
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

## Test users
👤 Admin: admin@rutty.com / password123
👤Admin: admin@example.com / AdminPassword123!
👤 User 1: user1@example.com / password123
👤 User 2: user2@example.com / password123
👤 Eco Warrior: eco.warrior@example.com / password123
👤User: test@example.com / TestPassword123!
👤User: user@example.com / UserPassword123!