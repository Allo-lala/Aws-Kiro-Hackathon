# Frontend API Client Documentation

## Overview

The frontend API client provides a comprehensive, typed interface for communicating with the backend API. It includes automatic JWT token management, request/response logging, error handling, and automatic token refresh capabilities.

## Architecture

### Core Components

1. **apiClient.ts** - Base Axios instance with interceptors
2. **authService.ts** - Authentication endpoints (register, login, logout, etc.)
3. **userService.ts** - User profile and preferences management
4. **routeService.ts** - Route calculation and trip management
5. **adminService.ts** - Admin dashboard and user management

## Features

### 1. Automatic JWT Token Attachment

All requests automatically include the JWT token from localStorage:

```typescript
Authorization: Bearer <token>
```

### 2. Request/Response Logging

In development mode, all requests and responses are logged to the console:

```typescript
[API Request] { method: 'POST', url: '/auth/login', data: {...} }
[API Response] { status: 200, url: '/auth/login', data: {...} }
[API Response Error] { status: 401, url: '/auth/login', message: '...' }
```

### 3. Automatic Token Refresh

When a 401 Unauthorized response is received, the client automatically:
- Attempts to refresh the token using the refresh token
- Queues failed requests during refresh
- Retries all queued requests with the new token
- Redirects to login if refresh fails

```typescript
// Token refresh flow
401 Response → Check for refresh token → POST /auth/refresh → 
Update stored token → Retry original request
```

### 4. Comprehensive Error Handling

The client handles various error scenarios:

- **401 Unauthorized**: Automatic token refresh or redirect to login
- **403 Forbidden**: Permission denied
- **404 Not Found**: Resource not found
- **429 Too Many Requests**: Rate limit exceeded
- **500-504 Server Errors**: Server-side issues
- **Network Errors**: No response from server

### 5. Typed API Methods

All API methods are fully typed with TypeScript interfaces:

```typescript
// Example: Login with typed request/response
const response: LoginResponse = await authService.login({
  email: 'user@example.com',
  password: 'password123'
});
```

## Usage Examples

### Authentication

```typescript
import { authService } from './services';

// Register new user
try {
  const result = await authService.register({
    email: 'user@example.com',
    password: 'securePassword123'
  });
  console.log('Registration successful:', result.message);
} catch (error) {
  console.error('Registration failed:', error);
}

// Login
try {
  const { user, token, refreshToken } = await authService.login({
    email: 'user@example.com',
    password: 'securePassword123'
  });
  // Token is automatically stored in localStorage
  console.log('Logged in as:', user.email);
} catch (error) {
  console.error('Login failed:', error);
}

// Logout
await authService.logout();

// Verify email
await authService.verifyEmail('verification-token-here');
```

### User Management

```typescript
import { userService } from './services';

// Get user profile
const profile = await userService.getProfile();

// Update preferences
const updatedPrefs = await userService.updatePreferences({
  maxWalkingDistance: 2.0,
  sustainabilityPriority: 'high',
  preferredTransportationModes: [...]
});

// Get trip history
const trips = await userService.getTrips({
  startDate: new Date('2024-01-01'),
  endDate: new Date('2024-12-31'),
  page: 1,
  pageSize: 20
});

// Get statistics
const stats = await userService.getStatistics();
console.log(`Total trips: ${stats.totalTrips}`);
console.log(`Carbon savings: ${stats.totalCarbonSavings} kg`);
```

### Route Planning

```typescript
import { routeService } from './services';

// Calculate routes
const routes = await routeService.calculateRoutes({
  origin: { latitude: 40.7128, longitude: -74.0060, name: 'New York' },
  destination: { latitude: 34.0522, longitude: -118.2437, name: 'Los Angeles' },
  modes: ['driving', 'transit', 'walking'],
  preferences: userPreferences
});

// Save completed trip
const result = await routeService.saveTrip({
  origin: { latitude: 40.7128, longitude: -74.0060 },
  destination: { latitude: 34.0522, longitude: -118.2437 },
  selectedRoute: routes[0],
  actualTransportationMode: 'transit'
});
```

### Admin Operations

```typescript
import { adminService } from './services';

// Get system metrics
const metrics = await adminService.getSystemMetrics();
console.log(`Active users: ${metrics.activeUsers}`);
console.log(`API calls today: ${metrics.apiCallsToday}`);

// List users
const users = await adminService.listUsers(1, 20, {
  search: 'john',
  isActive: true
});

// Disable user
await adminService.disableUser('user-id', 'Violation of terms');

// Get audit logs
const logs = await adminService.getAuditLogs(1, 50, {
  action: 'USER_DISABLED',
  startDate: new Date('2024-01-01')
});
```

## Configuration

### Environment Variables

```bash
# .env file
REACT_APP_API_URL=http://localhost:3001/api
NODE_ENV=development  # Enables debug logging
```

### Timeout Configuration

Default timeout is 30 seconds. To modify:

```typescript
// In apiClient.ts
this.client = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // 30 seconds
});
```

## Error Handling Best Practices

### Component-Level Error Handling

```typescript
import { authService } from './services';

const LoginComponent = () => {
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (email: string, password: string) => {
    try {
      setError(null);
      await authService.login({ email, password });
      // Success - redirect or update state
    } catch (err: any) {
      // Handle specific error cases
      if (err.response?.status === 401) {
        setError('Invalid email or password');
      } else if (err.response?.status === 403) {
        setError('Account is locked. Please try again later.');
      } else {
        setError('Login failed. Please try again.');
      }
    }
  };

  return (
    <div>
      {error && <div className="error">{error}</div>}
      {/* Login form */}
    </div>
  );
};
```

### Global Error Handling

For global error handling, you can add additional interceptors or use an error boundary:

```typescript
import { apiClient } from './services/apiClient';

// Add custom error handler
apiClient.interceptors.response.use(
  response => response,
  error => {
    // Custom global error handling
    if (error.response?.status === 503) {
      // Show maintenance page
    }
    return Promise.reject(error);
  }
);
```

## Token Management

### Manual Token Management

```typescript
// Set tokens manually
localStorage.setItem('auth_token', 'your-jwt-token');
localStorage.setItem('refresh_token', 'your-refresh-token');

// Clear tokens manually
localStorage.removeItem('auth_token');
localStorage.removeItem('refresh_token');
```

### Token Refresh Flow

The token refresh is handled automatically, but you can also trigger it manually:

```typescript
import { authService } from './services';

const refreshToken = localStorage.getItem('refresh_token');
if (refreshToken) {
  const { token, refreshToken: newRefreshToken } = await authService.refreshToken({
    refreshToken
  });
  localStorage.setItem('auth_token', token);
  if (newRefreshToken) {
    localStorage.setItem('refresh_token', newRefreshToken);
  }
}
```

## Testing

### Mocking API Calls

```typescript
import { vi } from 'vitest';
import { authService } from './services';

// Mock the entire service
vi.mock('./services/authService', () => ({
  authService: {
    login: vi.fn().mockResolvedValue({
      user: { id: '1', email: 'test@example.com' },
      token: 'mock-token'
    })
  }
}));

// Test component
test('login success', async () => {
  await authService.login({ email: 'test@example.com', password: 'pass' });
  expect(authService.login).toHaveBeenCalled();
});
```

## Troubleshooting

### Common Issues

1. **401 Errors After Token Refresh**
   - Ensure refresh token is stored correctly
   - Check backend refresh endpoint is working
   - Verify token expiration times

2. **CORS Errors**
   - Ensure backend CORS is configured correctly
   - Check API_BASE_URL is correct

3. **Request Timeout**
   - Increase timeout in apiClient configuration
   - Check network connectivity
   - Verify backend is responding

4. **Debug Logging Not Showing**
   - Ensure NODE_ENV is set to 'development'
   - Check browser console settings

## API Endpoint Reference

### Authentication Endpoints
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout
- `GET /api/auth/verify-email/:token` - Verify email
- `POST /api/auth/reset-password` - Request password reset
- `POST /api/auth/reset-password/:token` - Complete password reset
- `POST /api/auth/refresh` - Refresh token

### User Endpoints
- `GET /api/users/me` - Get profile
- `PUT /api/users/me` - Update profile
- `GET /api/users/me/preferences` - Get preferences
- `PUT /api/users/me/preferences` - Update preferences
- `GET /api/users/me/trips` - Get trip history
- `GET /api/users/me/statistics` - Get statistics
- `DELETE /api/users/me` - Delete account

### Route Endpoints
- `POST /api/routes/calculate` - Calculate routes
- `GET /api/routes/:id` - Get cached route
- `POST /api/routes/save-trip` - Save trip

### Admin Endpoints
- `GET /api/admin/metrics` - System metrics
- `GET /api/admin/users` - List users
- `GET /api/admin/users/:id` - User details
- `PUT /api/admin/users/:id/disable` - Disable user
- `PUT /api/admin/users/:id/enable` - Enable user
- `POST /api/admin/users/:id/reset-password` - Reset password
- `GET /api/admin/audit-logs` - Audit logs

## Requirements Validation

This implementation satisfies **Requirement 7.3**:
- ✅ Frontend communicates exclusively through RESTful HTTP endpoints
- ✅ Typed API service methods for all endpoints
- ✅ Automatic JWT token management
- ✅ Request/response logging for debugging
- ✅ Comprehensive error handling
- ✅ Automatic token refresh on 401 errors
