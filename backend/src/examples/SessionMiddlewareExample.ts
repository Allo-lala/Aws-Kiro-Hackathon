/**
 * Example: Using JWT Authentication Middleware
 * 
 * This example demonstrates how to use the authentication middleware
 * to protect routes and manage user sessions.
 */

import express, { Request, Response } from 'express';
import { DatabaseService } from '../services/DatabaseService';
import { AuthService } from '../services/AuthService';
import { authenticateJWT, requireAdmin, optionalAuth } from '../middleware/auth';

// Initialize services
const databaseService = new DatabaseService();
const authService = new AuthService(databaseService);
const app = express();

app.use(express.json());

// ============================================
// Public Routes (No Authentication Required)
// ============================================

/**
 * Register a new user
 * POST /api/auth/register
 */
app.post('/api/auth/register', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    const user = await authService.register(email, password);
    res.status(201).json({
      message: 'User registered successfully',
      user: {
        id: user.id,
        email: user.email,
        emailVerified: user.emailVerified,
      },
    });
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : 'Registration failed' });
  }
});

/**
 * Login and get JWT token
 * POST /api/auth/login
 */
app.post('/api/auth/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    const ipAddress = req.ip;
    const userAgent = req.headers['user-agent'];

    const { user, token } = await authService.login(email, password);

    // Update session with IP and user agent
    await authService.createSession(user.id, token, ipAddress, userAgent);

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        email: user.email,
        isAdmin: user.isAdmin,
      },
    });
  } catch (error) {
    res.status(401).json({ error: error instanceof Error ? error.message : 'Login failed' });
  }
});

// ============================================
// Protected Routes (Authentication Required)
// ============================================

/**
 * Get current user profile
 * GET /api/users/me
 * Requires: Valid JWT token
 */
app.get('/api/users/me', authenticateJWT(databaseService), async (req: Request, res: Response) => {
  // req.user is automatically populated by authenticateJWT middleware
  res.json({
    user: req.user,
  });
});

/**
 * Update user profile
 * PUT /api/users/me
 * Requires: Valid JWT token
 */
app.put('/api/users/me', authenticateJWT(databaseService), async (req: Request, res: Response) => {
  try {
    // Access authenticated user from req.user
    const userId = req.user!.id;
    const updates = req.body;

    // Update user logic here...
    res.json({
      message: 'Profile updated successfully',
      userId,
    });
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : 'Update failed' });
  }
});

/**
 * Logout and invalidate session
 * POST /api/auth/logout
 * Requires: Valid JWT token
 */
app.post('/api/auth/logout', authenticateJWT(databaseService), async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const token = req.token;

    // Invalidate specific session
    await authService.logout(userId, token);

    res.json({ message: 'Logout successful' });
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : 'Logout failed' });
  }
});

/**
 * Logout from all devices
 * POST /api/auth/logout-all
 * Requires: Valid JWT token
 */
app.post('/api/auth/logout-all', authenticateJWT(databaseService), async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;

    // Invalidate all sessions for user
    await authService.logout(userId);

    res.json({ message: 'Logged out from all devices' });
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : 'Logout failed' });
  }
});

// ============================================
// Admin Routes (Admin Privileges Required)
// ============================================

/**
 * Get all users (Admin only)
 * GET /api/admin/users
 * Requires: Valid JWT token + Admin privileges
 */
app.get(
  '/api/admin/users',
  authenticateJWT(databaseService),
  requireAdmin,
  async (req: Request, res: Response) => {
    try {
      // Only admins can access this route
      res.json({
        message: 'Admin access granted',
        admin: req.user,
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch users' });
    }
  }
);

/**
 * Get system metrics (Admin only)
 * GET /api/admin/metrics
 * Requires: Valid JWT token + Admin privileges
 */
app.get(
  '/api/admin/metrics',
  authenticateJWT(databaseService),
  requireAdmin,
  async (req: Request, res: Response) => {
    try {
      res.json({
        message: 'System metrics',
        timestamp: new Date(),
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch metrics' });
    }
  }
);

// ============================================
// Optional Authentication Routes
// ============================================

/**
 * Get public content with optional user context
 * GET /api/content
 * Optional: JWT token (if provided, user context is added)
 */
app.get('/api/content', optionalAuth(databaseService), async (req: Request, res: Response) => {
  // req.user will be populated if valid token is provided
  // Otherwise, req.user will be undefined
  const isAuthenticated = !!req.user;

  res.json({
    message: 'Public content',
    isAuthenticated,
    user: req.user || null,
  });
});

// ============================================
// Error Handling Examples
// ============================================

/**
 * Example of handling authentication errors:
 * 
 * 1. No token provided:
 *    Status: 401
 *    Response: { error: "No authorization header provided" }
 * 
 * 2. Invalid token format:
 *    Status: 401
 *    Response: { error: "Invalid authorization header format. Use: Bearer <token>" }
 * 
 * 3. Token expired:
 *    Status: 401
 *    Response: { error: "Token expired. Please login again." }
 * 
 * 4. Invalid token:
 *    Status: 401
 *    Response: { error: "Invalid token" }
 * 
 * 5. Account disabled:
 *    Status: 403
 *    Response: { error: "Account is disabled" }
 * 
 * 6. Admin required:
 *    Status: 403
 *    Response: { error: "Admin privileges required" }
 */

// ============================================
// Client Usage Examples
// ============================================

/**
 * Example: Making authenticated requests from client
 * 
 * // 1. Login and get token
 * const loginResponse = await fetch('/api/auth/login', {
 *   method: 'POST',
 *   headers: { 'Content-Type': 'application/json' },
 *   body: JSON.stringify({ email: 'user@example.com', password: 'password123' })
 * });
 * const { token } = await loginResponse.json();
 * 
 * // 2. Store token (localStorage, sessionStorage, or memory)
 * localStorage.setItem('authToken', token);
 * 
 * // 3. Use token in subsequent requests
 * const profileResponse = await fetch('/api/users/me', {
 *   headers: {
 *     'Authorization': `Bearer ${token}`
 *   }
 * });
 * 
 * // 4. Logout
 * await fetch('/api/auth/logout', {
 *   method: 'POST',
 *   headers: {
 *     'Authorization': `Bearer ${token}`
 *   }
 * });
 * localStorage.removeItem('authToken');
 */

export { app };
