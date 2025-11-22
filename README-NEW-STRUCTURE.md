# Rutty: Your Green Journey Companion

Eco-friendly route planning application with backend/frontend separation.

## Project Structure

This project is now organized into separate backend and frontend applications:

```
rutty-eco-route-planner/
├── backend/          # Node.js/Express API server
│   ├── src/
│   │   ├── api/          # API controllers
│   │   ├── services/     # Business logic
│   │   ├── models/       # Data models
│   │   ├── middleware/   # Express middleware
│   │   ├── config/       # Configuration
│   │   └── ...
│   ├── package.json
│   └── tsconfig.json
│
├── frontend/         # Web application
│   ├── src/
│   │   ├── components/   # UI components
│   │   ├── pages/        # Page components
│   │   ├── services/     # API clients
│   │   ├── store/        # State management
│   │   └── types/        # Type definitions
│   ├── package.json
│   └── tsconfig.json
│
├── src/              # Legacy source (to be removed after migration)
└── .kiro/            # Kiro specs and configuration
```

## Getting Started

### Backend Setup

```bash
cd backend
npm install
npm run dev
```

Backend runs on `http://localhost:8080`

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

Frontend runs on `http://localhost:3000`

### Running Both Services

You can run both services simultaneously in separate terminals, or use a process manager like `concurrently`.

## Development Workflow

1. **Backend Development**: Work in the `backend/` directory
   - API endpoints in `src/api/`
   - Business logic in `src/services/`
   - Data models in `src/models/`

2. **Frontend Development**: Work in the `frontend/` directory
   - UI components in `src/components/`
   - Pages in `src/pages/`
   - API integration in `src/services/`

3. **Independent Deployment**: Each service can be built and deployed separately
   - Backend: `cd backend && npm run build && npm start`
   - Frontend: `cd frontend && npm run build` (serve static files)

## Testing

### Backend Tests
```bash
cd backend
npm test
npm run test:pbt  # Property-based tests
```

### Frontend Tests
```bash
cd frontend
npm test
```

## Migration Notes

The existing `src/` directory contains the original monolithic structure. The code has been copied to the new `backend/` and `frontend/` directories. Once the migration is complete and tested, the old `src/` directory can be removed.

## Next Steps

1. ✅ Create backend/frontend directory structure
2. ✅ Set up separate package.json and tsconfig.json files
3. ✅ Configure build scripts for independent deployment
4. 🔄 Set up PostgreSQL database (Task 2)
5. 🔄 Implement authentication service (Task 3)
6. 🔄 Integrate real route calculation API (Task 7)

## Documentation

- [Backend README](./backend/README.md)
- [Frontend README](./frontend/README.md)
- [Requirements](./kiro/specs/user-auth-and-real-routing/requirements.md)
- [Design](./kiro/specs/user-auth-and-real-routing/design.md)
