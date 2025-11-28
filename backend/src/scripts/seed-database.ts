#!/usr/bin/env node

import { DataSource, DataSourceOptions } from 'typeorm';
import * as bcrypt from 'bcrypt';
import * as path from 'path';
import { UserEntity } from '../models/entities/User';
import { TripEntity } from '../models/entities/Trip';
import { UserPreferencesEntity } from '../models/entities/UserPreferences';

/**
 * Seed Data Manager Script
 * 
 * This script populates the database with initial test data.
 * It accepts a connection string as a command-line argument.
 * 
 * Usage:
 *   ts-node src/scripts/seed-database.ts <connection-string>
 *   ts-node src/scripts/seed-database.ts postgresql://user:pass@host:port/db
 */

interface SeedOptions {
  skipIfExists?: boolean;
  environment?: 'development' | 'staging' | 'production';
}

interface SeedResult {
  usersCreated: number;
  tripsCreated: number;
  preferencesCreated: number;
  success: boolean;
  errors: string[];
}

const SALT_ROUNDS = 10;

/**
 * Validates a PostgreSQL connection string format
 */
function validateConnectionString(connectionString: string): { valid: boolean; error?: string } {
  if (!connectionString || typeof connectionString !== 'string') {
    return { valid: false, error: 'Connection string is required' };
  }

  const postgresUrlPattern = /^postgres(ql)?:\/\/.+/i;
  if (!postgresUrlPattern.test(connectionString)) {
    return { 
      valid: false, 
      error: 'Invalid connection string format. Expected: postgresql://user:password@host:port/database' 
    };
  }

  try {
    const url = new URL(connectionString);
    
    if (!url.hostname) {
      return { valid: false, error: 'Connection string missing hostname' };
    }
    
    if (!url.pathname || url.pathname === '/') {
      return { valid: false, error: 'Connection string missing database name' };
    }

    return { valid: true };
  } catch (error) {
    return { 
      valid: false, 
      error: `Invalid URL format: ${error instanceof Error ? error.message : 'Unknown error'}` 
    };
  }
}

/**
 * Creates a DataSource configuration from a connection string
 */
function createDataSourceConfig(connectionString: string): DataSourceOptions {
  return {
    type: 'postgres',
    url: connectionString,
    synchronize: false,
    logging: process.env.SEED_LOGGING === 'true',
    entities: [path.join(__dirname, '../models/entities/**/*.{ts,js}')],
    migrations: [path.join(__dirname, '../database/migrations/[0-9]*-*.{ts,js}')],
    subscribers: [],
    ssl: {
      rejectUnauthorized: false,
    },
    extra: {
      connectionTimeoutMillis: 10000,
    },
  };
}

/**
 * Hash password using bcrypt
 */
async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Seeds the database with initial test data
 */
async function seedDatabase(
  connectionString: string,
  options: SeedOptions = {}
): Promise<SeedResult> {
  const result: SeedResult = {
    usersCreated: 0,
    tripsCreated: 0,
    preferencesCreated: 0,
    success: false,
    errors: [],
  };

  let dataSource: DataSource | null = null;

  try {
    // Validate connection string
    const validation = validateConnectionString(connectionString);
    if (!validation.valid) {
      result.errors.push(validation.error || 'Invalid connection string');
      return result;
    }

    console.log('🔌 Connecting to database...');
    
    // Create and initialize data source
    const config = createDataSourceConfig(connectionString);
    dataSource = new DataSource(config);
    
    await dataSource.initialize();
    console.log('✅ Database connection established');

    // Start transaction
    await dataSource.transaction(async (transactionalEntityManager) => {
      console.log('🌱 Starting seed process...');

      const userRepository = transactionalEntityManager.getRepository(UserEntity);
      const tripRepository = transactionalEntityManager.getRepository(TripEntity);
      const preferencesRepository = transactionalEntityManager.getRepository(UserPreferencesEntity);

      // Define seed users
      const seedUsers = [
        {
          email: 'test@example.com',
          password: 'TestPassword123!',
          isAdmin: false,
          emailVerified: true,
        },
        {
          email: 'admin@example.com',
          password: 'AdminPassword123!',
          isAdmin: true,
          emailVerified: true,
        },
        {
          email: 'user@example.com',
          password: 'UserPassword123!',
          isAdmin: false,
          emailVerified: true,
        },
      ];

      console.log('👤 Creating test users...');
      const createdUsers: UserEntity[] = [];

      for (const seedUser of seedUsers) {
        // Check if user already exists
        const existingUser = await userRepository.findOne({
          where: { email: seedUser.email },
        });

        if (existingUser) {
          if (options.skipIfExists) {
            console.log(`   ⏭️  Skipping existing user: ${seedUser.email}`);
            createdUsers.push(existingUser);
            continue;
          } else {
            console.log(`   ℹ️  User already exists: ${seedUser.email}`);
            createdUsers.push(existingUser);
            continue;
          }
        }

        // Hash password
        const passwordHash = await hashPassword(seedUser.password);

        // Create user
        const user = userRepository.create({
          email: seedUser.email,
          passwordHash,
          emailVerified: seedUser.emailVerified,
          isActive: true,
          isAdmin: seedUser.isAdmin,
          failedLoginAttempts: 0,
          accountLockedUntil: null,
          emailVerificationToken: null,
          emailVerificationTokenExpires: null,
          passwordResetToken: null,
          passwordResetTokenExpires: null,
        });

        const savedUser = await userRepository.save(user);
        createdUsers.push(savedUser);
        result.usersCreated++;
        console.log(`   ✅ Created user: ${savedUser.email} (${savedUser.isAdmin ? 'Admin' : 'Regular'})`);
      }

      // Create user preferences for each user
      console.log('⚙️  Creating user preferences...');
      for (const user of createdUsers) {
        // Check if preferences already exist
        const existingPreferences = await preferencesRepository.findOne({
          where: { userId: user.id },
        });

        if (existingPreferences) {
          console.log(`   ⏭️  Preferences already exist for: ${user.email}`);
          continue;
        }

        const preferences = preferencesRepository.create({
          userId: user.id,
          maxWalkingDistance: 1.5,
          preferredModes: ['walking', 'transit', 'bicycling'],
          accessibilityNeeds: {
            wheelchairAccessible: false,
            elevatorRequired: false,
          },
          sustainabilityPriority: 'high',
          timeVsEnvironmentWeight: 0.7,
        });

        await preferencesRepository.save(preferences);
        result.preferencesCreated++;
        console.log(`   ✅ Created preferences for: ${user.email}`);
      }

      // Create sample trips for non-admin users
      console.log('🚗 Creating sample trips...');
      const regularUsers = createdUsers.filter(u => !u.isAdmin);

      for (const user of regularUsers) {
        // Check if trips already exist for this user
        const existingTrips = await tripRepository.count({
          where: { userId: user.id },
        });

        if (existingTrips > 0) {
          console.log(`   ⏭️  Trips already exist for: ${user.email}`);
          continue;
        }

        // Create sample trips
        const sampleTrips = [
          {
            userId: user.id,
            originLat: 40.7128,
            originLng: -74.0060,
            originName: 'New York, NY',
            destinationLat: 40.7589,
            destinationLng: -73.9851,
            destinationName: 'Times Square, NY',
            selectedRoute: {
              mode: 'transit',
              distance: 5.2,
              duration: 25,
              carbonEmissions: 0.8,
            },
            actualTransportationMode: 'transit',
            carbonSavings: 2.5,
            distance: 5.2,
            duration: 25,
            completedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
          },
          {
            userId: user.id,
            originLat: 40.7589,
            originLng: -73.9851,
            originName: 'Times Square, NY',
            destinationLat: 40.7484,
            destinationLng: -73.9857,
            destinationName: 'Empire State Building, NY',
            selectedRoute: {
              mode: 'walking',
              distance: 1.1,
              duration: 15,
              carbonEmissions: 0.0,
            },
            actualTransportationMode: 'walking',
            carbonSavings: 0.5,
            distance: 1.1,
            duration: 15,
            completedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
          },
        ];

        for (const tripData of sampleTrips) {
          const trip = tripRepository.create(tripData);
          await tripRepository.save(trip);
          result.tripsCreated++;
        }

        console.log(`   ✅ Created ${sampleTrips.length} trips for: ${user.email}`);
      }

      console.log('✅ Seed process completed successfully!');
    });

    result.success = true;

    // Output summary
    console.log('\n📊 Seeding Summary:');
    console.log(`   Users created: ${result.usersCreated}`);
    console.log(`   Preferences created: ${result.preferencesCreated}`);
    console.log(`   Trips created: ${result.tripsCreated}`);

    if (result.usersCreated === 0 && result.preferencesCreated === 0 && result.tripsCreated === 0) {
      console.log('   ℹ️  No new records created - database already seeded');
    }

  } catch (error) {
    result.success = false;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    result.errors.push(errorMessage);

    console.error('\n❌ Seeding failed!');
    console.error(`Error: ${errorMessage}`);
    
    if (error instanceof Error && error.stack) {
      console.error('\nStack trace:');
      console.error(error.stack);
    }

    console.log('\n🔄 Transaction rolled back - no changes were made to the database');
  } finally {
    // Clean up connection
    if (dataSource && dataSource.isInitialized) {
      try {
        await dataSource.destroy();
        console.log('\n🔌 Database connection closed');
      } catch (closeError) {
        console.error('Warning: Error closing database connection:', closeError);
      }
    }
  }

  return result;
}

/**
 * Main execution function
 */
async function main() {
  console.log('🌱 Seed Data Manager\n');

  // Get connection string from command line arguments
  const connectionString = process.argv[2];

  if (!connectionString) {
    console.error('❌ Error: Connection string is required');
    console.error('\nUsage:');
    console.error('  ts-node src/scripts/seed-database.ts <connection-string>');
    console.error('\nExample:');
    console.error('  ts-node src/scripts/seed-database.ts postgresql://user:pass@host:5432/database');
    process.exit(1);
  }

  // Run seeding
  const result = await seedDatabase(connectionString, { skipIfExists: true });

  // Exit with appropriate code
  if (result.success) {
    console.log('\n✨ All done!');
    process.exit(0);
  } else {
    console.error('\n💥 Seeding failed with errors:');
    result.errors.forEach((error, index) => {
      console.error(`  ${index + 1}. ${error}`);
    });
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

// Export for testing
export { seedDatabase, validateConnectionString, createDataSourceConfig };
export type { SeedOptions, SeedResult };
