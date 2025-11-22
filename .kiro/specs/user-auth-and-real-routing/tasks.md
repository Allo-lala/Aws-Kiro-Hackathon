# Implementation Plan

- [x] 1. Restructure project with backend/frontend separation
  - Create `backend/` directory with subdirectories: `src/api`, `src/services`, `src/models`, `src/middleware`, `src/config`
  - Create `frontend/` directory with subdirectories: `src/components`, `src/pages`, `src/services`, `src/store`, `src/types`
  - Move existing route planner code to appropriate backend services
  - Set up separate `package.json` and `tsconfig.json` for backend and frontend
  - Configure build scripts for independent deployment
  - _Requirements: 7.1, 7.2, 7.4_

- [ ] 2. Set up PostgreSQL database and ORM
  - Install PostgreSQL dependencies (pg, TypeORM or Prisma)
  - Create database connection configuration with environment variables
  - Implement database service with connection pooling
  - Create migration system for schema versioning
  - _Requirements: 8.1, 8.5_

- [ ] 2.1 Create database schema and migrations
  - Write migration for users table with indexes
  - Write migration for user_preferences table with foreign key
  - Write migration for trips table with foreign key
  - Write migration for sessions table with indexes
  - Write migration for audit_logs table with indexes
  - Run migrations and verify schema creation
  - _Requirements: 8.2, 8.5_

- [ ]* 2.2 Write property test for database referential integrity
  - **Property 16: Database referential integrity**
  - **Validates: Requirements 8.2**

- [ ] 3. Implement authentication service
  - Create User entity model with TypeORM/Prisma decorators
  - Implement password hashing with bcrypt (salt rounds: 10)
  - Create JWT token generation and validation utilities
  - Implement user registration with email validation
  - Implement login with credential verification
  - Add failed login attempt tracking and account lockout logic
  - _Requirements: 1.1, 1.2, 1.3, 2.1, 2.2, 2.3_

- [ ]* 3.1 Write property test for user registration
  - **Property 1: User registration creates valid accounts**
  - **Validates: Requirements 1.1, 1.3, 1.4**

- [ ]* 3.2 Write property test for duplicate email rejection
  - **Property 2: Duplicate email rejection**
  - **Validates: Requirements 1.2**

- [ ]* 3.3 Write property test for valid login
  - **Property 4: Valid login creates authenticated session**
  - **Validates: Requirements 2.1, 2.4**

- [ ]* 3.4 Write property test for invalid login
  - **Property 5: Invalid login increments failure counter**
  - **Validates: Requirements 2.2**

- [ ]* 3.5 Write unit test for account lockout threshold
  - Test that 5 failed attempts within 1 hour locks account for 30 minutes
  - _Requirements: 2.3_

- [ ] 4. Implement session management
  - Create Session entity model
  - Implement session creation with 24-hour expiration
  - Create JWT authentication middleware for protected routes
  - Implement session validation and expiration checking
  - Add logout functionality to invalidate sessions
  - _Requirements: 2.1, 2.4, 2.5_

- [ ]* 4.1 Write property test for expired sessions
  - **Property 6: Expired sessions require re-authentication**
  - **Validates: Requirements 2.5**

- [ ] 5. Implement email verification system
  - Set up email service integration (SendGrid or AWS SES)
  - Create email verification token generation
  - Implement verification email sending on registration
  - Create email verification endpoint
  - Add account activation logic on successful verification
  - _Requirements: 1.4, 1.5_

- [ ]* 5.1 Write property test for email verification
  - **Property 3: Email verification activates accounts**
  - **Validates: Requirements 1.5**

- [ ] 6. Implement user data persistence
  - Create UserPreferences entity model
  - Create Trip entity model
  - Implement user preferences CRUD operations
  - Implement trip recording and storage
  - Add data retrieval with user isolation checks
  - _Requirements: 3.1, 3.2, 3.4_

- [ ]* 6.1 Write property test for data persistence round-trip
  - **Property 7: User data persistence round-trip**
  - **Validates: Requirements 3.1, 3.2**

- [ ]* 6.2 Write property test for cross-device consistency
  - **Property 8: Cross-device data consistency**
  - **Validates: Requirements 3.3**

- [ ]* 6.3 Write property test for user data isolation
  - **Property 9: User data isolation**
  - **Validates: Requirements 3.4**

- [ ] 7. Integrate real route calculation API
  - Install axios for HTTP requests
  - Create configuration for Google Maps API or Geoapify (API key from env)
  - Implement external API client with error handling
  - Create route request builder with origin/destination coordinates
  - Implement API response parser and transformer to RouteAlternative format
  - Add route caching layer to reduce API calls
  - _Requirements: 4.1, 4.2, 4.4_

- [ ]* 7.1 Write property test for route API integration
  - **Property 10: Route API integration correctness**
  - **Validates: Requirements 4.1, 4.2**

- [ ]* 7.2 Write property test for multi-mode aggregation
  - **Property 11: Multi-mode route aggregation**
  - **Validates: Requirements 4.3**

- [ ]* 7.3 Write unit test for API fallback behavior
  - Test cache lookup when API is unavailable
  - Test error notification when no cache available
  - _Requirements: 4.4_

- [ ] 8. Build backend API endpoints
  - Create Express router for authentication endpoints (register, login, logout, verify-email)
  - Create Express router for user endpoints (profile, preferences, trips)
  - Create Express router for route endpoints (calculate, save-trip)
  - Add request validation middleware using express-validator
  - Add error handling middleware with appropriate status codes
  - Implement CORS configuration for frontend communication
  - _Requirements: 1.1, 1.2, 2.1, 3.1, 3.2, 4.1, 7.3_

- [ ] 9. Implement admin service and endpoints
  - Create admin authorization middleware (check isAdmin flag)
  - Implement system metrics collection (active users, API usage, error rates)
  - Create user management operations (list, details, disable, enable)
  - Implement password reset functionality for admins
  - Create AuditLog entity model
  - Add audit logging for all admin actions
  - Create admin API endpoints
  - _Requirements: 5.1, 5.2, 5.3, 6.1, 6.2, 6.4_

- [ ]* 9.1 Write property test for admin dashboard completeness
  - **Property 12: Admin dashboard data completeness**
  - **Validates: Requirements 5.1, 5.2, 5.3, 5.4**

- [ ]* 9.2 Write property test for account disable
  - **Property 13: Account disable prevents access**
  - **Validates: Requirements 6.1**

- [ ]* 9.3 Write property test for password reset
  - **Property 14: Password reset generates valid credentials**
  - **Validates: Requirements 6.2**

- [ ]* 9.4 Write property test for audit logging
  - **Property 15: Admin actions are audited**
  - **Validates: Requirements 6.4**

- [ ] 10. Checkpoint - Ensure backend tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 11. Build frontend authentication UI
  - Create React app structure with TypeScript
  - Install dependencies (react-router-dom, axios, material-ui or tailwind)
  - Create registration form component with validation
  - Create login form component with error handling
  - Implement JWT token storage in localStorage
  - Create authentication context/store for global auth state
  - Add protected route wrapper component
  - Create email verification success page
  - _Requirements: 1.1, 1.2, 2.1_

- [ ] 12. Build frontend route planning interface
  - Create route input form with origin/destination fields
  - Implement transportation mode selection
  - Create route results display component
  - Add route comparison visualization
  - Implement trip saving functionality
  - Connect to backend route calculation API
  - Add loading states and error handling
  - _Requirements: 4.1, 4.2, 4.3_

- [ ] 13. Build frontend user dashboard
  - Create user profile page with editable preferences
  - Implement trip history display with pagination
  - Create carbon savings visualization (charts)
  - Add cumulative environmental impact display
  - Implement data export functionality
  - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [ ] 14. Build admin dashboard frontend
  - Create admin-only route guard
  - Build system metrics dashboard with real-time data
  - Create user management table with search and filters
  - Implement user detail view with trip history
  - Add user disable/enable controls
  - Create password reset interface
  - Build audit log viewer with filtering
  - Add error log display
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 6.1, 6.2, 6.4_

- [ ] 15. Implement frontend API client
  - Create axios instance with base URL configuration
  - Add request interceptor to attach JWT token
  - Add response interceptor for error handling
  - Implement automatic token refresh on 401 errors
  - Create typed API service methods for all endpoints
  - Add request/response logging for debugging
  - _Requirements: 7.3_

- [ ] 16. Add comprehensive error handling
  - Implement backend error logging with Winston
  - Add frontend error boundary components
  - Create user-friendly error messages for all error types
  - Implement retry logic for transient failures
  - Add error tracking integration (optional: Sentry)
  - _Requirements: 4.4, 8.4_

- [ ] 17. Implement security hardening
  - Add rate limiting middleware to prevent abuse
  - Implement SQL injection prevention (parameterized queries)
  - Add input sanitization for all user inputs
  - Configure secure HTTP headers (helmet.js)
  - Implement CSRF protection for state-changing operations
  - Add API key rotation mechanism
  - _Requirements: 1.3, 2.2, 2.3, 3.4_

- [ ]* 17.1 Write security tests
  - Test SQL injection attempts on all endpoints
  - Test JWT token tampering detection
  - Test rate limiting effectiveness
  - Test data isolation between users
  - _Requirements: 3.4_

- [ ] 18. Set up deployment configuration
  - Create Dockerfile for backend
  - Create Dockerfile for frontend
  - Create docker-compose.yml for local development
  - Add environment variable templates (.env.example)
  - Create database backup scripts
  - Add health check endpoints
  - Document deployment process
  - _Requirements: 7.4, 8.1_

- [ ] 19. Final integration and testing
  - Run all property-based tests and verify they pass
  - Perform end-to-end testing of complete user flows
  - Test admin dashboard with real data
  - Verify route calculation with real API
  - Test database migrations and rollbacks
  - Validate all API endpoints with Postman/Insomnia
  - _Requirements: All requirements_

- [ ] 20. Checkpoint - Final verification
  - Ensure all tests pass, ask the user if questions arise.
