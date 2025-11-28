#!/usr/bin/env node

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Vercel Environment Configurator Script
 * 
 * This script sets up Vercel environment variables programmatically.
 * It reads configuration from deployment-config.json and uses the Vercel CLI
 * to configure environment variables for the specified project.
 * 
 * Usage:
 *   ts-node src/scripts/setup-vercel-env.ts <environment> [options]
 *   
 * Arguments:
 *   environment    Target environment: production, staging, or development
 * 
 * Options:
 *   --config <path>    Path to deployment config file (default: deployment-config.json)
 *   --verify-only      Only verify existing variables without setting new ones
 *   --project-id <id>  Override Vercel project ID from config
 * 
 * Example:
 *   ts-node src/scripts/setup-vercel-env.ts production
 *   ts-node src/scripts/setup-vercel-env.ts staging --config ./config/deploy.json
 */

interface EnvironmentVariable {
  key: string;
  value: string;
  target: ('production' | 'preview' | 'development')[];
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

interface DeploymentConfiguration {
  environments: {
    [key: string]: EnvironmentConfig;
  };
}

interface ConfigResult {
  configured: string[];
  failed: string[];
  skipped: string[];
  verified: string[];
  success: boolean;
  errors: string[];
}

interface ConfigOptions {
  configPath?: string;
  verifyOnly?: boolean;
  projectId?: string;
}

/**
 * Validates that the Vercel CLI is installed and accessible
 */
function validateVercelCLI(): { valid: boolean; error?: string } {
  try {
    execSync('vercel --version', { stdio: 'pipe' });
    return { valid: true };
  } catch (error) {
    return {
      valid: false,
      error: 'Vercel CLI is not installed or not in PATH. Install it with: npm install -g vercel',
    };
  }
}

/**
 * Reads and parses the deployment configuration file
 */
function readDeploymentConfig(configPath: string): {
  config: DeploymentConfiguration | null;
  error?: string;
} {
  try {
    if (!fs.existsSync(configPath)) {
      return {
        config: null,
        error: `Configuration file not found: ${configPath}`,
      };
    }

    const fileContent = fs.readFileSync(configPath, 'utf-8');
    const config = JSON.parse(fileContent) as DeploymentConfiguration;

    // Validate config structure
    if (!config.environments || typeof config.environments !== 'object') {
      return {
        config: null,
        error: 'Invalid configuration: missing or invalid "environments" object',
      };
    }

    return { config };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return {
      config: null,
      error: `Failed to read configuration file: ${errorMessage}`,
    };
  }
}

/**
 * Maps environment name to Vercel target
 */
function mapEnvironmentToTarget(
  environment: string
): ('production' | 'preview' | 'development')[] {
  switch (environment.toLowerCase()) {
    case 'production':
      return ['production'];
    case 'staging':
      return ['preview'];
    case 'development':
      return ['development'];
    default:
      return ['production', 'preview', 'development'];
  }
}

/**
 * Sets a single environment variable using Vercel CLI
 */
function setVercelEnvironmentVariable(
  key: string,
  value: string,
  targets: string[],
  projectId?: string
): { success: boolean; error?: string } {
  try {
    // Build the command
    let command = `vercel env add ${key}`;
    
    if (projectId) {
      command += ` --scope ${projectId}`;
    }
    
    // Add targets
    targets.forEach(target => {
      command += ` ${target}`;
    });

    // Execute command with value as stdin
    execSync(command, {
      input: value,
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Verifies an environment variable by reading it back
 */
function verifyVercelEnvironmentVariable(
  key: string,
  expectedValue: string,
  projectId?: string
): { verified: boolean; actualValue?: string; error?: string } {
  try {
    let command = 'vercel env ls';
    
    if (projectId) {
      command += ` --scope ${projectId}`;
    }

    const output = execSync(command, {
      stdio: ['pipe', 'pipe', 'pipe'],
      encoding: 'utf-8',
    });

    // Check if the variable exists in the output
    const lines = output.split('\n');
    const variableLine = lines.find(line => line.includes(key));

    if (variableLine) {
      // Variable exists, but we can't verify the exact value through CLI
      // The Vercel CLI doesn't expose variable values for security reasons
      return {
        verified: true,
        actualValue: '[hidden]',
      };
    }

    return {
      verified: false,
      error: 'Variable not found in Vercel environment',
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return {
      verified: false,
      error: `Verification failed: ${errorMessage}`,
    };
  }
}

/**
 * Configures Vercel environment variables from deployment config
 */
async function configureVercelEnvironment(
  environment: string,
  options: ConfigOptions = {}
): Promise<ConfigResult> {
  const result: ConfigResult = {
    configured: [],
    failed: [],
    skipped: [],
    verified: [],
    success: false,
    errors: [],
  };

  try {
    console.log('🔧 Vercel Environment Configurator\n');

    // Validate Vercel CLI
    console.log('📋 Step 1: Validating Vercel CLI');
    console.log('─'.repeat(50));
    const cliValidation = validateVercelCLI();
    if (!cliValidation.valid) {
      result.errors.push(cliValidation.error || 'Vercel CLI validation failed');
      console.error(`   ❌ ${cliValidation.error}`);
      return result;
    }
    console.log('   ✅ Vercel CLI is installed and accessible\n');

    // Read configuration file
    console.log('📋 Step 2: Reading Configuration');
    console.log('─'.repeat(50));
    const configPath = options.configPath || path.join(process.cwd(), 'deployment-config.json');
    console.log(`   Config file: ${configPath}`);
    
    const { config, error } = readDeploymentConfig(configPath);
    if (!config || error) {
      result.errors.push(error || 'Failed to read configuration');
      console.error(`   ❌ ${error}`);
      return result;
    }
    console.log('   ✅ Configuration loaded successfully\n');

    // Get environment configuration
    console.log('📋 Step 3: Loading Environment Configuration');
    console.log('─'.repeat(50));
    const envConfig = config.environments[environment];
    if (!envConfig) {
      result.errors.push(`Environment "${environment}" not found in configuration`);
      console.error(`   ❌ Environment "${environment}" not found`);
      console.error(`   Available environments: ${Object.keys(config.environments).join(', ')}`);
      return result;
    }
    
    const projectId = options.projectId || envConfig.vercelProjectId;
    console.log(`   Environment: ${environment}`);
    console.log(`   Project ID: ${projectId || 'default'}`);
    console.log(`   Variables to configure: ${Object.keys(envConfig.environmentVariables).length}`);
    console.log('   ✅ Environment configuration loaded\n');

    // Determine targets
    const targets = mapEnvironmentToTarget(environment);

    // Configure or verify variables
    if (options.verifyOnly) {
      console.log('📋 Step 4: Verifying Environment Variables');
      console.log('─'.repeat(50));
      console.log('   Mode: Verification only (no changes will be made)\n');

      for (const [key, value] of Object.entries(envConfig.environmentVariables)) {
        console.log(`   Verifying: ${key}`);
        
        const verification = verifyVercelEnvironmentVariable(key, value, projectId);
        
        if (verification.verified) {
          result.verified.push(key);
          console.log(`      ✅ Variable exists in Vercel`);
        } else {
          result.failed.push(key);
          console.log(`      ❌ Variable not found or verification failed`);
          if (verification.error) {
            console.log(`         Error: ${verification.error}`);
          }
        }
      }
    } else {
      console.log('📋 Step 4: Setting Environment Variables');
      console.log('─'.repeat(50));
      console.log(`   Target(s): ${targets.join(', ')}\n`);

      for (const [key, value] of Object.entries(envConfig.environmentVariables)) {
        console.log(`   Setting: ${key}`);
        
        // Attempt to set the variable
        const setResult = setVercelEnvironmentVariable(key, value, targets, projectId);
        
        if (setResult.success) {
          result.configured.push(key);
          console.log(`      ✅ Successfully configured`);
          
          // Verify the variable was set
          const verification = verifyVercelEnvironmentVariable(key, value, projectId);
          if (verification.verified) {
            result.verified.push(key);
            console.log(`      ✅ Verified in Vercel`);
          } else {
            console.log(`      ⚠️  Could not verify (this is normal for security reasons)`);
          }
        } else {
          result.failed.push(key);
          const errorMsg = setResult.error || 'Unknown error';
          result.errors.push(`${key}: ${errorMsg}`);
          console.log(`      ❌ Failed to configure`);
          console.log(`         Error: ${errorMsg}`);
          console.log(`      ⏭️  Continuing with remaining variables...`);
        }
      }
    }

    // Determine overall success
    result.success = result.failed.length === 0;

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    result.errors.push(`Configuration failed: ${errorMessage}`);
    console.error('\n❌ Configuration failed:', errorMessage);
  }

  return result;
}

/**
 * Prints configuration summary
 */
function printConfigurationSummary(result: ConfigResult, options: ConfigOptions) {
  console.log('\n' + '═'.repeat(60));
  console.log('📊 CONFIGURATION SUMMARY');
  console.log('═'.repeat(60));

  if (options.verifyOnly) {
    console.log('\n🔍 Verification Results:');
    console.log(`   Verified: ${result.verified.length} variable(s)`);
    console.log(`   Failed: ${result.failed.length} variable(s)`);
    
    if (result.verified.length > 0) {
      console.log('\n   ✅ Verified Variables:');
      result.verified.forEach(key => {
        console.log(`      - ${key}`);
      });
    }
    
    if (result.failed.length > 0) {
      console.log('\n   ❌ Failed Verification:');
      result.failed.forEach(key => {
        console.log(`      - ${key}`);
      });
    }
  } else {
    console.log('\n⚙️  Configuration Results:');
    console.log(`   Configured: ${result.configured.length} variable(s)`);
    console.log(`   Failed: ${result.failed.length} variable(s)`);
    console.log(`   Skipped: ${result.skipped.length} variable(s)`);
    
    if (result.configured.length > 0) {
      console.log('\n   ✅ Successfully Configured:');
      result.configured.forEach(key => {
        console.log(`      - ${key}`);
      });
    }
    
    if (result.failed.length > 0) {
      console.log('\n   ❌ Failed to Configure:');
      result.failed.forEach(key => {
        console.log(`      - ${key}`);
      });
    }
    
    if (result.skipped.length > 0) {
      console.log('\n   ⏭️  Skipped:');
      result.skipped.forEach(key => {
        console.log(`      - ${key}`);
      });
    }
  }

  // Print errors
  if (result.errors.length > 0) {
    console.log('\n❌ Errors:');
    result.errors.forEach((error, index) => {
      console.log(`   ${index + 1}. ${error}`);
    });
  }

  // Overall status
  console.log('\n' + '─'.repeat(60));
  if (result.success) {
    console.log('✅ CONFIGURATION SUCCESSFUL');
    if (options.verifyOnly) {
      console.log('\n🎉 All variables verified successfully!');
    } else {
      console.log('\n🎉 All variables configured successfully!');
      console.log('   Your Vercel environment is ready.');
    }
  } else {
    console.log('⚠️  CONFIGURATION COMPLETED WITH ERRORS');
    console.log('\n💡 Some variables failed to configure.');
    console.log('   Review the errors above and retry for failed variables.');
    console.log('\n💡 Remediation Steps:');
    console.log('   1. Verify you are logged in to Vercel CLI: vercel login');
    console.log('   2. Verify the project ID is correct');
    console.log('   3. Check that you have permission to modify the project');
    console.log('   4. Retry configuration for failed variables');
  }
  console.log('═'.repeat(60) + '\n');
}

/**
 * Parse command line arguments
 */
function parseArguments(): {
  environment: string;
  options: ConfigOptions;
} | null {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    return null;
  }

  const environment = args[0];
  const options: ConfigOptions = {
    verifyOnly: args.includes('--verify-only'),
  };

  // Parse --config option
  const configIndex = args.indexOf('--config');
  if (configIndex !== -1 && args[configIndex + 1]) {
    options.configPath = args[configIndex + 1];
  }

  // Parse --project-id option
  const projectIdIndex = args.indexOf('--project-id');
  if (projectIdIndex !== -1 && args[projectIdIndex + 1]) {
    options.projectId = args[projectIdIndex + 1];
  }

  return { environment, options };
}

/**
 * Main execution function
 */
async function main() {
  // Parse arguments
  const parsed = parseArguments();

  if (!parsed) {
    console.error('❌ Error: Environment is required');
    console.error('\nUsage:');
    console.error('  ts-node src/scripts/setup-vercel-env.ts <environment> [options]');
    console.error('\nArguments:');
    console.error('  environment    Target environment: production, staging, or development');
    console.error('\nOptions:');
    console.error('  --config <path>    Path to deployment config file (default: deployment-config.json)');
    console.error('  --verify-only      Only verify existing variables without setting new ones');
    console.error('  --project-id <id>  Override Vercel project ID from config');
    console.error('\nExample:');
    console.error('  ts-node src/scripts/setup-vercel-env.ts production');
    console.error('  ts-node src/scripts/setup-vercel-env.ts staging --config ./config/deploy.json');
    console.error('  ts-node src/scripts/setup-vercel-env.ts production --verify-only');
    process.exit(1);
  }

  const { environment, options } = parsed;

  // Run configuration
  const result = await configureVercelEnvironment(environment, options);

  // Print summary
  printConfigurationSummary(result, options);

  // Exit with appropriate code
  process.exit(result.success ? 0 : 1);
}

// Run if executed directly
if (require.main === module) {
  main().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

// Export for testing
export { configureVercelEnvironment, validateVercelCLI, readDeploymentConfig };
export type { ConfigResult, ConfigOptions, EnvironmentVariable, DeploymentConfiguration };
