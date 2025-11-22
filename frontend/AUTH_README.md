# Frontend Authentication UI

This document describes the authentication UI implementation for the Rutty frontend application.

## Overview

The frontend authentication system is built with React, TypeScript, and React Router. It provides a complete authentication flow including:

- User registration with email/password
- Login with credential validation
- Email verification
- Protected routes requiring authentication
- JWT token management in localStorage
- Centralized API client with automatic token injection

## Components

### Authentication Context (`src/store/AuthContext.tsx`)

Provides global authentication state management using React Context API:

- `user`: Current authenticated user object
- `token`: JWT authentication token
- `isAuthenticated`: Boolean indicating if user is logged in
- `isLoading`: Loading state during token validation
- `login(email, password)`: Login function
- `register(email, password)`: Registration function
- `logout()`: Logout function
- `verifyEmail(token)`: Email verification function

### Components

1. **LoginForm** (`src/components/LoginForm.tsx`)
   - Email and password input fields
   - Form validation
   - Error handling and display
   - Redirects to previous page after successful login

2. **RegisterForm** (`src/components/RegisterForm.tsx`)
   - Email and password registration
   - Password confirmation
   - Client-side validation (email format, password strength)
   - Success message with email verification instructions

3. **ProtectedRoute** (`src/components/ProtectedRoute.tsx`)
   - Wrapper component for protected routes
   - Redirects to login if not authenticated
   - Optional admin-only access control
   - Loading state during authentication check

### Pages

1. **Dashboard** (`src/pages/Dashboard.tsx`)
   - Main protected page after login
   - Displays user email
   - Logout functionality
   - Warning for unverified email accounts

2. **EmailVerification** (`src/pages/EmailVerification.tsx`)
   - Handles email verification from link
   - Shows verification status (verifying, success, error)
   - Auto-redirects to login after successful verification

## API Integration

### API Client (`src/services/apiClient.ts`)

Centralized Axios instance with:

- Base URL configuration via environment variable
- Request interceptor to add JWT token to headers
- Response interceptor for 401 error handling
- Automatic redirect to login on token expiration

### API Endpoints

The frontend expects the following backend endpoints:

- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/verify-email/:token` - Email verification
- `GET /api/users/me` - Get current user profile

## Usage

### Running the Development Server

```bash
npm run dev
```

This starts the webpack dev server on port 3000 with hot reload enabled.

### Building for Production

```bash
npm run build
```

This creates an optimized production build in the `dist/` directory.

### Environment Variables

Create a `.env` file in the frontend directory:

```
REACT_APP_API_URL=http://localhost:3001/api
```

## Routing

The application uses React Router with the following routes:

- `/login` - Login page (public)
- `/register` - Registration page (public)
- `/verify-email/:token` - Email verification page (public)
- `/` - Dashboard (protected, requires authentication)

## Styling

Authentication-specific styles are in `src/auth-styles.css`:

- Modern gradient background
- Card-based layout
- Responsive design
- Accessible form elements
- Loading states and animations
- Success/error message styling

## Security Features

1. **JWT Token Storage**: Tokens stored in localStorage
2. **Automatic Token Injection**: API client adds token to all requests
3. **Token Expiration Handling**: Automatic logout on 401 responses
4. **Password Validation**: Client-side password strength requirements
5. **Email Validation**: RFC 5322 compliant email validation

## Password Requirements

- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number

## Future Enhancements

- Remember me functionality
- Password reset flow
- Social authentication (Google, GitHub)
- Two-factor authentication
- Session timeout warnings
- Refresh token rotation
