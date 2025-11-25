import 'reflect-metadata';
import * as dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

import { createApp } from './app';
import { DatabaseService } from './services/DatabaseService';
import { RealRouteCalculationService, RealRouteCalculationConfig } from './services/RealRouteCalculationService';

const PORT = process.env.PORT || 8080;

/**
 * Start the server
 */
async function startServer() {
  try {
    console.log('🚀 Starting Rutty Backend Server...');

    // Initialize database service
    console.log('📦 Connecting to database...');
    const databaseService = new DatabaseService();
    await databaseService.connect();
    console.log('✅ Database connected');

    // Run migrations
    console.log('🔄 Running database migrations...');
    await databaseService.runMigrations();
    console.log('✅ Migrations complete');

    // Initialize route calculation service (optional)
    let routeService: RealRouteCalculationService | undefined;
    
    if (process.env.ROUTE_API_PROVIDER && process.env.ROUTE_API_KEY) {
      console.log('🗺️  Initializing route calculation service...');
      
      const routeConfig: RealRouteCalculationConfig = {
        provider: process.env.ROUTE_API_PROVIDER as 'google_maps' | 'geoapify',
        apiKey: process.env.ROUTE_API_KEY,
        enableCache: process.env.ROUTE_CACHE_ENABLED !== 'false',
        cacheTTLMinutes: parseInt(process.env.ROUTE_CACHE_TTL || '60', 10),
        timeout: parseInt(process.env.ROUTE_API_TIMEOUT || '5000', 10),
        maxRetries: parseInt(process.env.ROUTE_API_MAX_RETRIES || '3', 10),
      };

      routeService = new RealRouteCalculationService(routeConfig);
      console.log(`✅ Route calculation service initialized (${routeConfig.provider})`);
    } else {
      console.log('⚠️  Route calculation service not configured (missing ROUTE_API_PROVIDER or ROUTE_API_KEY)');
    }

    // Create Express app
    const app = createApp(databaseService, routeService);

    // Start listening
    const server = app.listen(PORT, () => {
      console.log('');
      console.log('🌱 Rutty Backend Server is running!');
      console.log(`📍 Server: http://localhost:${PORT}`);
      console.log(`🔌 API: http://localhost:${PORT}/api`);
      console.log(`💚 Health: http://localhost:${PORT}/health`);
      console.log('');
    });

    // Graceful shutdown
    const shutdown = async () => {
      console.log('\n🛑 Shutting down gracefully...');
      
      server.close(async () => {
        console.log('📪 HTTP server closed');
        
        try {
          await databaseService.disconnect();
          console.log('📦 Database disconnected');
          console.log('✅ Shutdown complete');
          process.exit(0);
        } catch (error) {
          console.error('❌ Error during shutdown:', error);
          process.exit(1);
        }
      });

      // Force shutdown after 10 seconds
      setTimeout(() => {
        console.error('⚠️  Forced shutdown after timeout');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);

  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server if this file is run directly
if (require.main === module) {
  startServer();
}

export { startServer };
