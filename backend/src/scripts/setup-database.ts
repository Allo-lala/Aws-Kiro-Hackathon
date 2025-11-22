import 'reflect-metadata';
import { databaseService } from '../services/DatabaseService';

/**
 * Script to set up the database: connect, run migrations, and verify
 */
async function setupDatabase() {
  console.log('Starting database setup...\n');

  try {
    // Step 1: Connect to database
    console.log('Step 1: Connecting to database...');
    await databaseService.connect();
    console.log('✓ Database connected successfully\n');

    // Step 2: Run migrations
    console.log('Step 2: Running migrations...');
    await databaseService.runMigrations();
    console.log('✓ Migrations completed successfully\n');

    // Step 3: Health check
    console.log('Step 3: Performing health check...');
    const isHealthy = await databaseService.healthCheck();
    if (isHealthy) {
      console.log('✓ Database health check passed\n');
    } else {
      console.error('✗ Database health check failed\n');
      process.exit(1);
    }

    // Step 4: Verify schema
    console.log('Step 4: Verifying schema...');
    const dataSource = databaseService.getDataSource();
    const queryRunner = dataSource.createQueryRunner();
    
    try {
      const tables = await queryRunner.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        ORDER BY table_name
      `);
      
      console.log('Tables created:');
      tables.forEach((table: any) => {
        console.log(`  - ${table.table_name}`);
      });
      console.log('✓ Schema verification completed\n');
    } finally {
      await queryRunner.release();
    }

    console.log('Database setup completed successfully!');
    
  } catch (error) {
    console.error('Database setup failed:', error);
    process.exit(1);
  } finally {
    await databaseService.disconnect();
  }
}

// Run the setup
setupDatabase();
