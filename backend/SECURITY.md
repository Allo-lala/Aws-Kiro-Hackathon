# Security Hardening Documentation

This document describes the security measures implemented in the Rutty backend application.

## Overview

The application implements multiple layers of security to protect against common vulnerabilities and attacks:

1. **Rate Limiting** - Prevents abuse and brute force attacks
2. **SQL Injection Prevention** - Uses parameterized queries
3. **Input Sanitization** - Removes malicious input
4. **Secure HTTP Headers** - Protects against XSS, clickjacking, etc.
5. **CSRF Protection** - Prevents cross-site request forgery
6. **API Key Rotation** - Manages external service credentials

## 1. Rate Limiting

### Implementation
Rate limiting is implemented using `express-rate-limit` middleware with different limits for different endpoint types.

### Rate Limits

#### General API Limiter
- **Limit**: 100 requests per 15 minutes per IP
- **Applied to**: All `/api/*` routes
- **Response**: 429 Too Many Requests with retry-after header

#### Authentication Limiter
- **Limit**: 5 requests per 15 minutes per IP
- **Applied to**: All `/api/auth/*` routes
- **Purpose**: Prevent brute force attacks on login/registration
- **Response**: 429 Too Many Requests

#### Route Calculation Limiter
- **Limit**: 20 requests per 15 minutes per IP
- **Applied to**: All `/api/routes/*` routes
- **Purpose**: Prevent API quota exhaustion
- **Response**: 429 Too Many Requests

#### Admin Operations Limiter
- **Limit**: 30 requests per 15 minutes per IP
- **Applied to**: All `/api/admin/*` routes
- **Purpose**: Prevent admin account abuse
- **Response**: 429 Too Many Requests

### Configuration
Rate limiters can be adjusted by modifying `backend/src/middleware/rateLimiter.ts`.

## 2. SQL Injection Prevention

### Implementation
The application uses TypeORM which automatically uses parameterized queries for all database operations.

### Best Practices
- **Never** concatenate user input directly into SQL queries
- Always use TypeORM query builders or repository methods
- Use parameterized queries for raw SQL: `query($1, $2)` with parameter array

### Example
```typescript
// ✅ SAFE - Parameterized query
const result = await this.databaseService.query(
  'SELECT * FROM users WHERE email = $1',
  [email]
);

// ❌ UNSAFE - String concatenation (never do this)
const result = await this.databaseService.query(
  `SELECT * FROM users WHERE email = '${email}'`
);
```

## 3. Input Sanitization

### Implementation
Custom middleware (`sanitizeInput`) processes all incoming requests to remove potentially dangerous content.

### What is Sanitized
- **MongoDB operators**: Removes keys starting with `$`
- **Null bytes**: Removes `\0` characters
- **HTML special characters**: Escapes `<`, `>`, `&`, `"`, `'`, `/`
- **Recursive**: Sanitizes nested objects and arrays

### Applied To
- Request body (`req.body`)
- Query parameters (`req.query`)
- URL parameters (`req.params`)

### Location
`backend/src/middleware/security.ts`

## 4. Secure HTTP Headers

### Implementation
Uses `helmet.js` to set secure HTTP headers that protect against common web vulnerabilities.

### Headers Configured

#### Content Security Policy (CSP)
- Restricts resource loading to same origin
- Prevents inline scripts (XSS protection)
- Blocks object/embed tags

#### Strict Transport Security (HSTS)
- Forces HTTPS connections
- Max age: 1 year
- Includes subdomains
- Preload enabled

#### X-Frame-Options
- Set to `DENY`
- Prevents clickjacking attacks

#### X-Content-Type-Options
- Set to `nosniff`
- Prevents MIME type sniffing

#### X-XSS-Protection
- Enables browser XSS filter

#### Referrer-Policy
- Set to `strict-origin-when-cross-origin`
- Limits referrer information leakage

#### X-Powered-By
- Removed to hide technology stack

### Location
`backend/src/middleware/security.ts`

## 5. CSRF Protection

### Implementation
Custom CSRF token validation for state-changing operations.

### How It Works
1. Client requests CSRF token via `GET /api/auth/csrf-token`
2. Server generates token based on user ID and secret
3. Client includes token in `X-CSRF-Token` header or `_csrf` body field
4. Server validates token on POST/PUT/DELETE requests

### Protected Methods
- POST
- PUT
- DELETE
- PATCH

### Exempt Methods
- GET
- HEAD
- OPTIONS

### Usage
```typescript
// Frontend example
const response = await fetch('/api/auth/csrf-token', {
  headers: { Authorization: `Bearer ${token}` }
});
const { csrfToken } = await response.json();

// Include in subsequent requests
await fetch('/api/users/me', {
  method: 'PUT',
  headers: {
    'Authorization': `Bearer ${token}`,
    'X-CSRF-Token': csrfToken,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(data)
});
```

### Location
`backend/src/middleware/security.ts`

## 6. API Key Rotation

### Implementation
Automated API key management system for external service integrations.

### Features
- **Key Generation**: Cryptographically secure random keys
- **Expiration**: Optional expiration dates
- **Rotation**: Deactivate old keys and create new ones
- **Usage Tracking**: Track when keys are last used
- **Audit Logging**: All rotations are logged

### Database Schema
```sql
CREATE TABLE api_keys (
  id UUID PRIMARY KEY,
  service_name VARCHAR(100),
  key_value VARCHAR(255),
  is_active BOOLEAN,
  created_at TIMESTAMP,
  expires_at TIMESTAMP,
  rotated_at TIMESTAMP,
  last_used_at TIMESTAMP
);
```

### Admin Endpoints

#### List API Keys
```
GET /api/admin/api-keys/:serviceName
```

#### Rotate API Key
```
POST /api/admin/api-keys/:serviceName/rotate
Body: { "expiresInDays": 90 }
```

#### Get Keys Needing Rotation
```
GET /api/admin/api-keys/rotation-schedule?daysBeforeExpiry=7
```

### Usage Example
```typescript
import { ApiKeyRotationService } from './services/ApiKeyRotationService';

const apiKeyService = new ApiKeyRotationService(databaseService);

// Create new key
const key = await apiKeyService.createApiKey('google_maps', 90);

// Rotate key
const newKey = await apiKeyService.rotateApiKey('google_maps', 90);

// Get active key
const activeKey = await apiKeyService.getActiveApiKey('google_maps');
```

### Location
`backend/src/services/ApiKeyRotationService.ts`

## Environment Variables

### Required Security Variables
```env
# JWT Secret (use strong random string)
JWT_SECRET=your-secure-jwt-secret-here

# CSRF Secret (use strong random string)
CSRF_SECRET=your-secure-csrf-secret-here

# Allowed CORS Origins (comma-separated)
ALLOWED_ORIGINS=http://localhost:3000,https://yourdomain.com

# Node Environment
NODE_ENV=production
```

## Security Checklist

- [x] Rate limiting on all API endpoints
- [x] SQL injection prevention via parameterized queries
- [x] Input sanitization on all user inputs
- [x] Secure HTTP headers (helmet.js)
- [x] CSRF protection for state-changing operations
- [x] API key rotation mechanism
- [x] Password hashing with bcrypt
- [x] JWT token authentication
- [x] Session management with expiration
- [x] Account lockout after failed login attempts
- [x] Audit logging for admin actions
- [x] HTTPS enforcement (HSTS)
- [x] CORS configuration

## Testing Security

### Rate Limiting Test
```bash
# Test auth rate limit (should block after 5 requests)
for i in {1..10}; do
  curl -X POST http://localhost:3001/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"test@example.com","password":"wrong"}'
done
```

### SQL Injection Test
```bash
# Should be safely handled
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com OR 1=1--","password":"test"}'
```

### XSS Test
```bash
# Should be sanitized
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"<script>alert(1)</script>"}'
```

## Monitoring and Alerts

### Recommended Monitoring
1. **Rate limit violations**: Track IPs hitting rate limits
2. **Failed authentication attempts**: Monitor for brute force attacks
3. **API key expiration**: Alert when keys need rotation
4. **Unusual admin activity**: Alert on suspicious admin actions
5. **Error rates**: Monitor for security-related errors

### Audit Logs
All security-relevant actions are logged in the `audit_logs` table:
- Admin actions
- API key rotations
- Account disable/enable
- Password resets

## Best Practices

1. **Keep dependencies updated**: Regularly update npm packages
2. **Use environment variables**: Never commit secrets to version control
3. **Enable HTTPS**: Always use HTTPS in production
4. **Regular security audits**: Run `npm audit` regularly
5. **Monitor logs**: Review audit logs for suspicious activity
6. **Rotate secrets**: Regularly rotate JWT and CSRF secrets
7. **Backup database**: Regular encrypted backups
8. **Principle of least privilege**: Grant minimum necessary permissions

## Incident Response

If a security incident is detected:

1. **Isolate**: Disable affected accounts/services
2. **Investigate**: Review audit logs and system logs
3. **Rotate**: Rotate all API keys and secrets
4. **Patch**: Apply security updates immediately
5. **Notify**: Inform affected users if necessary
6. **Document**: Record incident details and response

## References

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Express Security Best Practices](https://expressjs.com/en/advanced/best-practice-security.html)
- [Helmet.js Documentation](https://helmetjs.github.io/)
- [TypeORM Security](https://typeorm.io/security)
