-- ============================================
-- Rutty Database Setup Script for Neon
-- ============================================
-- Run this script in your Neon SQL Editor
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. CREATE USERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    email_verified BOOLEAN DEFAULT FALSE NOT NULL,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    is_admin BOOLEAN DEFAULT FALSE NOT NULL,
    failed_login_attempts INTEGER DEFAULT 0 NOT NULL,
    account_locked_until TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL,
    last_login_at TIMESTAMP
);

-- Create indexes for users table
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_active ON users(is_active);

-- ============================================
-- 2. CREATE USER PREFERENCES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS user_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    preferred_transportation_modes TEXT[],
    avoid_highways BOOLEAN DEFAULT FALSE,
    avoid_tolls BOOLEAN DEFAULT FALSE,
    accessibility_requirements TEXT[],
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL,
    UNIQUE(user_id)
);

-- Create index for user_preferences
CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON user_preferences(user_id);

-- ============================================
-- 3. CREATE TRIPS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS trips (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    origin_lat DECIMAL(10, 8) NOT NULL,
    origin_lng DECIMAL(11, 8) NOT NULL,
    origin_name VARCHAR(255),
    destination_lat DECIMAL(10, 8) NOT NULL,
    destination_lng DECIMAL(11, 8) NOT NULL,
    destination_name VARCHAR(255),
    selected_route JSONB NOT NULL,
    actual_transportation_mode VARCHAR(100) NOT NULL,
    carbon_savings DECIMAL(10, 3),
    distance DECIMAL(10, 2),
    duration INTEGER,
    completed_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Create indexes for trips table
CREATE INDEX IF NOT EXISTS idx_trips_user_id ON trips(user_id);
CREATE INDEX IF NOT EXISTS idx_trips_completed_at ON trips(completed_at);

-- ============================================
-- 4. CREATE SESSIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(500) UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    last_accessed_at TIMESTAMP DEFAULT NOW() NOT NULL,
    ip_address VARCHAR(45),
    user_agent TEXT
);

-- Create indexes for sessions table
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);

-- ============================================
-- 5. CREATE AUDIT LOGS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(100),
    entity_id UUID,
    changes JSONB,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Create indexes for audit_logs table
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);

-- ============================================
-- 6. CREATE EMAIL VERIFICATION TOKENS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS email_verification_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(500) UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    used_at TIMESTAMP
);

-- Create indexes for email_verification_tokens table
CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_user_id ON email_verification_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_token ON email_verification_tokens(token);

-- ============================================
-- 7. CREATE API KEYS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    key_hash VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    last_used_at TIMESTAMP,
    expires_at TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Create indexes for api_keys table
CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_key_hash ON api_keys(key_hash);

-- ============================================
-- 8. INSERT TEST USERS
-- ============================================
-- Note: Password for all test users is 'password123'
-- Hash generated using bcrypt with 10 rounds

-- Admin User (email: admin@rutty.com, password: password123)
INSERT INTO users (email, password_hash, email_verified, is_active, is_admin, created_at, updated_at)
VALUES (
    'admin@rutty.com',
    '$2b$10$V.RAa5nFqazjs5PMAm3yh.KUfJ6bZkwhP5QMExXOyNkwt2f6xDc/C',
    TRUE,
    TRUE,
    TRUE,
    NOW(),
    NOW()
) ON CONFLICT (email) DO NOTHING;

-- Regular Test User 1 (email: user1@example.com, password: password123)
INSERT INTO users (email, password_hash, email_verified, is_active, is_admin, created_at, updated_at)
VALUES (
    'user1@example.com',
    '$2b$10$V.RAa5nFqazjs5PMAm3yh.KUfJ6bZkwhP5QMExXOyNkwt2f6xDc/C',
    TRUE,
    TRUE,
    FALSE,
    NOW(),
    NOW()
) ON CONFLICT (email) DO NOTHING;

-- Regular Test User 2 (email: user2@example.com, password: password123)
INSERT INTO users (email, password_hash, email_verified, is_active, is_admin, created_at, updated_at)
VALUES (
    'user2@example.com',
    '$2b$10$V.RAa5nFqazjs5PMAm3yh.KUfJ6bZkwhP5QMExXOyNkwt2f6xDc/C',
    TRUE,
    TRUE,
    FALSE,
    NOW(),
    NOW()
) ON CONFLICT (email) DO NOTHING;

-- Eco Enthusiast User (email: eco.warrior@example.com, password: password123)
INSERT INTO users (email, password_hash, email_verified, is_active, is_admin, created_at, updated_at)
VALUES (
    'eco.warrior@example.com',
    '$2b$10$V.RAa5nFqazjs5PMAm3yh.KUfJ6bZkwhP5QMExXOyNkwt2f6xDc/C',
    TRUE,
    TRUE,
    FALSE,
    NOW(),
    NOW()
) ON CONFLICT (email) DO NOTHING;

-- ============================================
-- 9. VERIFICATION
-- ============================================
-- Check if tables were created successfully
SELECT 'Tables created successfully!' AS status;

-- Show all users
SELECT 
    email, 
    email_verified, 
    is_active, 
    is_admin,
    created_at
FROM users
ORDER BY is_admin DESC, email;

-- Show table counts
SELECT 
    'users' AS table_name, 
    COUNT(*) AS record_count 
FROM users
UNION ALL
SELECT 
    'trips' AS table_name, 
    COUNT(*) AS record_count 
FROM trips
UNION ALL
SELECT 
    'sessions' AS table_name, 
    COUNT(*) AS record_count 
FROM sessions;

-- ============================================
-- NOTES:
-- ============================================
-- 1. All test users have the password: 'password123'
-- 2. The password hash shown above is a placeholder
-- 3. You need to generate real bcrypt hashes for production
-- 4. Admin user: admin@rutty.com
-- 5. Test users: user1@example.com, user2@example.com, eco.warrior@example.com
-- ============================================
