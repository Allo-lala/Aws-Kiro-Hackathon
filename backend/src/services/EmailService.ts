import * as crypto from 'crypto';

/**
 * Email Service for sending verification and notification emails
 * Supports SendGrid integration or console logging for development
 */
export class EmailService {
  private sendGridApiKey: string | undefined;
  private emailFrom: string;
  private isDevelopment: boolean;

  constructor() {
    this.sendGridApiKey = process.env.SENDGRID_API_KEY;
    this.emailFrom = process.env.EMAIL_FROM || 'noreply@rutty.app';
    this.isDevelopment = process.env.NODE_ENV !== 'production';
  }

  /**
   * Send email verification email to user
   * @param email - Recipient email address
   * @param verificationToken - Token for email verification
   * @param baseUrl - Base URL for verification link (e.g., http://localhost:8080)
   */
  async sendVerificationEmail(
    email: string,
    verificationToken: string,
    baseUrl: string = 'http://localhost:8080'
  ): Promise<void> {
    const verificationUrl = `${baseUrl}/api/auth/verify-email/${verificationToken}`;

    const subject = 'Verify Your Email - Rutty Eco-Friendly Route Planner';
    const htmlContent = `
      <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #2e7d32;">Welcome to Rutty!</h2>
            <p>Thank you for registering with Rutty, your eco-friendly route planning companion.</p>
            <p>Please verify your email address by clicking the button below:</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${verificationUrl}" 
                 style="background-color: #2e7d32; color: white; padding: 12px 30px; 
                        text-decoration: none; border-radius: 5px; display: inline-block;">
                Verify Email Address
              </a>
            </div>
            <p style="color: #666; font-size: 14px;">
              Or copy and paste this link into your browser:<br>
              <a href="${verificationUrl}">${verificationUrl}</a>
            </p>
            <p style="color: #666; font-size: 14px;">
              This verification link will expire in 24 hours.
            </p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
            <p style="color: #999; font-size: 12px;">
              If you didn't create an account with Rutty, please ignore this email.
            </p>
          </div>
        </body>
      </html>
    `;

    const textContent = `
Welcome to Rutty!

Thank you for registering with Rutty, your eco-friendly route planning companion.

Please verify your email address by visiting this link:
${verificationUrl}

This verification link will expire in 24 hours.

If you didn't create an account with Rutty, please ignore this email.
    `;

    await this.sendEmail(email, subject, htmlContent, textContent);
  }

  /**
   * Send password reset email to user
   * @param email - Recipient email address
   * @param resetToken - Token for password reset
   * @param baseUrl - Base URL for reset link
   */
  async sendPasswordResetEmail(
    email: string,
    resetToken: string,
    baseUrl: string = 'http://localhost:8080'
  ): Promise<void> {
    const resetUrl = `${baseUrl}/reset-password/${resetToken}`;

    const subject = 'Password Reset Request - Rutty';
    const htmlContent = `
      <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #2e7d32;">Password Reset Request</h2>
            <p>We received a request to reset your password for your Rutty account.</p>
            <p>Click the button below to reset your password:</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetUrl}" 
                 style="background-color: #2e7d32; color: white; padding: 12px 30px; 
                        text-decoration: none; border-radius: 5px; display: inline-block;">
                Reset Password
              </a>
            </div>
            <p style="color: #666; font-size: 14px;">
              Or copy and paste this link into your browser:<br>
              <a href="${resetUrl}">${resetUrl}</a>
            </p>
            <p style="color: #666; font-size: 14px;">
              This reset link will expire in 1 hour.
            </p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
            <p style="color: #999; font-size: 12px;">
              If you didn't request a password reset, please ignore this email. Your password will remain unchanged.
            </p>
          </div>
        </body>
      </html>
    `;

    const textContent = `
Password Reset Request

We received a request to reset your password for your Rutty account.

Visit this link to reset your password:
${resetUrl}

This reset link will expire in 1 hour.

If you didn't request a password reset, please ignore this email. Your password will remain unchanged.
    `;

    await this.sendEmail(email, subject, htmlContent, textContent);
  }

  /**
   * Send password reset email by admin with temporary password
   * @param email - Recipient email address
   * @param tempPassword - Temporary password generated by admin
   */
  async sendPasswordResetByAdmin(email: string, tempPassword: string): Promise<void> {
    const subject = 'Your Password Has Been Reset - Rutty';
    const htmlContent = `
      <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #2e7d32;">Password Reset by Administrator</h2>
            <p>Your password has been reset by a system administrator.</p>
            <p>Your temporary password is:</p>
            <div style="background-color: #f5f5f5; padding: 15px; margin: 20px 0; 
                        border-left: 4px solid #2e7d32; font-family: monospace; font-size: 18px;">
              ${tempPassword}
            </div>
            <p style="color: #d32f2f; font-weight: bold;">
              ⚠️ Please change this password immediately after logging in.
            </p>
            <p>For security reasons, we recommend:</p>
            <ul>
              <li>Using a strong, unique password</li>
              <li>Not sharing your password with anyone</li>
              <li>Enabling two-factor authentication if available</li>
            </ul>
            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
            <p style="color: #999; font-size: 12px;">
              If you did not request this password reset, please contact support immediately.
            </p>
          </div>
        </body>
      </html>
    `;

    const textContent = `
Your Password Has Been Reset

Your password has been reset by a system administrator.

Your temporary password is: ${tempPassword}

⚠️ Please change this password immediately after logging in.

For security reasons, we recommend:
- Using a strong, unique password
- Not sharing your password with anyone
- Enabling two-factor authentication if available

If you did not request this password reset, please contact support immediately.
    `;

    await this.sendEmail(email, subject, htmlContent, textContent);
  }

  /**
   * Send email using SendGrid or log to console in development
   * @param to - Recipient email address
   * @param subject - Email subject
   * @param htmlContent - HTML email content
   * @param textContent - Plain text email content
   */
  private async sendEmail(
    to: string,
    subject: string,
    htmlContent: string,
    textContent: string
  ): Promise<void> {
    // In development or when SendGrid is not configured, log to console
    if (this.isDevelopment || !this.sendGridApiKey) {
      console.log('\n=== EMAIL (Development Mode) ===');
      console.log(`To: ${to}`);
      console.log(`From: ${this.emailFrom}`);
      console.log(`Subject: ${subject}`);
      console.log('---');
      console.log(textContent);
      console.log('================================\n');
      return;
    }

    // In production with SendGrid configured, send actual email
    try {
      // Using SendGrid's REST API directly to avoid additional dependencies
      const axios = require('axios');
      
      const response = await axios.post(
        'https://api.sendgrid.com/v3/mail/send',
        {
          personalizations: [
            {
              to: [{ email: to }],
              subject: subject,
            },
          ],
          from: { email: this.emailFrom },
          content: [
            {
              type: 'text/plain',
              value: textContent,
            },
            {
              type: 'text/html',
              value: htmlContent,
            },
          ],
        },
        {
          headers: {
            Authorization: `Bearer ${this.sendGridApiKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      console.log(`Email sent successfully to ${to}`);
    } catch (error: any) {
      console.error('Failed to send email:', error.response?.data || error.message);
      throw new Error('Failed to send email');
    }
  }

  /**
   * Generate a secure random token for email verification or password reset
   * @param length - Length of token in bytes (default 32)
   * @returns Hex-encoded token string
   */
  static generateToken(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * Generate token expiration date
   * @param hours - Number of hours until expiration (default 24)
   * @returns Expiration date
   */
  static generateTokenExpiration(hours: number = 24): Date {
    const expiration = new Date();
    expiration.setHours(expiration.getHours() + hours);
    return expiration;
  }
}
