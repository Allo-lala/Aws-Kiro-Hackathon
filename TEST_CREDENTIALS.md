# Test Credentials - Production Database

## Quick Reference

Use these credentials to test the production deployment.

---

## Admin Accounts

### Admin Account 1
```
Email: admin@rutty.com
Password: (use existing password)
Role: Administrator
Status: Active, Email Verified
```

### Admin Account 2
```
Email: admin@example.com
Password: AdminPassword123!
Role: Administrator
Status: Active, Email Verified
```

---

## Regular User Accounts

### Test User 1
```
Email: test@example.com
Password: TestPassword123!
Role: Regular User
Status: Active, Email Verified
Features: Has preferences and sample trips
```

### Test User 2
```
Email: user@example.com
Password: UserPassword123!
Role: Regular User
Status: Active, Email Verified
Features: Has preferences and sample trips
```

### Existing Users
```
Email: user1@example.com
Password: (use existing password)
Role: Regular User
Status: Active, Email Verified
```

```
Email: user2@example.com
Password: (use existing password)
Role: Regular User
Status: Active, Email Verified
```

```
Email: eco.warrior@example.com
Password: (use existing password)
Role: Regular User
Status: Active, Email Verified
```

---

## Testing Endpoints

### Login Test
```bash
curl -X POST https://aws-kiro-hackathon-ijw4.vercel.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPassword123!"
  }'
```

### Register Test
```bash
curl -X POST https://aws-kiro-hackathon-ijw4.vercel.app/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "newuser@example.com",
    "password": "NewPassword123!"
  }'
```

### Get User Profile (requires auth token)
```bash
curl -X GET https://aws-kiro-hackathon-ijw4.vercel.app/api/users/profile \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## Frontend Testing

### Login via Frontend
1. Go to: https://rutty.vercel.app
2. Click "Login"
3. Use any of the credentials above
4. Test route planning features

### Admin Features
1. Login with admin credentials
2. Access admin dashboard
3. View user management
4. Check system metrics

---

## Database Access

### Direct Database Connection
```bash
psql 'postgresql://neondb_owner:npg_3sd1BnkixEJH@ep-late-bird-adwiv80k-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require'
```

### Query Examples
```sql
-- View all users
SELECT email, is_admin, email_verified, created_at FROM users;

-- View user preferences
SELECT u.email, up.* 
FROM user_preferences up 
JOIN users u ON u.id = up.user_id;

-- View trips
SELECT u.email, t.origin_name, t.destination_name, t.carbon_savings 
FROM trips t 
JOIN users u ON u.id = t.user_id;
```

---

## Security Notes

⚠️ **Important:**
- These are TEST credentials for development/testing only
- Change passwords for production use
- Never share credentials publicly
- Rotate secrets regularly
- Monitor for suspicious activity

---

## Password Requirements

When creating new users, passwords must:
- Be at least 8 characters long
- Contain at least one uppercase letter
- Contain at least one lowercase letter
- Contain at least one number
- Contain at least one special character

---

*Last Updated: November 28, 2024*
