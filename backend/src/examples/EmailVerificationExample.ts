/**
 * Email Verification System Example
 * 
 * This example demonstrates how to use the email verification system
 * for user registration and account activation.
 */

import { DatabaseService } from '../services/DatabaseService';
import { AuthService } from '../services/AuthService';
import { EmailService } from '../services/EmailService';

async function emailVerificationExample() {
  console.log('=== Email Verification System Example ===\n');

  // Initialize services
  const databaseService = new DatabaseService();
  await databaseService.connect();

  const emailService = new EmailService();
  const authService = new AuthService(databaseService, emailService);

  try {
    // 1. Register a new user
    console.log('1. Registering new user...');
    const user = await authService.register('newuser@example.com', 'SecurePass123');
    console.log(`   ✓ User registered: ${user.email}`);
    console.log(`   ✓ Email verified: ${user.emailVerified}`);
    console.log(`   ✓ Verification token generated: ${user.emailVerificationToken ? 'Yes' : 'No'}`);
    console.log(`   ✓ Token expires: ${user.emailVerificationTokenExpires?.toISOString()}\n`);

    // In development mode, the verification email is logged to console
    // In production with SendGrid configured, it would be sent via email

    // 2. Verify email with token
    console.log('2. Verifying email with token...');
    if (user.emailVerificationToken) {
      const verified = await authService.verifyEmail(user.emailVerificationToken);
      console.log(`   ✓ Email verification successful: ${verified}\n`);
    }

    // 3. Try to verify with invalid token
    console.log('3. Testing invalid token...');
    try {
      await authService.verifyEmail('invalid-token-123');
    } catch (error: any) {
      console.log(`   ✓ Invalid token rejected: ${error.message}\n`);
    }

    // 4. Resend verification email
    console.log('4. Resending verification email...');
    try {
      // This will fail because email is already verified
      await authService.resendVerificationEmail('newuser@example.com');
    } catch (error: any) {
      console.log(`   ✓ Already verified: ${error.message}\n`);
    }

    // 5. Password reset flow
    console.log('5. Testing password reset flow...');
    await authService.resetPassword('newuser@example.com');
    console.log('   ✓ Password reset email sent\n');

    // 6. Token generation utilities
    console.log('6. Token generation utilities...');
    const token = EmailService.generateToken();
    const expiration = EmailService.generateTokenExpiration(24);
    console.log(`   ✓ Generated token: ${token.substring(0, 20)}...`);
    console.log(`   ✓ Token length: ${token.length} characters`);
    console.log(`   ✓ Expires at: ${expiration.toISOString()}\n`);

    console.log('=== Example completed successfully ===');
  } catch (error: any) {
    console.error('Error:', error.message);
  } finally {
    await databaseService.disconnect();
  }
}

// Run example if executed directly
if (require.main === module) {
  emailVerificationExample().catch(console.error);
}

export { emailVerificationExample };
