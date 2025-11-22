import { Request, Response } from 'express';
import { AuthService } from '../services/AuthService';
import { DatabaseService } from '../services/DatabaseService';

/**
 * Authentication Controller
 * Handles user registration, login, email verification, and password reset
 */
export class AuthController {
  private authService: AuthService;

  constructor(databaseService: DatabaseService) {
    this.authService = new AuthService(databaseService);
  }

  /**
   * Register a new user
   * POST /api/auth/register
   */
  async register(req: Request, res: Response): Promise<void> {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        res.status(400).json({
          success: false,
          error: 'Email and password are required',
        });
        return;
      }

      const user = await this.authService.register(email, password);

      res.status(201).json({
        success: true,
        message: 'Registration successful. Please check your email to verify your account.',
        data: {
          id: user.id,
          email: user.email,
          emailVerified: user.emailVerified,
          createdAt: user.createdAt,
        },
      });
    } catch (error: any) {
      console.error('Registration error:', error);
      
      if (error.message === 'Email already registered') {
        res.status(409).json({
          success: false,
          error: error.message,
        });
        return;
      }

      if (error.message.includes('email') || error.message.includes('password')) {
        res.status(400).json({
          success: false,
          error: error.message,
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: 'Registration failed. Please try again.',
      });
    }
  }

  /**
   * Login user
   * POST /api/auth/login
   */
  async login(req: Request, res: Response): Promise<void> {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        res.status(400).json({
          success: false,
          error: 'Email and password are required',
        });
        return;
      }

      const result = await this.authService.login(email, password);

      res.status(200).json({
        success: true,
        message: 'Login successful',
        data: {
          user: {
            id: result.user.id,
            email: result.user.email,
            emailVerified: result.user.emailVerified,
            isAdmin: result.user.isAdmin,
          },
          token: result.token,
        },
      });
    } catch (error: any) {
      console.error('Login error:', error);

      if (error.message === 'Invalid credentials') {
        res.status(401).json({
          success: false,
          error: 'Invalid email or password',
        });
        return;
      }

      if (error.message.includes('locked')) {
        res.status(403).json({
          success: false,
          error: error.message,
        });
        return;
      }

      if (error.message === 'Account is disabled') {
        res.status(403).json({
          success: false,
          error: error.message,
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: 'Login failed. Please try again.',
      });
    }
  }

  /**
   * Verify email with token
   * GET /api/auth/verify-email/:token
   */
  async verifyEmail(req: Request, res: Response): Promise<void> {
    try {
      const { token } = req.params;

      if (!token) {
        res.status(400).json({
          success: false,
          error: 'Verification token is required',
        });
        return;
      }

      await this.authService.verifyEmail(token);

      res.status(200).json({
        success: true,
        message: 'Email verified successfully. You can now log in.',
      });
    } catch (error: any) {
      console.error('Email verification error:', error);

      if (error.message === 'Invalid verification token') {
        res.status(404).json({
          success: false,
          error: 'Invalid or expired verification token',
        });
        return;
      }

      if (error.message === 'Verification token has expired') {
        res.status(410).json({
          success: false,
          error: 'Verification token has expired. Please request a new one.',
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: 'Email verification failed. Please try again.',
      });
    }
  }

  /**
   * Resend verification email
   * POST /api/auth/resend-verification
   */
  async resendVerification(req: Request, res: Response): Promise<void> {
    try {
      const { email } = req.body;

      if (!email) {
        res.status(400).json({
          success: false,
          error: 'Email is required',
        });
        return;
      }

      await this.authService.resendVerificationEmail(email);

      res.status(200).json({
        success: true,
        message: 'Verification email sent. Please check your inbox.',
      });
    } catch (error: any) {
      console.error('Resend verification error:', error);

      if (error.message === 'User not found') {
        res.status(404).json({
          success: false,
          error: 'No account found with that email address',
        });
        return;
      }

      if (error.message === 'Email already verified') {
        res.status(400).json({
          success: false,
          error: 'Email is already verified',
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: 'Failed to send verification email. Please try again.',
      });
    }
  }

  /**
   * Request password reset
   * POST /api/auth/reset-password
   */
  async requestPasswordReset(req: Request, res: Response): Promise<void> {
    try {
      const { email } = req.body;

      if (!email) {
        res.status(400).json({
          success: false,
          error: 'Email is required',
        });
        return;
      }

      await this.authService.resetPassword(email);

      // Always return success for security (don't reveal if email exists)
      res.status(200).json({
        success: true,
        message: 'If an account exists with that email, a password reset link has been sent.',
      });
    } catch (error: any) {
      console.error('Password reset request error:', error);

      res.status(500).json({
        success: false,
        error: 'Failed to process password reset request. Please try again.',
      });
    }
  }

  /**
   * Complete password reset with token
   * POST /api/auth/reset-password/:token
   */
  async completePasswordReset(req: Request, res: Response): Promise<void> {
    try {
      const { token } = req.params;
      const { password } = req.body;

      if (!token) {
        res.status(400).json({
          success: false,
          error: 'Reset token is required',
        });
        return;
      }

      if (!password) {
        res.status(400).json({
          success: false,
          error: 'New password is required',
        });
        return;
      }

      await this.authService.completePasswordReset(token, password);

      res.status(200).json({
        success: true,
        message: 'Password reset successful. You can now log in with your new password.',
      });
    } catch (error: any) {
      console.error('Password reset completion error:', error);

      if (error.message === 'Invalid reset token') {
        res.status(404).json({
          success: false,
          error: 'Invalid or expired reset token',
        });
        return;
      }

      if (error.message === 'Reset token has expired') {
        res.status(410).json({
          success: false,
          error: 'Reset token has expired. Please request a new one.',
        });
        return;
      }

      if (error.message.includes('password')) {
        res.status(400).json({
          success: false,
          error: error.message,
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: 'Password reset failed. Please try again.',
      });
    }
  }

  /**
   * Logout user
   * POST /api/auth/logout
   */
  async logout(req: Request, res: Response): Promise<void> {
    try {
      // Extract user ID from authenticated request (set by auth middleware)
      const userId = (req as any).user?.userId;
      const token = req.headers.authorization?.replace('Bearer ', '');

      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Not authenticated',
        });
        return;
      }

      await this.authService.logout(userId, token);

      res.status(200).json({
        success: true,
        message: 'Logout successful',
      });
    } catch (error: any) {
      console.error('Logout error:', error);

      res.status(500).json({
        success: false,
        error: 'Logout failed. Please try again.',
      });
    }
  }
}
