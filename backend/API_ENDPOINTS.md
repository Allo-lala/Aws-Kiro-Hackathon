# API Endpoints Documentation

This document describes all available API endpoints in the Rutty backend.

## Base URL

```
http://localhost:8080/api
```

## Authentication

Most endpoints require authentication using JWT tokens. Include the token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

## Response Format

All API responses follow this format:

```json
{
  "success": true|false,
  "data": { ... },      // Present on success
  "error": "message",   // Present on error
  "details": [ ... ]    // Present on validation errors
}
```

---

## Authentication Endpoints

### POST /api/auth/register

Register a new user account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:** `201 Created`
```json
{
  "success": true,
  "message": "Registration successful. Please check your email to verify your account.",
  "data": {
    "id": "uuid",
    "email": "user@example.com",
    "emailVerified": false,
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

### POST /api/auth/login

Login with email and password.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "emailVerified": true,
      "isAdmin": false
    },
    "token": "jwt-token-here"
  }
}
```

### POST /api/auth/logout

Logout and invalidate session. **Requires authentication.**

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Logout successful"
}
```

### GET /api/auth/verify-email/:token

Verify email address with token.

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Email verified successfully. You can now log in."
}
```

### POST /api/auth/resend-verification

Resend verification email.

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Verification email sent. Please check your inbox."
}
```

### POST /api/auth/reset-password

Request password reset.

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "If an account exists with that email, a password reset link has been sent."
}
```

### POST /api/auth/reset-password/:token

Complete password reset with token.

**Request Body:**
```json
{
  "password": "newpassword123"
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Password reset successful. You can now log in with your new password."
}
```

---

## User Endpoints

All user endpoints require authentication.

### GET /api/users/me

Get current user profile.

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "email": "user@example.com",
    "emailVerified": true,
    "isActive": true,
    "isAdmin": false,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "lastLoginAt": "2024-01-01T00:00:00.000Z"
  }
}
```

### GET /api/users/me/preferences

Get user preferences.

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "userId": "uuid",
    "maxWalkingDistance": 1.5,
    "preferredModes": ["walking", "cycling", "public_transit"],
    "accessibilityNeeds": {},
    "sustainabilityPriority": "high",
    "timeVsEnvironmentWeight": 0.7
  }
}
```

### PUT /api/users/me/preferences

Create or update user preferences.

**Request Body:**
```json
{
  "maxWalkingDistance": 2.0,
  "preferredModes": ["walking", "cycling"],
  "accessibilityNeeds": { "wheelchair": true },
  "sustainabilityPriority": "high",
  "timeVsEnvironmentWeight": 0.8
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": { /* updated preferences */ }
}
```

### GET /api/users/me/trips

Get trip history with optional filters.

**Query Parameters:**
- `startDate` (optional): ISO 8601 date
- `endDate` (optional): ISO 8601 date
- `transportationMode` (optional): string
- `limit` (optional): 1-100
- `offset` (optional): integer >= 0

**Response:** `200 OK`
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "userId": "uuid",
      "originLat": 40.7128,
      "originLng": -74.0060,
      "originName": "New York",
      "destinationLat": 40.7589,
      "destinationLng": -73.9851,
      "destinationName": "Times Square",
      "selectedRoute": {},
      "actualTransportationMode": "walking",
      "carbonSavings": 2.5,
      "distance": 3.2,
      "duration": 45,
      "completedAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

### POST /api/users/me/trips

Create a new trip.

**Request Body:**
```json
{
  "originLat": 40.7128,
  "originLng": -74.0060,
  "originName": "New York",
  "destinationLat": 40.7589,
  "destinationLng": -73.9851,
  "destinationName": "Times Square",
  "selectedRoute": {},
  "actualTransportationMode": "walking",
  "carbonSavings": 2.5,
  "distance": 3.2,
  "duration": 45,
  "completedAt": "2024-01-01T00:00:00.000Z"
}
```

**Response:** `201 Created`
```json
{
  "success": true,
  "data": { /* created trip */ }
}
```

### GET /api/users/me/trips/:tripId

Get a specific trip.

**Response:** `200 OK`
```json
{
  "success": true,
  "data": { /* trip details */ }
}
```

### GET /api/users/me/stats

Get user statistics.

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "totalTrips": 42,
    "totalCarbonSavings": 125.5,
    "totalDistance": 250.0,
    "averageCarbonSavingsPerTrip": 2.99,
    "mostUsedTransportationMode": "walking"
  }
}
```

### DELETE /api/users/me

Delete user data.

**Response:** `204 No Content`

---

## Route Endpoints

### POST /api/routes/calculate

Calculate routes using external API. Authentication is optional.

**Request Body:**
```json
{
  "origin": {
    "latitude": 40.7128,
    "longitude": -74.0060,
    "name": "New York"
  },
  "destination": {
    "latitude": 40.7589,
    "longitude": -73.9851,
    "name": "Times Square"
  },
  "modes": ["walking", "cycling", "public_transit", "driving"],
  "preferences": {}
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "routes": [
      {
        "mode": "walking",
        "distance": 3.2,
        "duration": 45,
        "segments": [],
        "polyline": "encoded-polyline",
        "provider": "google_maps"
      }
    ],
    "origin": { /* origin location */ },
    "destination": { /* destination location */ },
    "calculatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

### POST /api/routes/save-trip

Save a completed trip. **Requires authentication.**

**Request Body:** Same as `POST /api/users/me/trips`

**Response:** `201 Created`
```json
{
  "success": true,
  "message": "Trip saved successfully",
  "data": { /* saved trip */ }
}
```

### GET /api/routes/:routeId

Get cached route details. Authentication is optional.

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Route details endpoint - implementation pending",
  "data": {
    "routeId": "uuid"
  }
}
```

---

## Health Check

### GET /health

Check server health status.

**Response:** `200 OK`
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "database": "connected"
}
```

---

## Error Responses

### 400 Bad Request
```json
{
  "success": false,
  "error": "Validation failed",
  "details": [
    {
      "field": "email",
      "message": "Valid email is required"
    }
  ]
}
```

### 401 Unauthorized
```json
{
  "success": false,
  "error": "Invalid email or password"
}
```

### 403 Forbidden
```json
{
  "success": false,
  "error": "Account is disabled"
}
```

### 404 Not Found
```json
{
  "success": false,
  "error": "User not found"
}
```

### 429 Too Many Requests
```json
{
  "success": false,
  "error": "API rate limit exceeded. Please try again later.",
  "code": "RATE_LIMIT_EXCEEDED"
}
```

### 500 Internal Server Error
```json
{
  "success": false,
  "error": "Internal server error"
}
```

### 503 Service Unavailable
```json
{
  "success": false,
  "error": "Route calculation service is not configured",
  "code": "SERVICE_NOT_CONFIGURED"
}
```
