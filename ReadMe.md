# Rutty: Your Green Journey Companion

An eco-friendly route planning application that helps users minimize their carbon footprint while traveling.

## Project Structure

```
src/
├── models/                 # Data models and interfaces
│   ├── Location.ts        # Location data structure
│   ├── RouteAlternative.ts # Route and segment definitions
│   ├── CarbonFootprint.ts # Carbon emission data structures
│   ├── TransportationMode.ts # Transportation mode definitions
│   ├── UserPreferences.ts # User settings and trip records
│   ├── common.ts          # Shared types and enums
│   └── index.ts           # Model exports
├── services/              # Business logic services
│   ├── interfaces/        # Service interface definitions
│   │   ├── IRoutePlanner.ts
│   │   ├── ICarbonCalculator.ts
│   │   ├── IUserTracker.ts
│   │   └── IRealtimeUpdater.ts
│   ├── RoutePlannerService.ts
│   ├── CarbonCalculatorService.ts
│   ├── UserTrackerService.ts
│   ├── RealtimeUpdaterService.ts
│   └── index.ts           # Service exports
├── api/                   # API controllers
│   ├── RouteController.ts
│   ├── CarbonController.ts
│   ├── UserController.ts
│   ├── RealtimeController.ts
│   └── index.ts           # API exports
├── test-utils/            # Testing utilities
│   ├── generators.ts      # Property-based test generators
│   └── index.ts           # Test utility exports
└── index.ts               # Main application entry point
```

## Core Interfaces

### IRoutePlanner
- `calculateRoutes()` - Calculate multiple route alternatives
- `getTransportationModes()` - Get available transportation modes
- `validateLocation()` - Validate and normalize locations

### ICarbonCalculator  
- `calculateEmissions()` - Calculate carbon footprint for routes
- `getEmissionFactor()` - Get emission factors by transportation mode
- `compareAlternatives()` - Compare and rank routes by eco-score

### IUserTracker
- `recordTrip()` - Record completed trips for tracking
- `calculateSavings()` - Calculate cumulative carbon savings
- `getUserPreferences()` - Manage user preferences
- `updateAccessibilityNeeds()` - Update accessibility requirements

### IRealtimeUpdater
- `subscribeToUpdates()` - Subscribe to real-time route updates
- `handleDisruption()` - Handle transportation disruptions
- `refreshRouteData()` - Refresh route data with latest information

## Development

### Setup
```bash
npm install
```

### Build
```bash
npm run build
```

### Test
```bash
npm test                    # Run all tests
npm run test:watch         # Run tests in watch mode
npm run test:pbt           # Run property-based tests only
```

### Development
```bash
npm run dev                # Run in development mode
```

## Deployment

### Quick Start

```bash
# Configure environment
cp .env.example .env
# Edit .env with your configuration

# Deploy with Docker
./scripts/deploy.sh dev     # Development
./scripts/deploy.sh prod    # Production
```

### Documentation

- **[Quick Start Guide](DEPLOYMENT_QUICK_START.md)** - Get up and running in minutes
- **[Full Deployment Guide](DEPLOYMENT_GUIDE.md)** - Comprehensive deployment documentation
- **[Backup Scripts](scripts/backup/README.md)** - Database backup and restore procedures

### Health Checks

- Backend: `http://localhost:3000/health`
- Backend Readiness: `http://localhost:3000/ready`
- Frontend: `http://localhost:8080/health`

## Testing Framework

The project uses Vitest for unit testing and fast-check for property-based testing. Property-based tests validate universal properties across randomly generated inputs to ensure correctness at scale.

## Requirements Coverage

This project structure addresses all requirements from the specification:
- **Requirements 1.1, 2.1, 3.1, 4.1, 5.1, 6.1**: Core interfaces and service architecture established
- **Modular Design**: Clear separation between models, services, and API layers
- **Testing Foundation**: Property-based testing framework configured with generators
- **TypeScript**: Full type safety and interface definitions
- **Extensibility**: Interface-based design allows for easy implementation swapping 