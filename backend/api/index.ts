import 'reflect-metadata';
import { createApp } from '../src/app';
import { DatabaseService } from '../src/services/DatabaseService';
import { RealRouteCalculationService, RealRouteCalculationConfig } from '../src/services/RealRouteCalculationService';

// Initialize services
let databaseService: DatabaseService;
let routeService: RealRouteCalculationService | undefined;
let appInstance: any;

async function getApp() {
  if (appInstance) {
    return appInstance;
  }

  // Initialize database service
  databaseService = new DatabaseService();
  await databaseService.connect();

  // Run migrations
  await databaseService.runMigrations();

  // Initialize route calculation service (optional)
  if (process.env.ROUTE_API_PROVIDER && process.env.ROUTE_API_KEY) {
    const routeConfig: RealRouteCalculationConfig = {
      provider: process.env.ROUTE_API_PROVIDER as 'google_maps' | 'geoapify',
      apiKey: process.env.ROUTE_API_KEY,
      enableCache: process.env.ROUTE_CACHE_ENABLED !== 'false',
      cacheTTLMinutes: parseInt(process.env.ROUTE_CACHE_TTL || '60', 10),
      timeout: parseInt(process.env.ROUTE_API_TIMEOUT || '5000', 10),
      maxRetries: parseInt(process.env.ROUTE_API_MAX_RETRIES || '3', 10),
    };

    routeService = new RealRouteCalculationService(routeConfig);
  }

  // Create Express app
  appInstance = createApp(databaseService, routeService);
  
  return appInstance;
}

// Export handler for Vercel
export default async function handler(req: any, res: any) {
  const app = await getApp();
  return app(req, res);
}
