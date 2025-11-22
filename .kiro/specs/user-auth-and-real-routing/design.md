# Design Document

## Overview

This design enhances the Eco-Friendly Route Planner with production-ready authentication, real-time route calculation via external APIs, administrative capabilities, and persistent storage. The system adopts a clear backend/frontend separation with PostgreSQL as the data store, JWT-based authentication, and integration with Google Maps API or Geoapify for actual route calculations.

## Architecture

The system follows a three-tier architecture with distinct backend and frontend layers:

**Frontend Layer (React/TypeScript):**
- Single-page application (SPA) with React for UI components
- Redux or Context API for state management
- Axios for HTTP client communication with backend
- Protected routes requiring authentication
- Admin dashboard with restricted access
- Responsive design for mobile and desktop

**Backend Layer (Node.js/Express/TypeScript):**
- RESTful API server handling all business logic
- JWT-based authentication middleware
- Service layer for route calculation, carbon footprint, user management
- Integration layer for external APIs (Google Maps/Geoapify)
- Database access layer with TypeORM or Prisma
- Request validation and error handling middleware

**Data Layer (PostgreSQL):**
- Relational database with normalized schema
- User accounts, preferences, trip history tables
- Session management and audit logging
- Database migrations for schema versioning
- Connection pooling for performance

**External Services:**
- Google Maps API or Geoapify for route calculation
- Email service (SendGrid/AWS SES) for verification emails
- Optional: Redis for session caching and rate limiting

## Components and Interfaces

### Authentication Service
**Interface:** `IAuthService`
- `register(email, password, profile): Promise<User>`
- `login(email, password): Promise<{ user: User, token: string }>`
- `verifyEmail(token): Promise<boolean>`
- `resetPassword(email): Promise<void>`
- `validateToken(token): Promise<User>`
- `logout(userId): Promise<void>`

### User Service
**Interface:** `IUserService`
- `getUserById(userId): Promise<User>`
- `updatePreferences(userId, preferences): Promise<UserPreferences>`
- `getTripHistory(userId, filters): Promise<Trip[]>`
- `deleteUserData(userId): Promise<void>`
- `getUserStats(userId): Promise<UserStatistics>`

### Route Calculation Service (Enhanced)
**Interface:** `IRouteCalculationService`
- `calculateRealRoutes(origin, destination, modes, preferences): Promise<RouteAlternative[]>`
- `queryExternalAPI(origin, destination, mode): Promise<ExternalRouteData>`
- `transformAPIResponse(externalData): RouteAlternative`
- `getCachedRoute(origin, destination, mode): Promise<RouteAlternative | null>`
- `cacheRoute(route): Promise<void>`

### Admin Service
**Interface:** `IAdminService`
- `getSystemMetrics(): Promise<SystemMetrics>`
- `listUsers(pagination, filters): Promise<PaginatedUsers>`
- `getUserDetails(userId): Promise<UserDetails>`
- `disableUser(userId, reason): Promise<void>`
- `enableUser(userId): Promise<void>`
- `getAuditLogs(filters): Promise<AuditLog[]>`
- `updateSystemConfig(config): Promise<void>`

### Database Service
**Interface:** `IDatabaseService`
- `connect(): Promise<void>`
- `disconnect(): Promise<void>`
- `transaction<T>(callback): Promise<T>`
- `runMigrations(): Promise<void>`
- `healthCheck(): Promise<boolean>`

## Data Models

### User (Database Entity)
```typescript
interface User {
  id: string; // UUID
  email: string; // unique, indexed
  passwordHash: string;
  emailVerified: boolean;
  isActive: boolean;
  isAdmin: boolean;
  failedLoginAttempts: number;
  accountLockedUntil: Date | null;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt: Date | null;
  preferences?: UserPreferences;
  trips?: Trip[];
}
```

### Trip (Database Entity)
```typescript
interface Trip {
  id: string; // UUID
  userId: string; // foreign key
  origin: Location;
  destination: Location;
  selectedRoute: RouteAlternative;
  actualTransportationMode: TransportationMode;
  carbonSavings: number; // kg CO2
  distance: number; // miles
  duration: number; // minutes
  completedAt: Date;
  createdAt: Date;
}
```

### Session (Database Entity)
```typescript
interface Session {
  id: string; // UUID
  userId: string; // foreign key
  token: string; // JWT, indexed
  expiresAt: Date;
  createdAt: Date;
  ipAddress: string;
  userAgent: string;
}
```

### AuditLog (Database Entity)
```typescript
interface AuditLog {
  id: string; // UUID
  adminId: string; // foreign key
  action: string; // e.g., 'USER_DISABLED', 'CONFIG_UPDATED'
  targetUserId: string | null;
  details: Record<string, any>; // JSON
  timestamp: Date;
  ipAddress: string;
}
```

### ExternalRouteData (API Response)
```typescript
interface ExternalRouteData {
  provider: 'google_maps' | 'geoapify';
  routes: {
    legs: {
      distance: { value: number; text: string };
      duration: { value: number; text: string };
      steps: Array<{
        instruction: string;
        distance: number;
        duration: number;
        polyline: string;
      }>;
    }[];
    overview_polyline: string;
  }[];
  status: string;
}
```

### SystemMetrics (Admin Dashboard)
```typescript
interface SystemMetrics {
  activeUsers: number;
  totalUsers: number;
  apiCallsToday: number;
  apiQuotaRemaining: number;
  errorRate: number; // percentage
  averageResponseTime: number; // ms
  databaseConnections: number;
  cacheHitRate: number; // percentage
  timestamp: Date;
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*


### Property Reflection

After analyzing all acceptance criteria, several properties can be consolidated:
- Registration and email verification properties (1.1, 1.4, 1.5) can be combined into a comprehensive user registration flow property
- Login validation properties (2.1, 2.2) cover different cases and should remain separate
- Session management properties (2.4, 2.5) can be combined into session lifecycle validation
- Data persistence properties (3.1, 3.2) are both round-trip validations and can be unified
- Admin dashboard display properties (5.1, 5.2, 5.3, 5.4) all test completeness of displayed data and can be consolidated

**Property 1: User registration creates valid accounts**
*For any* valid email and password combination, registering a new user should create an account in the database with properly hashed password and trigger a verification email
**Validates: Requirements 1.1, 1.3, 1.4**

**Property 2: Duplicate email rejection**
*For any* email address that already exists in the system, attempting to register with that email should be rejected
**Validates: Requirements 1.2**

**Property 3: Email verification activates accounts**
*For any* unverified user account, completing email verification should activate the account for full system access
**Validates: Requirements 1.5**

**Property 4: Valid login creates authenticated session**
*For any* registered user with valid credentials, logging in should create a session with a valid JWT token and 24-hour expiration
**Validates: Requirements 2.1, 2.4**

**Property 5: Invalid login increments failure counter**
*For any* login attempt with invalid credentials, the system should reject the attempt and increment the failed login counter
**Validates: Requirements 2.2**

**Property 6: Expired sessions require re-authentication**
*For any* expired session token, attempting to access protected operations should fail and require re-authentication
**Validates: Requirements 2.5**

**Property 7: User data persistence round-trip**
*For any* user preference update or trip completion, the data should be immediately retrievable from the database with all fields intact
**Validates: Requirements 3.1, 3.2**

**Property 8: Cross-device data consistency**
*For any* user logging in from different sessions, the retrieved preference and history data should be identical
**Validates: Requirements 3.3**

**Property 9: User data isolation**
*For any* two distinct users, one user should never be able to retrieve or modify the other user's data
**Validates: Requirements 3.4**

**Property 10: Route API integration correctness**
*For any* route request with valid origin and destination, the backend should call the external Route_API with correct coordinates and transform the response into valid RouteAlternative format
**Validates: Requirements 4.1, 4.2**

**Property 11: Multi-mode route aggregation**
*For any* route request with multiple transportation modes, the backend should query the Route_API for each mode and return aggregated results
**Validates: Requirements 4.3**

**Property 12: Admin dashboard data completeness**
*For any* admin dashboard view (system metrics, user list, user details, error logs), all required fields and data should be present and correctly formatted
**Validates: Requirements 5.1, 5.2, 5.3, 5.4**

**Property 13: Account disable prevents access**
*For any* user account that is disabled by an administrator, login attempts should fail and any active sessions should be terminated
**Validates: Requirements 6.1**

**Property 14: Password reset generates valid credentials**
*For any* user requesting password reset, the system should generate a secure temporary password and send it via email
**Validates: Requirements 6.2**

**Property 15: Admin actions are audited**
*For any* administrative action (disable user, reset password, config update), an audit log entry should be created with timestamp and administrator identity
**Validates: Requirements 6.4**

**Property 16: Database referential integrity**
*For any* attempt to create orphaned records (e.g., trip without valid user), the database should reject the operation
**Validates: Requirements 8.2**

## Error Handling

**Authentication Errors:**
- Invalid credentials return 401 Unauthorized with generic error message (security)
- Account locked returns 403 Forbidden with unlock time
- Expired token returns 401 with clear re-authentication instruction
- Email verification failures return 400 with actionable error message

**Database Errors:**
- Connection failures trigger automatic retry with exponential backoff
- Transaction deadlocks are retried up to 3 times
- Constraint violations return 400 with field-specific error details
- Query timeouts return 504 Gateway Timeout with retry suggestion

**External API Errors:**
- Route API unavailable triggers cache lookup, then returns 503 if no cache
- Rate limit exceeded returns 429 with retry-after header
- Invalid API responses are logged and return 502 Bad Gateway
- Timeout errors (>5s) trigger fallback to cached data

**Validation Errors:**
- Invalid email format returns 400 with specific validation message
- Weak passwords return 400 with password requirements
- Invalid coordinates return 400 with acceptable range
- Missing required fields return 400 with field list

**Authorization Errors:**
- Non-admin accessing admin endpoints returns 403 Forbidden
- Accessing other user's data returns 403 Forbidden
- Expired session returns 401 with re-login instruction

## Testing Strategy

**Dual Testing Approach:**
The system will employ both unit testing and property-based testing to ensure comprehensive coverage:

- **Unit tests** verify specific examples, edge cases, and error conditions
- **Property tests** verify universal properties that should hold across all inputs
- Together they provide comprehensive coverage: unit tests catch concrete bugs, property tests verify general correctness

**Unit Testing:**
- Specific authentication flows (registration, login, logout)
- Edge cases like account lockout threshold, session expiration boundary
- Error conditions: database failures, API timeouts, invalid inputs
- Integration points between services and database
- Admin dashboard UI component rendering

**Property-Based Testing:**
- **Framework:** fast-check for TypeScript will be used for property-based testing
- **Configuration:** Each property-based test will run a minimum of 100 iterations
- **Tagging:** Each property-based test will include a comment with format: '**Feature: user-auth-and-real-routing, Property {number}: {property_text}**'
- **Implementation:** Each correctness property will be implemented by a single property-based test
- **Coverage:** Property tests will validate universal behaviors across randomly generated inputs including emails, passwords, coordinates, user preferences, and trip data

**Test Data Generation:**
- Smart generators for valid email addresses (RFC 5322 compliant)
- Password generators with varying complexity levels
- Coordinate generators within valid geographic bounds
- User preference generators with realistic constraint combinations
- Trip data generators with valid route structures

**Integration Testing:**
- End-to-end authentication flows from registration to authenticated requests
- Route calculation with real API calls (using test API keys)
- Database transaction isolation and rollback scenarios
- Admin dashboard operations with real database state

**Security Testing:**
- SQL injection attempts on all database queries
- JWT token tampering and expiration validation
- Password hashing strength verification
- Rate limiting effectiveness under load
- Data isolation between users

## Database Schema

**Users Table:**
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  email_verified BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  is_admin BOOLEAN DEFAULT FALSE,
  failed_login_attempts INTEGER DEFAULT 0,
  account_locked_until TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  last_login_at TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_active ON users(is_active);
```

**User Preferences Table:**
```sql
CREATE TABLE user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  max_walking_distance DECIMAL(10,2),
  preferred_modes JSONB,
  accessibility_needs JSONB,
  sustainability_priority VARCHAR(50),
  time_vs_environment_weight DECIMAL(3,2),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id)
);
```

**Trips Table:**
```sql
CREATE TABLE trips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  origin_lat DECIMAL(10,8) NOT NULL,
  origin_lng DECIMAL(11,8) NOT NULL,
  origin_name VARCHAR(255),
  destination_lat DECIMAL(10,8) NOT NULL,
  destination_lng DECIMAL(11,8) NOT NULL,
  destination_name VARCHAR(255),
  selected_route JSONB NOT NULL,
  actual_transportation_mode VARCHAR(100) NOT NULL,
  carbon_savings DECIMAL(10,3),
  distance DECIMAL(10,2),
  duration INTEGER,
  completed_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_trips_user_id ON trips(user_id);
CREATE INDEX idx_trips_completed_at ON trips(completed_at);
```

**Sessions Table:**
```sql
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token VARCHAR(500) UNIQUE NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  ip_address VARCHAR(45),
  user_agent TEXT
);

CREATE INDEX idx_sessions_token ON sessions(token);
CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_expires_at ON sessions(expires_at);
```

**Audit Logs Table:**
```sql
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES users(id),
  action VARCHAR(100) NOT NULL,
  target_user_id UUID REFERENCES users(id),
  details JSONB,
  timestamp TIMESTAMP DEFAULT NOW(),
  ip_address VARCHAR(45)
);

CREATE INDEX idx_audit_logs_admin_id ON audit_logs(admin_id);
CREATE INDEX idx_audit_logs_timestamp ON audit_logs(timestamp);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
```

## API Endpoints

**Authentication Endpoints:**
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login and get JWT token
- `POST /api/auth/logout` - Invalidate session
- `GET /api/auth/verify-email/:token` - Verify email address
- `POST /api/auth/reset-password` - Request password reset
- `POST /api/auth/reset-password/:token` - Complete password reset

**User Endpoints:**
- `GET /api/users/me` - Get current user profile
- `PUT /api/users/me` - Update user profile
- `GET /api/users/me/preferences` - Get user preferences
- `PUT /api/users/me/preferences` - Update preferences
- `GET /api/users/me/trips` - Get trip history
- `DELETE /api/users/me` - Request account deletion

**Route Endpoints:**
- `POST /api/routes/calculate` - Calculate routes with real API
- `GET /api/routes/:id` - Get cached route details
- `POST /api/routes/save-trip` - Save completed trip

**Admin Endpoints:**
- `GET /api/admin/metrics` - Get system metrics
- `GET /api/admin/users` - List all users (paginated)
- `GET /api/admin/users/:id` - Get user details
- `PUT /api/admin/users/:id/disable` - Disable user account
- `PUT /api/admin/users/:id/enable` - Enable user account
- `POST /api/admin/users/:id/reset-password` - Reset user password
- `GET /api/admin/audit-logs` - Get audit logs (paginated)
- `PUT /api/admin/config` - Update system configuration

## Technology Stack

**Backend:**
- Node.js 18+ with Express.js
- TypeScript for type safety
- PostgreSQL 14+ for database
- TypeORM or Prisma for ORM
- JWT (jsonwebtoken) for authentication
- bcrypt for password hashing
- Axios for external API calls
- node-cache for in-memory caching
- Winston for logging

**Frontend:**
- React 18+ with TypeScript
- React Router for navigation
- Axios for HTTP client
- Redux Toolkit or Context API for state management
- Material-UI or Tailwind CSS for styling
- Recharts for admin dashboard visualizations

**External Services:**
- Google Maps API or Geoapify for route calculation
- SendGrid or AWS SES for email delivery
- Optional: Redis for session storage and caching

**Development Tools:**
- Vitest for unit testing
- fast-check for property-based testing
- Docker for local PostgreSQL
- ESLint and Prettier for code quality
- Webpack or Vite for frontend bundling

## Deployment Considerations

**Backend Deployment:**
- Containerized with Docker
- Environment variables for configuration (database URL, API keys, JWT secret)
- Health check endpoint at `/health`
- Graceful shutdown handling
- Database migrations run on startup

**Frontend Deployment:**
- Static build served via CDN or Nginx
- Environment-specific API endpoint configuration
- HTTPS required for production
- CORS configured for backend communication

**Database:**
- Connection pooling (10-20 connections)
- Regular backups with point-in-time recovery
- Read replicas for scaling (future)
- Migration versioning with rollback capability

**Monitoring:**
- Application logs aggregated to centralized logging
- Error tracking (Sentry or similar)
- Performance monitoring (response times, database query times)
- API usage tracking for quota management
