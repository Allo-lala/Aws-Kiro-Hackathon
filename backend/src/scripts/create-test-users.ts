import 'reflect-metadata';
import { DatabaseService } from '../services/DatabaseService';
import { AuthService } from '../services/AuthService';

async function createTestUsers() {
  console.log('🚀 Creating test users...\n');

  const databaseService = new DatabaseService();
  await databaseService.connect();

  const authService = new AuthService(databaseService);

  try {
    // Create regular test user
    console.log('Creating regular test user...');
    const testUser = await authService.register('test@example.com', 'Test123!');
    
    // Verify email immediately for test user
    await databaseService.query(
      'UPDATE users SET email_verified = true, is_active = true WHERE id = $1',
      [testUser.id]
    );
    
    console.log('✅ Test User Created:');
    console.log('   Email: test@example.com');
    console.log('   Password: Test123!');
    console.log('   Status: Email verified, Active\n');

    // Create admin test user
    console.log('Creating admin test user...');
    const adminUser = await authService.register('admin@example.com', 'Admin123!');
    
    // Verify email and set as admin
    await databaseService.query(
      'UPDATE users SET email_verified = true, is_active = true, is_admin = true WHERE id = $1',
      [adminUser.id]
    );
    
    console.log('✅ Admin User Created:');
    console.log('   Email: admin@example.com');
    console.log('   Password: Admin123!');
    console.log('   Status: Email verified, Active, Admin\n');

    console.log('🎉 Test users created successfully!');
    console.log('\nYou can now login with:');
    console.log('  Regular User: test@example.com / Test123!');
    console.log('  Admin User: admin@example.com / Admin123!');

  } catch (error: any) {
    if (error.message?.includes('already exists')) {
      console.log('ℹ️  Test users already exist. Updating them...');
      
      // Update existing users
      await databaseService.query(
        'UPDATE users SET email_verified = true, is_active = true WHERE email = $1',
        ['test@example.com']
      );
      
      await databaseService.query(
        'UPDATE users SET email_verified = true, is_active = true, is_admin = true WHERE email = $1',
        ['admin@example.com']
      );
      
      console.log('✅ Test users updated!');
      console.log('\nYou can now login with:');
      console.log('  Regular User: test@example.com / Test123!');
      console.log('  Admin User: admin@example.com / Admin123!');
    } else {
      console.error('❌ Error creating test users:', error);
    }
  } finally {
    await databaseService.disconnect();
  }
}

createTestUsers();
