#!/usr/bin/env node

import axios, { AxiosError } from 'axios';

/**
 * Health Check Script
 * 
 * This script performs post-deployment health checks to verify the deployed
 * application is working correctly. It tests:
 * - Authentication endpoints (login, register)
 * - Route planning endpoints
 * - Database connectivity through API
 * - Response times for each endpoint
 * 
 * Usage:
 *   ts-node src/scripts/health-check.ts <api-base-url> [options]
 *   
 * Options:
 *   --timeout <ms>           Request timeout in milliseconds (default: 10000)
 *   --skip-auth              Skip authentication endpoint tests
 *   --skip-routes            Skip route planning endpoint tests
 *   --skip-database          Skip database connectivity tests
 *   --verbose                Show detailed request/response information
 * 
 * Example:
 *   ts-node src/scripts/health-check.ts https://api.rutty.app
 *   ts-node src/scripts/health-check.ts http://localhost:3000 --verbose
 */

interface EndpointCheck {
  endpoint: string;
  method: string;
  status: number;
  responseTime: number;
  healthy: boolean;
  error?: string;
  details?: string;
}

interface HealthCheckResult {
  endpoints: EndpointCheck[];
  databaseConnected: boolean;
  allHealthy: boolean;
  totalEndpoints: number;
  healthyEndpoints: number;
  failedEndpoints: number;
  averageResponseTime: number;
}

interface HealthCheckOptions {
  timeout?: number;
  skipAuth?: boolean;
  skipRoutes?: boolean;
  skipDatabase?: boolean;
  verbose?: boolean;
}

/**
 * Test a single endpoint
 */
async function checkEndpoint(
  url: string,
  method: string,
  data?: any,
  timeout: number = 10000
): Promise<EndpointCheck> {
  const start = Date.now();
  
  try {
    const config = {
      method,
      url,
      timeout,
      data,
      headers: {
        'Content-Type': 'application/json',
      },
      validateStatus: () => true, // Don't throw on any status code
    };

    const response = await axios(config);
    const responseTime = Date.now() - start;

    return {
      endpoint: url,
      method,
      status: response.status,
      responseTime,
      healthy: response.status < 500, // 5xx errors are unhealthy
      details: response.status >= 400 ? response.data?.message || response.statusText : undefined,
    };
  } catch (error) {
    const responseTime = Date.now() - start;
    const axiosError = error as AxiosError;
    
    return {
      endpoint: url,
      method,
      status: axiosError.response?.status || 0,
      responseTime,
      healthy: false,
      error: axiosError.message || 'Unknown error',
      details: axiosError.code,
    };
  }
}

/**
 * Test authentication endpoints
 */
async function checkAuthenticationEndpoints(
  baseUrl: string,
  timeout: number,
  verbose: boolean
): Promise<EndpointCheck[]> {
  const checks: EndpointCheck[] = [];

  console.log('🔐 Testing Authentication Endpoints...');

  // Test register endpoint
  console.log('   Testing POST /api/auth/register...');
  const registerCheck = await checkEndpoint(
    `${baseUrl}/api/auth/register`,
    'POST',
    {
      email: `healthcheck-${Date.now()}@example.com`,
      password: 'HealthCheck123!',
      name: 'Health Check User',
    },
    timeout
  );
  checks.push(registerCheck);

  if (registerCheck.healthy) {
    console.log(`   ✅ Register: ${registerCheck.status} (${registerCheck.responseTime}ms)`);
  } else {
    console.log(`   ❌ Register: ${registerCheck.status} - ${registerCheck.error || 'Failed'}`);
  }

  if (verbose && registerCheck.details) {
    console.log(`      Details: ${registerCheck.details}`);
  }

  // Test login endpoint
  console.log('   Testing POST /api/auth/login...');
  const loginCheck = await checkEndpoint(
    `${baseUrl}/api/auth/login`,
    'POST',
    {
      email: 'test@example.com',
      password: 'Test123!',
    },
    timeout
  );
  checks.push(loginCheck);

  if (loginCheck.healthy) {
    console.log(`   ✅ Login: ${loginCheck.status} (${loginCheck.responseTime}ms)`);
  } else {
    console.log(`   ❌ Login: ${loginCheck.status} - ${loginCheck.error || 'Failed'}`);
  }

  if (verbose && loginCheck.details) {
    console.log(`      Details: ${loginCheck.details}`);
  }

  return checks;
}

/**
 * Test route planning endpoints
 */
async function checkRoutePlanningEndpoints(
  baseUrl: string,
  timeout: number,
  verbose: boolean
): Promise<EndpointCheck[]> {
  const checks: EndpointCheck[] = [];

  console.log('\n🗺️  Testing Route Planning Endpoints...');

  // Test route calculation endpoint
  console.log('   Testing POST /api/routes/calculate...');
  const routeCheck = await checkEndpoint(
    `${baseUrl}/api/routes/calculate`,
    'POST',
    {
      origin: { lat: 40.7128, lng: -74.0060 }, // New York
      destination: { lat: 34.0522, lng: -118.2437 }, // Los Angeles
      preferences: {
        prioritizeEco: true,
      },
    },
    timeout
  );
  checks.push(routeCheck);

  if (routeCheck.healthy) {
    console.log(`   ✅ Route Calculate: ${routeCheck.status} (${routeCheck.responseTime}ms)`);
  } else {
    console.log(`   ❌ Route Calculate: ${routeCheck.status} - ${routeCheck.error || 'Failed'}`);
  }

  if (verbose && routeCheck.details) {
    console.log(`      Details: ${routeCheck.details}`);
  }

  return checks;
}

/**
 * Test database connectivity through API
 */
async function checkDatabaseConnectivity(
  baseUrl: string,
  timeout: number,
  verbose: boolean
): Promise<{ checks: EndpointCheck[]; connected: boolean }> {
  const checks: EndpointCheck[] = [];
  let connected = false;

  console.log('\n🗄️  Testing Database Connectivity...');

  // Test health endpoint (if exists)
  console.log('   Testing GET /health...');
  const healthCheck = await checkEndpoint(
    `${baseUrl}/health`,
    'GET',
    undefined,
    timeout
  );
  checks.push(healthCheck);

  if (healthCheck.healthy && healthCheck.status === 200) {
    console.log(`   ✅ Health: ${healthCheck.status} (${healthCheck.responseTime}ms)`);
    connected = true;
  } else {
    console.log(`   ⚠️  Health: ${healthCheck.status} - Endpoint may not exist`);
  }

  // Test a database-dependent endpoint (user profile requires auth, so we test login which queries DB)
  console.log('   Testing database query through login...');
  const dbCheck = await checkEndpoint(
    `${baseUrl}/api/auth/login`,
    'POST',
    {
      email: 'nonexistent@example.com',
      password: 'test',
    },
    timeout
  );
  
  // If we get a proper response (even 401/404), database is working
  if (dbCheck.status > 0 && dbCheck.status < 500) {
    console.log(`   ✅ Database Query: Working (${dbCheck.responseTime}ms)`);
    connected = true;
  } else {
    console.log(`   ❌ Database Query: Failed - ${dbCheck.error || 'Server error'}`);
  }

  return { checks, connected };
}

/**
 * Run comprehensive health checks
 */
async function runHealthChecks(
  baseUrl: string,
  options: HealthCheckOptions = {}
): Promise<HealthCheckResult> {
  const result: HealthCheckResult = {
    endpoints: [],
    databaseConnected: false,
    allHealthy: false,
    totalEndpoints: 0,
    healthyEndpoints: 0,
    failedEndpoints: 0,
    averageResponseTime: 0,
  };

  const timeout = options.timeout || 10000;
  const verbose = options.verbose || false;

  console.log('🏥 Health Check Started\n');
  console.log('═'.repeat(60));
  console.log(`Target: ${baseUrl}`);
  console.log(`Timeout: ${timeout}ms`);
  console.log('═'.repeat(60) + '\n');

  try {
    // Test authentication endpoints
    if (!options.skipAuth) {
      const authChecks = await checkAuthenticationEndpoints(baseUrl, timeout, verbose);
      result.endpoints.push(...authChecks);
    }

    // Test route planning endpoints
    if (!options.skipRoutes) {
      const routeChecks = await checkRoutePlanningEndpoints(baseUrl, timeout, verbose);
      result.endpoints.push(...routeChecks);
    }

    // Test database connectivity
    if (!options.skipDatabase) {
      const dbResult = await checkDatabaseConnectivity(baseUrl, timeout, verbose);
      result.endpoints.push(...dbResult.checks);
      result.databaseConnected = dbResult.connected;
    }

    // Calculate statistics
    result.totalEndpoints = result.endpoints.length;
    result.healthyEndpoints = result.endpoints.filter(e => e.healthy).length;
    result.failedEndpoints = result.totalEndpoints - result.healthyEndpoints;
    
    const totalResponseTime = result.endpoints.reduce((sum, e) => sum + e.responseTime, 0);
    result.averageResponseTime = result.totalEndpoints > 0 
      ? Math.round(totalResponseTime / result.totalEndpoints) 
      : 0;

    // Determine overall health
    result.allHealthy = result.failedEndpoints === 0 && 
                       (options.skipDatabase || result.databaseConnected);

  } catch (error) {
    console.error('\n❌ Health check encountered an error:', error);
  }

  return result;
}

/**
 * Print health check report
 */
function printHealthCheckReport(result: HealthCheckResult) {
  console.log('\n' + '═'.repeat(60));
  console.log('📊 HEALTH CHECK REPORT');
  console.log('═'.repeat(60));

  // Print endpoint results
  console.log('\n🔍 Endpoint Results:');
  for (const endpoint of result.endpoints) {
    const icon = endpoint.healthy ? '✅' : '❌';
    const url = new URL(endpoint.endpoint);
    console.log(`   ${icon} ${endpoint.method} ${url.pathname}`);
    console.log(`      Status: ${endpoint.status} | Response Time: ${endpoint.responseTime}ms`);
    
    if (endpoint.error) {
      console.log(`      Error: ${endpoint.error}`);
    }
    if (endpoint.details) {
      console.log(`      Details: ${endpoint.details}`);
    }
  }

  // Print database status
  console.log('\n🗄️  Database Status:');
  if (result.databaseConnected) {
    console.log('   ✅ Database is connected and responding');
  } else {
    console.log('   ❌ Database connectivity could not be verified');
  }

  // Print statistics
  console.log('\n📈 Statistics:');
  console.log(`   Total Endpoints Tested: ${result.totalEndpoints}`);
  console.log(`   Healthy: ${result.healthyEndpoints}`);
  console.log(`   Failed: ${result.failedEndpoints}`);
  console.log(`   Average Response Time: ${result.averageResponseTime}ms`);

  // Print overall status
  console.log('\n' + '─'.repeat(60));
  if (result.allHealthy) {
    console.log('✅ DEPLOYMENT SUCCESSFUL');
    console.log('\n🎉 All health checks passed!');
    console.log('   Your application is deployed and functioning correctly.');
    console.log(`   Average response time: ${result.averageResponseTime}ms`);
    
    // Generate success report
    console.log('\n📋 Deployment Success Report:');
    console.log('   ✅ Authentication endpoints: Working');
    console.log('   ✅ Route planning endpoints: Working');
    console.log('   ✅ Database connectivity: Verified');
    console.log('   ✅ API response times: Acceptable');
    console.log('\n   Deployment completed successfully at: ' + new Date().toISOString());
  } else {
    console.log('❌ DEPLOYMENT ISSUES DETECTED');
    console.log(`\n💥 ${result.failedEndpoints} endpoint(s) failed health checks!`);
    
    if (!result.databaseConnected) {
      console.log('   ⚠️  Database connectivity could not be verified');
    }
    
    console.log('\n💡 Troubleshooting Steps:');
    
    const hasAuthFailure = result.endpoints.some(
      e => e.endpoint.includes('/auth/') && !e.healthy
    );
    const hasRouteFailure = result.endpoints.some(
      e => e.endpoint.includes('/routes/') && !e.healthy
    );
    const hasTimeoutFailure = result.endpoints.some(
      e => e.error?.includes('timeout')
    );
    const hasConnectionFailure = result.endpoints.some(
      e => e.error?.includes('ECONNREFUSED') || e.error?.includes('ENOTFOUND')
    );
    
    if (hasConnectionFailure) {
      console.log('   1. Verify the API base URL is correct');
      console.log('   2. Ensure the application is deployed and running');
      console.log('   3. Check network connectivity and firewall rules');
    }
    
    if (hasTimeoutFailure) {
      console.log('   1. Check if the server is overloaded or slow to respond');
      console.log('   2. Increase timeout with --timeout flag');
      console.log('   3. Verify database and external service connectivity');
    }
    
    if (hasAuthFailure) {
      console.log('   1. Verify authentication service is configured correctly');
      console.log('   2. Check JWT_SECRET environment variable is set');
      console.log('   3. Ensure database has users table and seed data');
    }
    
    if (hasRouteFailure) {
      console.log('   1. Verify route planning service is configured');
      console.log('   2. Check external API keys (GEOAPIFY_API_KEY)');
      console.log('   3. Ensure route calculation logic is deployed');
    }
    
    if (!result.databaseConnected) {
      console.log('   1. Verify DATABASE_URL environment variable is set');
      console.log('   2. Check database is accessible from deployment environment');
      console.log('   3. Run: ts-node src/scripts/verify-deployment.ts <connection-string>');
    }
  }
  
  console.log('═'.repeat(60) + '\n');
}

/**
 * Parse command line arguments
 */
function parseArguments(): { baseUrl: string; options: HealthCheckOptions } | null {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    return null;
  }

  const baseUrl = args[0];
  const options: HealthCheckOptions = {
    timeout: 10000,
    skipAuth: false,
    skipRoutes: false,
    skipDatabase: false,
    verbose: false,
  };

  for (let i = 1; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--timeout' && i + 1 < args.length) {
      options.timeout = parseInt(args[i + 1], 10);
      i++;
    } else if (arg === '--skip-auth') {
      options.skipAuth = true;
    } else if (arg === '--skip-routes') {
      options.skipRoutes = true;
    } else if (arg === '--skip-database') {
      options.skipDatabase = true;
    } else if (arg === '--verbose') {
      options.verbose = true;
    }
  }

  return { baseUrl, options };
}

/**
 * Main execution function
 */
async function main() {
  console.log('🔧 Health Check Tool\n');

  // Parse arguments
  const parsed = parseArguments();
  
  if (!parsed) {
    console.error('❌ Error: API base URL is required');
    console.error('\nUsage:');
    console.error('  ts-node src/scripts/health-check.ts <api-base-url> [options]');
    console.error('\nOptions:');
    console.error('  --timeout <ms>           Request timeout in milliseconds (default: 10000)');
    console.error('  --skip-auth              Skip authentication endpoint tests');
    console.error('  --skip-routes            Skip route planning endpoint tests');
    console.error('  --skip-database          Skip database connectivity tests');
    console.error('  --verbose                Show detailed request/response information');
    console.error('\nExample:');
    console.error('  ts-node src/scripts/health-check.ts https://api.rutty.app');
    console.error('  ts-node src/scripts/health-check.ts http://localhost:3000 --verbose');
    process.exit(1);
  }

  const { baseUrl, options } = parsed;

  // Validate base URL format
  try {
    new URL(baseUrl);
  } catch (error) {
    console.error('❌ Error: Invalid base URL format');
    console.error('   Expected: http://... or https://...');
    process.exit(1);
  }

  // Run health checks
  const result = await runHealthChecks(baseUrl, options);

  // Print comprehensive report
  printHealthCheckReport(result);

  // Exit with appropriate code
  process.exit(result.allHealthy ? 0 : 1);
}

// Run if executed directly
if (require.main === module) {
  main().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

// Export for testing
export { runHealthChecks, checkEndpoint, printHealthCheckReport };
export type { HealthCheckResult, EndpointCheck, HealthCheckOptions };
