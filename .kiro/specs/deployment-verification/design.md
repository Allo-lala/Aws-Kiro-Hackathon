# Design Document

## Overview

This design specifies a comprehensive database migration and deployment workflow system for the Rutty application. The system provides CLI scripts and automation tools to initialize cloud databases (specifically Neon PostgreSQL), run TypeORM migrations, seed test data, configure environment variables, and verify deployments. The goal is to eliminate manual SQL editor steps and provide a repeatable, automated deployment process.

## Architecture

The system follows a script-based architecture with the following components:

1. **Migration Runner**: Executes TypeORM migrations against target databases
2. **Seed Data Manager**: Populates databases with initial test users and reference data
3. **Database Initializer**: Orchestrates migration and seeding in correct order
4. **Environment Configurator**: Sets up Vercel environment variables programmatically
5. **Deployment Verifier**: Validates database state and configuration before/after deployment
6. **Health Check System**: Tests deployed endpoints to ensure functionality

The architecture supports multiple environments (local, staging, production) through environment-specific configuration.

## Components and Interfaces

### 1. Migration Runner (`scripts/run-migrations.ts`)

**Purpose**: Execute TypeORM migrations against a specified database

**Interface**:
```typescript
interface MigrationRunner {
  run(connectionString: string): Promise<MigrationResult>;
  revert(connectionString: string, steps?: number): Promise<void>;
  show(connectionString: string): Promise<Migration[]>;
}

interface MigrationResult {
  applied: Migration[];
  pending: Migration[];
  success: boolean;
  errors: string[];
}

interface Migration {
  id: number;
  timestamp: number;
  name: string;
  executed: boolean;
}
```

**Responsibilities**:
- Parse and validate connection strings
- Connect to target database with SSL
- Execute pending migrations in order
- Report migration status and errors
- Support rollback operations

### 2. Seed Data Manager (`scripts/seed-database.ts`)

**Purpose**: Populate database with initial test data

**Interface**:
```typescript
interface SeedDataManager {
  seed(connectionString: string, options?: SeedOptions): Promise<SeedResult>;
  clear(connectionString: string): Promise<void>;
}

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
```

**Responsibilities**:
- Check for existing data to avoid duplicates
- Create test users (regular and admin)
- Create sample trips and preferences
- Verify email addresses for test accounts
- Report seeding results

### 3. Database Initializer (`scripts/init-database.ts`)

**Purpose**: Complete database setup in one command

**Interface**:
```typescript
interface DatabaseInitializer {
  initialize(connectionString: string, options?: InitOptions): Promise<InitResult>;
}

interface InitOptions {
  skipMigrations?: boolean;
  skipSeeding?: boolean;
  environment?: string;
}

interface InitResult {
  migrationResult: MigrationResult;
  seedResult: SeedResult;
  verificationResult: VerificationResult;
  success: boolean;
}
```

**Responsibilities**:
- Run migrations first
- Seed data after migrations
- Verify database state
- Provide comprehensive status report

### 4. Environment Configurator (`scripts/setup-vercel-env.ts`)

**Purpose**: Configure Vercel environment variables programmatically

**Interface**:
```typescript
interface EnvironmentConfigurator {
  configure(projectId: string, variables: EnvironmentVariable[]): Promise<ConfigResult>;
  verify(projectId: string): Promise<VerificationResult>;
}

interface EnvironmentVariable {
  key: string;
  value: string;
  target: ('production' | 'preview' | 'development')[];
}

interface ConfigResult {
  configured: string[];
  failed: string[];
  success: boolean;
}
```

**Responsibilities**:
- Read environment variables from config file
- Use Vercel CLI to set variables
- Verify variables are set correctly
- Report configuration status

### 5. Deployment Verifier (`scripts/verify-deployment.ts`)

**Purpose**: Validate database and configuration before/after deployment

**Interface**:
```typescript
interface DeploymentVerifier {
  verifyPreDeployment(config: DeploymentConfig): Promise<VerificationResult>;
  verifyPostDeployment(config: DeploymentConfig): Promise<VerificationResult>;
}

interface DeploymentConfig {
  databaseUrl: string;
  apiBaseUrl: string;
  requiredEnvVars: string[];
}

interface VerificationResult {
  checks: Check[];
  allPassed: boolean;
  warnings: string[];
  errors: string[];
}

interface Check {
  name: string;
  passed: boolean;
  message: string;
  severity: 'error' | 'warning' | 'info';
}
```

**Responsibilities**:
- Test database connectivity
- Verify schema completeness
- Check for required seed data
- Validate environment variables
- Test API endpoint availability

### 6. Health Check System (`scripts/health-check.ts`)

**Purpose**: Test deployed application endpoints

**Interface**:
```typescript
interface HealthCheckSystem {
  runChecks(baseUrl: string): Promise<HealthCheckResult>;
}

interface HealthCheckResult {
  endpoints: EndpointCheck[];
  databaseConnected: boolean;
  allHealthy: boolean;
}

interface EndpointCheck {
  endpoint: string;
  method: string;
  status: number;
  responseTime: number;
  healthy: boolean;
  error?: string;
}
```

**Responsibilities**:
- Test authentication endpoints
- Test route planning endpoints
- Test database connectivity through API
- Measure response times
- Report overall health status

## Data Models

### Configuration File Format

```typescript
// deployment-config.json
interface DeploymentConfiguration {
  environments: {
    [key: string]: EnvironmentConfig;
  };
}

interface EnvironmentConfig {
  name: string;
  databaseUrl: string;
  apiBaseUrl: string;
  environmentVariables: {
    [key: string]: string;
  };
  vercelProjectId?: string;
}
```

### Migration Status

```typescript
interface MigrationStatus {
  database: string;
  lastMigration: string;
  pendingMigrations: string[];
  appliedAt: Date;
}
```

### Seed Data Records

```typescript
interface SeedDataRecord {
  users: UserSeed[];
  trips: TripSeed[];
  preferences: PreferencesSeed[];
}

interface UserSeed {
  email: string;
  password: string;
  isAdmin: boolean;
  emailVerified: boolean;
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Acceptance Criteria Testing Prework

1.1 WHEN the migration script runs THEN the system SHALL connect to the database using the provided connection string
Thoughts: This is about the migration runner being able to establish a connection. We can test this by generating random valid connection strings and verifying connection succeeds, or invalid ones and verifying it fails appropriately.
Testable: yes - property

1.2 WHEN connected to the database THEN the system SHALL execute all pending migrations in order
Thoughts: This is about migration ordering. We can test that migrations are always applied in timestamp order by checking the migration execution sequence.
Testable: yes - property

1.3 WHEN migrations complete successfully THEN the system SHALL report which migrations were applied
Thoughts: This is about the reporting mechanism. For any set of migrations, the report should contain exactly the migrations that were applied.
Testable: yes - property

1.4 IF a migration fails THEN the system SHALL report the error and stop execution
Thoughts: This is error handling behavior. We can test that when a migration throws an error, execution stops and the error is reported.
Testable: yes - example

1.5 WHEN all migrations are applied THEN the system SHALL verify the schema matches the entity definitions
Thoughts: This is about schema validation. This is more of an integration test than a property test.
Testable: no

2.1 WHEN the seed script runs THEN the system SHALL connect to the target database
Thoughts: Same as 1.1, this is about connection establishment.
Testable: yes - property (covered by 1.1)

2.2 WHEN seeding data THEN the system SHALL check if data already exists to avoid duplicates
Thoughts: This is idempotence - running seed twice should not create duplicates. This is a critical property.
Testable: yes - property

2.3 WHEN inserting seed data THEN the system SHALL create test users, sample routes, and reference data
Thoughts: This is about what gets created. We can verify the seed result contains the expected record counts.
Testable: yes - property

2.4 IF seed data insertion fails THEN the system SHALL report the specific error and rollback changes
Thoughts: This is error handling with rollback. We can test that failed seeding leaves database unchanged.
Testable: yes - example

2.5 WHEN seeding completes THEN the system SHALL report the number of records created in each table
Thoughts: This is about accurate reporting. The reported counts should match actual database counts.
Testable: yes - property

3.1 WHEN the initialization command runs THEN the system SHALL accept a database connection string as input
Thoughts: This is about input validation. We can test various connection string formats.
Testable: yes - property

3.2 WHEN initializing THEN the system SHALL run migrations first, then seed data
Thoughts: This is about execution order. We can verify migrations complete before seeding starts.
Testable: yes - property

3.3 WHEN the process completes THEN the system SHALL verify database connectivity and schema correctness
Thoughts: This is about post-initialization verification. We can test that verification runs after init.
Testable: yes - property

3.4 IF any step fails THEN the system SHALL report which step failed and provide remediation guidance
Thoughts: This is error reporting. We can test that failures include step information.
Testable: yes - example

3.5 WHEN initialization succeeds THEN the system SHALL output a success message with database details
Thoughts: This is about success reporting. We can verify the output contains expected information.
Testable: yes - property

4.1 WHEN the verification script runs THEN the system SHALL test database connectivity
Thoughts: This is about the verification process including connectivity checks.
Testable: yes - property

4.2 WHEN checking the schema THEN the system SHALL verify all required tables exist
Thoughts: This is about schema validation. For any set of required tables, verification should check all of them.
Testable: yes - property

4.3 WHEN validating data THEN the system SHALL check that essential seed data is present
Thoughts: This is about data validation. We can test that verification checks for expected records.
Testable: yes - property

4.4 IF verification fails THEN the system SHALL report missing tables or data with specific details
Thoughts: This is error reporting. We can test that failures include specific details.
Testable: yes - example

4.5 WHEN verification passes THEN the system SHALL confirm the database is deployment-ready
Thoughts: This is about success confirmation. We can verify the output indicates readiness.
Testable: yes - property

5.1 WHEN the environment setup script runs THEN the system SHALL read required variables from a configuration file
Thoughts: This is about configuration file parsing. We can test various config file formats.
Testable: yes - property

5.2 WHEN setting variables THEN the system SHALL use the Vercel CLI or API to configure the project
Thoughts: This is about the mechanism used. This is more of an integration test.
Testable: no

5.3 WHEN variables are set THEN the system SHALL verify each variable was successfully configured
Thoughts: This is about verification after setting. We can test that set variables can be read back.
Testable: yes - property

5.4 IF a variable fails to set THEN the system SHALL report the error and continue with remaining variables
Thoughts: This is about error handling and continuation. We can test that one failure doesn't stop others.
Testable: yes - example

5.5 WHEN all variables are set THEN the system SHALL display a summary of configured variables
Thoughts: This is about reporting. The summary should include all successfully set variables.
Testable: yes - property

6.1 WHEN the checklist script runs THEN the system SHALL check for required environment variables
Thoughts: This is about the checklist including env var checks. We can verify all required vars are checked.
Testable: yes - property

6.2 WHEN checking database THEN the system SHALL verify migrations are applied and data is seeded
Thoughts: This is about database state verification. We can test that both migrations and seed data are checked.
Testable: yes - property

6.3 WHEN checking configuration THEN the system SHALL validate API keys and URLs are set correctly
Thoughts: This is about configuration validation. We can test that all config items are validated.
Testable: yes - property

6.4 IF any check fails THEN the system SHALL report the failure and mark the deployment as not ready
Thoughts: This is about failure handling. One failed check should mark deployment as not ready.
Testable: yes - property

6.5 WHEN all checks pass THEN the system SHALL display a green "Ready to Deploy" message
Thoughts: This is about success indication. We can verify the success message appears when all checks pass.
Testable: yes - example

7.1 WHEN health checks run THEN the system SHALL test the deployed API endpoints
Thoughts: This is about endpoint testing. We can verify all expected endpoints are tested.
Testable: yes - property

7.2 WHEN testing authentication THEN the system SHALL verify login and registration endpoints respond correctly
Thoughts: This is about specific endpoint behavior. We can test that auth endpoints return expected status codes.
Testable: yes - property

7.3 WHEN testing database THEN the system SHALL verify the deployed app can query data
Thoughts: This is about database connectivity through the API. We can test that queries succeed.
Testable: yes - property

7.4 IF any health check fails THEN the system SHALL report the endpoint and error details
Thoughts: This is error reporting. Failed checks should include endpoint and error information.
Testable: yes - example

7.5 WHEN all checks pass THEN the system SHALL generate a deployment success report
Thoughts: This is about success reporting. We can verify the report is generated when all checks pass.
Testable: yes - property

8.1 WHEN the rollback command runs THEN the system SHALL identify the last applied migration
Thoughts: This is about migration tracking. We can test that the system correctly identifies the last migration.
Testable: yes - property

8.2 WHEN rolling back THEN the system SHALL execute the down migration for the specified version
Thoughts: This is about rollback execution. We can test that the correct down migration runs.
Testable: yes - property

8.3 WHEN rollback completes THEN the system SHALL verify the schema matches the previous state
Thoughts: This is about state verification after rollback. This is more of an integration test.
Testable: no

8.4 IF rollback fails THEN the system SHALL report the error and current database state
Thoughts: This is error reporting. Failed rollbacks should report errors and state.
Testable: yes - example

8.5 WHERE multiple rollbacks are needed, the system SHALL support rolling back multiple migrations
Thoughts: This is about multi-step rollback. We can test that multiple rollbacks work correctly.
Testable: yes - property

9.1 WHEN documentation is generated THEN the system SHALL include step-by-step deployment instructions
Thoughts: This is about documentation content. We can verify all required sections are present.
Testable: yes - property

9.2 WHEN describing steps THEN the system SHALL provide exact commands to run with example values
Thoughts: This is about command examples. We can verify commands are included in documentation.
Testable: yes - property

9.3 WHEN explaining configuration THEN the system SHALL list all required environment variables with descriptions
Thoughts: This is about configuration documentation. We can verify all env vars are documented.
Testable: yes - property

9.4 WHEN troubleshooting THEN the system SHALL include common errors and their solutions
Thoughts: This is about troubleshooting content. We can verify error solutions are included.
Testable: yes - property

9.5 WHERE multiple deployment targets exist, the system SHALL provide environment-specific instructions
Thoughts: This is about multi-environment documentation. We can verify each environment has instructions.
Testable: yes - property

### Property Reflection

After reviewing all testable properties, the following consolidations and eliminations are recommended:

**Redundant Properties**:
- Properties 1.1 and 2.1 both test database connection - consolidate into one "Database Connection" property
- Properties 1.3, 2.5, 3.5, 5.5 all test reporting accuracy - consolidate into "Accurate Reporting" property
- Properties 4.1, 4.2, 4.3 all test verification completeness - consolidate into "Complete Verification" property
- Properties 6.1, 6.2, 6.3 all test checklist completeness - consolidate into "Complete Checklist" property
- Properties 9.1, 9.2, 9.3, 9.4, 9.5 all test documentation completeness - consolidate into "Complete Documentation" property

**Unique Properties to Keep**:
- Migration ordering (1.2)
- Seed idempotence (2.2)
- Initialization ordering (3.2)
- Error continuation (5.4)
- Deployment readiness (6.4)
- Endpoint testing (7.1, 7.2, 7.3)
- Rollback identification (8.1, 8.2)
- Multi-step rollback (8.5)

### Correctness Properties

Property 1: Database connection validation
*For any* valid database connection string, the connection attempt should succeed and return a connected client
**Validates: Requirements 1.1, 2.1**

Property 2: Migration execution order
*For any* set of pending migrations, they should be executed in ascending timestamp order
**Validates: Requirements 1.2**

Property 3: Accurate operation reporting
*For any* completed operation (migration, seeding, initialization), the reported results should match the actual database state
**Validates: Requirements 1.3, 2.5, 3.5, 5.5**

Property 4: Seed data idempotence
*For any* database state, running the seed script multiple times should not create duplicate records
**Validates: Requirements 2.2**

Property 5: Seed data completeness
*For any* successful seed operation, all required record types (users, trips, preferences) should be created
**Validates: Requirements 2.3**

Property 6: Initialization execution order
*For any* database initialization, migrations should complete before seeding begins
**Validates: Requirements 3.2**

Property 7: Post-initialization verification
*For any* successful initialization, verification checks should run and confirm database readiness
**Validates: Requirements 3.3**

Property 8: Complete verification checks
*For any* verification run, all required checks (connectivity, schema, data) should be executed
**Validates: Requirements 4.1, 4.2, 4.3**

Property 9: Verification readiness confirmation
*For any* verification where all checks pass, the system should indicate deployment readiness
**Validates: Requirements 4.5**

Property 10: Environment variable verification
*For any* set environment variable, reading it back should return the same value
**Validates: Requirements 5.3**

Property 11: Error continuation in configuration
*For any* batch of environment variables, one failure should not prevent setting remaining variables
**Validates: Requirements 5.4**

Property 12: Complete deployment checklist
*For any* checklist run, all required categories (database, APIs, security, environment) should be checked
**Validates: Requirements 6.1, 6.2, 6.3**

Property 13: Deployment readiness determination
*For any* checklist execution, if any check fails, deployment should be marked as not ready
**Validates: Requirements 6.4**

Property 14: Complete endpoint health checks
*For any* health check run, all critical endpoints (auth, routes, database) should be tested
**Validates: Requirements 7.1, 7.2, 7.3**

Property 15: Health check success reporting
*For any* health check where all endpoints pass, a success report should be generated
**Validates: Requirements 7.5**

Property 16: Last migration identification
*For any* database with applied migrations, the rollback system should correctly identify the most recent migration
**Validates: Requirements 8.1**

Property 17: Correct rollback execution
*For any* specified migration version, rolling back should execute the corresponding down migration
**Validates: Requirements 8.2**

Property 18: Multi-step rollback support
*For any* number of rollback steps requested, the system should execute that many down migrations in reverse order
**Validates: Requirements 8.5**

Property 19: Complete documentation generation
*For any* documentation generation, all required sections (steps, commands, configuration, troubleshooting, environments) should be included
**Validates: Requirements 9.1, 9.2, 9.3, 9.4, 9.5**

## Error Handling

### Connection Errors
- Invalid connection strings should be rejected with clear error messages
- Connection timeouts should be handled gracefully with retry logic
- SSL/TLS errors should provide specific guidance on certificate issues

### Migration Errors
- Failed migrations should not leave database in inconsistent state
- Migration errors should include the failing SQL statement
- Partial migrations should be rolled back automatically

### Seeding Errors
- Duplicate key errors should be handled gracefully (skip or update)
- Foreign key violations should be reported with relationship details
- Transaction rollback should occur on any seeding failure

### Environment Configuration Errors
- Missing required variables should be reported before deployment
- Invalid variable formats should be validated early
- Vercel API errors should include retry suggestions

### Health Check Errors
- Failed endpoints should not stop remaining checks
- Timeout errors should be distinguished from server errors
- Network errors should provide connectivity troubleshooting steps

## Testing Strategy

### Unit Testing

Unit tests will cover:
- Connection string parsing and validation
- Configuration file parsing
- Error message formatting
- Status reporting logic
- Command-line argument parsing

### Property-Based Testing

Property-based tests will use **fast-check** (JavaScript/TypeScript PBT library) to verify:
- All correctness properties defined above
- Each property test will run a minimum of 100 iterations
- Each test will be tagged with: `**Feature: deployment-verification, Property {number}: {property_text}**`

Example property test structure:
```typescript
import fc from 'fast-check';

test('Property 1: Database connection validation', () => {
  /**
   * Feature: deployment-verification, Property 1: Database connection validation
   * For any valid database connection string, the connection attempt should succeed
   */
  fc.assert(
    fc.asyncProperty(
      validConnectionStringGenerator(),
      async (connectionString) => {
        const result = await migrationRunner.testConnection(connectionString);
        expect(result.connected).toBe(true);
      }
    ),
    { numRuns: 100 }
  );
});
```

### Integration Testing

Integration tests will verify:
- End-to-end migration execution against test database
- Complete initialization workflow
- Vercel API integration (using test project)
- Health check system against deployed test environment

### Manual Testing

Manual verification will include:
- Running scripts against actual Neon database
- Verifying Vercel environment variables in dashboard
- Testing deployed application endpoints
- Reviewing generated documentation

## Implementation Notes

### TypeORM Migration Execution

The system will use TypeORM's programmatic API rather than CLI:
```typescript
import { DataSource } from 'typeorm';

const dataSource = new DataSource({
  type: 'postgres',
  url: connectionString,
  migrations: ['./migrations/*.ts'],
  ssl: { rejectUnauthorized: false }
});

await dataSource.initialize();
await dataSource.runMigrations();
```

### Vercel Environment Variable Configuration

The system will use Vercel CLI commands:
```bash
vercel env add DATABASE_URL production
vercel env add JWT_SECRET production
```

Or Vercel API for programmatic access:
```typescript
const response = await fetch(
  `https://api.vercel.com/v9/projects/${projectId}/env`,
  {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      key: 'DATABASE_URL',
      value: connectionString,
      target: ['production']
    })
  }
);
```

### Health Check Implementation

Health checks will use axios with timeout:
```typescript
const checkEndpoint = async (url: string): Promise<EndpointCheck> => {
  try {
    const start = Date.now();
    const response = await axios.get(url, { timeout: 5000 });
    return {
      endpoint: url,
      status: response.status,
      responseTime: Date.now() - start,
      healthy: response.status < 400
    };
  } catch (error) {
    return {
      endpoint: url,
      status: 0,
      responseTime: 0,
      healthy: false,
      error: error.message
    };
  }
};
```

### Configuration File Format

Deployment configuration will use JSON:
```json
{
  "environments": {
    "production": {
      "name": "production",
      "databaseUrl": "postgresql://...",
      "apiBaseUrl": "https://api.rutty.app",
      "vercelProjectId": "prj_xxx",
      "environmentVariables": {
        "DATABASE_URL": "postgresql://...",
        "JWT_SECRET": "...",
        "GEOAPIFY_API_KEY": "...",
        "BASE_URL": "https://api.rutty.app"
      }
    }
  }
}
```
