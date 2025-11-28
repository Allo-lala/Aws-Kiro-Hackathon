# Vercel Environment Configurator

This script automates the process of setting up environment variables in Vercel for your deployment.

## Prerequisites

1. **Vercel CLI**: Install the Vercel CLI globally:
   ```bash
   npm install -g vercel
   ```

2. **Authentication**: Log in to Vercel:
   ```bash
   vercel login
   ```

3. **Configuration File**: Create a `deployment-config.json` file in your project root with your environment configurations.

## Configuration File Format

Create a `deployment-config.json` file with the following structure:

```json
{
  "environments": {
    "production": {
      "name": "production",
      "databaseUrl": "postgresql://user:password@host:5432/database",
      "apiBaseUrl": "https://api.example.com",
      "vercelProjectId": "prj_xxxxxxxxxxxxx",
      "environmentVariables": {
        "DATABASE_URL": "postgresql://user:password@host:5432/database",
        "JWT_SECRET": "your-jwt-secret",
        "BASE_URL": "https://api.example.com",
        "GEOAPIFY_API_KEY": "your-api-key",
        "NODE_ENV": "production"
      }
    },
    "staging": {
      "name": "staging",
      "databaseUrl": "postgresql://user:password@host:5432/staging_db",
      "apiBaseUrl": "https://staging-api.example.com",
      "vercelProjectId": "prj_xxxxxxxxxxxxx",
      "environmentVariables": {
        "DATABASE_URL": "postgresql://user:password@host:5432/staging_db",
        "JWT_SECRET": "staging-jwt-secret",
        "BASE_URL": "https://staging-api.example.com",
        "NODE_ENV": "staging"
      }
    }
  }
}
```

## Usage

### Basic Usage

Set environment variables for production:
```bash
ts-node src/scripts/setup-vercel-env.ts production
```

Set environment variables for staging:
```bash
ts-node src/scripts/setup-vercel-env.ts staging
```

### Advanced Options

#### Custom Configuration File

Use a custom configuration file path:
```bash
ts-node src/scripts/setup-vercel-env.ts production --config ./config/deploy.json
```

#### Verify Only Mode

Verify existing variables without making changes:
```bash
ts-node src/scripts/setup-vercel-env.ts production --verify-only
```

#### Override Project ID

Override the Vercel project ID from the config:
```bash
ts-node src/scripts/setup-vercel-env.ts production --project-id prj_xxxxxxxxxxxxx
```

## How It Works

1. **Validation**: Checks that the Vercel CLI is installed and accessible
2. **Configuration Loading**: Reads the deployment configuration file
3. **Environment Selection**: Loads the specified environment configuration
4. **Variable Setting**: Sets each environment variable using the Vercel CLI
5. **Verification**: Attempts to verify that variables were set correctly
6. **Error Handling**: Continues setting remaining variables even if one fails
7. **Summary**: Displays a comprehensive summary of configured variables

## Error Handling

The script implements robust error handling:

- **Continue on Failure**: If one variable fails to set, the script continues with remaining variables
- **Detailed Error Messages**: Each failure includes specific error details
- **Verification**: Attempts to verify variables after setting (note: Vercel CLI doesn't expose values for security)
- **Exit Codes**: Returns 0 on success, 1 on failure

## Environment Targets

The script automatically maps environment names to Vercel targets:

- `production` → Vercel production environment
- `staging` → Vercel preview environment
- `development` → Vercel development environment

## Security Notes

1. **Sensitive Data**: Never commit `deployment-config.json` with real credentials to version control
2. **Add to .gitignore**: Ensure the config file is in your `.gitignore`
3. **Use Environment-Specific Files**: Consider using separate config files for each environment
4. **Verification Limitations**: The Vercel CLI doesn't expose variable values for security reasons, so verification only confirms existence

## Troubleshooting

### "Vercel CLI is not installed"

Install the Vercel CLI:
```bash
npm install -g vercel
```

### "Configuration file not found"

Ensure `deployment-config.json` exists in your project root, or specify the path with `--config`.

### "Environment not found in configuration"

Check that your environment name matches one defined in the config file (e.g., "production", "staging").

### "Failed to configure variable"

Common causes:
- Not logged in to Vercel: Run `vercel login`
- Insufficient permissions: Ensure you have access to the project
- Invalid project ID: Verify the `vercelProjectId` in your config

### Variables Not Showing in Vercel Dashboard

- Wait a few moments for changes to propagate
- Refresh the Vercel dashboard
- Check that you're viewing the correct project and environment

## Example Workflow

1. Create your configuration file:
   ```bash
   cp deployment-config.example.json deployment-config.json
   # Edit deployment-config.json with your actual values
   ```

2. Log in to Vercel:
   ```bash
   vercel login
   ```

3. Set production variables:
   ```bash
   ts-node src/scripts/setup-vercel-env.ts production
   ```

4. Verify variables were set:
   ```bash
   ts-node src/scripts/setup-vercel-env.ts production --verify-only
   ```

5. Deploy your application:
   ```bash
   vercel --prod
   ```

## Integration with Other Scripts

This script is part of the deployment workflow and works alongside:

- `run-migrations.ts` - Run database migrations
- `seed-database.ts` - Seed initial data
- `init-database.ts` - Complete database setup
- `verify-deployment.ts` - Verify deployment readiness
- `deployment-checklist.ts` - Pre-deployment validation

## Exit Codes

- `0` - Success: All variables configured successfully
- `1` - Failure: One or more variables failed to configure

## Output

The script provides detailed output including:

- Validation status
- Configuration loading status
- Progress for each variable
- Verification results
- Comprehensive summary
- Error details and remediation steps
