# Email Verification System

This document describes the email verification system implemented for user authentication.

## Overview

The email verification system ensures that users provide valid email addresses during registration. It includes:

- Email verification token generation and validation
- Verification email sending (SendGrid integration or console logging for development)
- Password reset functionality
- Account activation logic

## Components

### 1. EmailService

Located in `src/services/EmailService.ts`

**Key Features:**
- Sends verification emails with secure tokens
- Sends password reset emails
- Supports SendGrid integration for production
- Falls back to console logging in development mode
- Generates secure random tokens using crypto
- Manages token expiration dates

**Methods:**
- `sendVerificationEmail(email, token, baseUrl)` - Send email verification
- `sendPasswordResetEmail(email, token, baseUrl)` - Send password reset
- `EmailService.generateToken(length)` - Generate secure random token
- `EmailService.generateTokenExpiration(hours)` - Generate expiration date

### 2. AuthService Updates

Located in `src/services/AuthService.ts`

**New Methods:**
- `verifyEmail(token)` - Verify email with token and activate account
- `resetPassword(email)` - Initiate password reset process
- `completePasswordReset(token, newPassword)` - Complete password reset
- `resendVerificationEmail(email)` - Resend verification email

**Updated Methods:**
- `register(email, password)` - Now generates verification token and sends email

### 3. User Entity Updates

Located in `src/models/entities/User.ts`

**New Fields:**
- `emailVerificationToken` - Token for email verification
- `emailVerificationTokenExpires` - Token expiration timestamp
- `passwordResetToken` - Token for password reset
- `passwordResetTokenExpires` - Reset token expiration timestamp

### 4. AuthController

Located in `src/api/AuthController.ts`

**New Endpoints:**
- `GET /api/auth/verify-email/:token` - Verify email with token
- `POST /api/auth/resend-verification` - Resend verification email
- `POST /api/auth/reset-password` - Request password reset
- `POST /api/auth/reset-password/:token` - Complete password reset

## Database Migration

A new migration adds the token fields to the users table:

```bash
npm run migration:run
```

Migration file: `src/database/migrations/1700000006000-AddEmailVerificationTokens.ts`

## Configuration

### Environment Variables

Add to `.env` file:

```bash
# Email Service
SENDGRID_API_KEY=your-sendgrid-api-key-here
EMAIL_FROM=noreply@rutty.app
BASE_URL=http://localhost:8080
```

### Development Mode

In development (NODE_ENV !== 'production'), emails are logged to console instead of being sent. This allows testing without configuring SendGrid.

### Production Mode

In production with SENDGRID_API_KEY configured, emails are sent via SendGrid's API.

## Usage Examples

### 1. User Registration with Email Verification

```typescript
import { AuthService } from './services/AuthService';
import { DatabaseService } from './services/DatabaseService';

const databaseService = new DatabaseService();
await databaseService.connect();

const authService = new AuthService(databaseService);

// Register user - automatically sends verification email
const user = await authService.register('user@example.com', 'password123');
console.log(`Verification email sent to: ${user.email}`);
```

### 2. Email Verification

```typescript
// User clicks link in email: /api/auth/verify-email/{token}
const verified = await authService.verifyEmail(token);
if (verified) {
  console.log('Email verified successfully!');
}
```

### 3. Resend Verification Email

```typescript
await authService.resendVerificationEmail('user@example.com');
```

### 4. Password Reset Flow

```typescript
// Step 1: Request password reset
await authService.resetPassword('user@example.com');

// Step 2: User clicks link in email and provides new password
await authService.completePasswordReset(resetToken, 'newPassword123');
```

## API Endpoints

### Register User
```
POST /api/auth/register
Body: { email, password }
Response: { success, message, data: { id, email, emailVerified, createdAt } }
```

### Verify Email
```
GET /api/auth/verify-email/:token
Response: { success, message }
```

### Resend Verification
```
POST /api/auth/resend-verification
Body: { email }
Response: { success, message }
```

### Request Password Reset
```
POST /api/auth/reset-password
Body: { email }
Response: { success, message }
```

### Complete Password Reset
```
POST /api/auth/reset-password/:token
Body: { password }
Response: { success, message }
```

## Security Features

1. **Secure Token Generation**: Uses crypto.randomBytes for cryptographically secure tokens
2. **Token Expiration**: 
   - Email verification tokens expire in 24 hours
   - Password reset tokens expire in 1 hour
3. **One-Time Use**: Tokens are cleared after successful use
4. **Session Invalidation**: Password reset invalidates all existing sessions
5. **Email Privacy**: Password reset doesn't reveal if email exists in system

## Testing

Run tests:
```bash
npm test EmailService.test.ts
npm test AuthService.test.ts
```

Tests cover:
- Email sending in development mode
- Token generation and validation
- Email format validation
- Password strength validation
- Verification flow
- Password reset flow

## Error Handling

The system handles various error cases:

- Invalid email format (400)
- Email already registered (409)
- Invalid verification token (404)
- Expired verification token (410)
- Invalid reset token (404)
- Expired reset token (410)
- Email already verified (400)
- User not found (404)

## Future Enhancements

Potential improvements:
- Email template customization
- Multi-language support for emails
- Rate limiting for verification email resends
- Email verification reminder system
- Alternative email providers (AWS SES, Mailgun)
- Email verification analytics

## Troubleshooting

### Emails not being sent in production

1. Check SENDGRID_API_KEY is set correctly
2. Verify SendGrid account is active
3. Check SendGrid API key permissions
4. Review application logs for errors

### Verification links not working

1. Ensure BASE_URL is set correctly
2. Check token hasn't expired
3. Verify database contains the token
4. Check for typos in the token

### Development mode emails

In development, emails are logged to console. Look for:
```
=== EMAIL (Development Mode) ===
To: user@example.com
...
```

## Related Files

- `src/services/EmailService.ts` - Email service implementation
- `src/services/AuthService.ts` - Authentication service with verification
- `src/api/AuthController.ts` - API endpoints
- `src/models/entities/User.ts` - User entity with token fields
- `src/database/migrations/1700000006000-AddEmailVerificationTokens.ts` - Database migration
- `src/examples/EmailVerificationExample.ts` - Usage examples
