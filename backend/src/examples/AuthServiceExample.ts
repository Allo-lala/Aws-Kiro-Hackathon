/**
 * Example usage of the AuthService
 * 
 * This file demonstrates how to use the authentication service
 * for user registration, login, and token validation.
 */

import { AuthService } from '../services/AuthService';
import { DatabaseService } from '../services/DatabaseService';

async function authServiceExample() {
  // Initialize database service
  const databaseService = new DatabaseService();
  await databaseService.connect();
  await databaseService.runMigrations();

  // Initialize auth service
  const authService = new AuthService(databaseService);

  try {
    // Example 1: Register a new user
    console.log('=== Example 1: User Registration ===');
    const newUser = await authService.register('user@example.com', 'securePassword123');
    console.log('User registered:', {
      id: newUser.id,
      email: newUser.email,
      emailVerified: newUser.emailVerified,
      isActive: newUser.isActive,
    });

    // Example 2: Login with valid credentials
    console.log('\n=== Example 2: User Login ===');
    const loginResult = await authService.login('user@example.com', 'securePassword123');
    console.log('Login successful:', {
      userId: loginResult.user.id,
      email: loginResult.user.email,
      token: loginResult.token.substring(0, 20) + '...',
    });

    // Example 3: Validate JWT token
    console.log('\n=== Example 3: Token Validation ===');
    const validatedUser = await authService.validateToken(loginResult.token);
    console.log('Token validated for user:', {
      id: validatedUser.id,
      email: validatedUser.email,
    });

    // Example 4: Failed login attempt
    console.log('\n=== Example 4: Failed Login Attempt ===');
    try {
      await authService.login('user@example.com', 'wrongPassword');
    } catch (error) {
      console.log('Login failed as expected:', (error as Error).message);
    }

    // Example 5: Password hashing
    console.log('\n=== Example 5: Password Hashing ===');
    const password = 'mySecretPassword';
    const hash = await authService.hashPassword(password);
    console.log('Password hashed:', hash.substring(0, 30) + '...');
    
    const isValid = await authService.comparePassword(password, hash);
    console.log('Password verification:', isValid);

    // Example 6: Duplicate email registration
    console.log('\n=== Example 6: Duplicate Email Registration ===');
    try {
      await authService.register('user@example.com', 'anotherPassword');
    } catch (error) {
      console.log('Duplicate registration prevented:', (error as Error).message);
    }

    // Example 7: Invalid email format
    console.log('\n=== Example 7: Invalid Email Format ===');
    try {
      await authService.register('invalid-email', 'password123');
    } catch (error) {
      console.log('Invalid email rejected:', (error as Error).message);
    }

    // Example 8: Weak password
    console.log('\n=== Example 8: Weak Password ===');
    try {
      await authService.register('another@example.com', 'short');
    } catch (error) {
      console.log('Weak password rejected:', (error as Error).message);
    }

  } catch (error) {
    console.error('Error in auth service example:', error);
  } finally {
    // Clean up
    await databaseService.disconnect();
  }
}

// Run the example if this file is executed directly
if (require.main === module) {
  authServiceExample().catch(console.error);
}

export { authServiceExample };
