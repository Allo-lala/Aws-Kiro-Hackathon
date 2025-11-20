// Main entry point for Rutty: Your Green Journey Companion
import { RoutePlannerService } from './services/RoutePlannerService';
import { CarbonCalculatorService } from './services/CarbonCalculatorService';
import { UserTrackerService } from './services/UserTrackerService';
import { RealtimeUpdaterService } from './services/RealtimeUpdaterService';
import { ApiGateway } from './gateway/ApiGateway';
import { ExternalServiceManager } from './gateway/ExternalServiceManager';
import { ServiceHealthMonitor } from './gateway/ServiceHealthMonitor';

export class RuttyApplication {
  private routePlanner: RoutePlannerService;
  private carbonCalculator: CarbonCalculatorService;
  private userTracker: UserTrackerService;
  private realtimeUpdater: RealtimeUpdaterService;
  private apiGateway: ApiGateway;
  private externalServiceManager: ExternalServiceManager;
  private healthMonitor: ServiceHealthMonitor;

  constructor() {
    // Initialize API gateway with logging
    this.apiGateway = new ApiGateway((level, message, meta) => {
      console.log(`[API-GATEWAY] ${level.toUpperCase()}: ${message}`, meta || '');
    });

    // Initialize external service manager
    this.externalServiceManager = new ExternalServiceManager(this.apiGateway);

    // Initialize health monitor
    this.healthMonitor = new ServiceHealthMonitor(this.apiGateway, (level, message, meta) => {
      console.log(`[HEALTH-MONITOR] ${level.toUpperCase()}: ${message}`, meta || '');
    });

    // Initialize services with gateway integration
    this.routePlanner = new RoutePlannerService(undefined, this.apiGateway);
    this.carbonCalculator = new CarbonCalculatorService();
    this.userTracker = new UserTrackerService();
    this.realtimeUpdater = new RealtimeUpdaterService(undefined, this.routePlanner, this.externalServiceManager);
  }

  async initialize(): Promise<void> {
    console.log('Initializing Rutty: Your Green Journey Companion...');
    
    try {
      // Start health monitoring
      this.healthMonitor.startMonitoring({
        interval: 30000, // 30 seconds
        timeout: 5000,   // 5 seconds
        retries: 2
      });

      console.log('✅ API Gateway initialized');
      console.log('✅ External service manager initialized');
      console.log('✅ Health monitoring started');
      console.log('🌱 Rutty application ready!');
    } catch (error) {
      console.error('❌ Failed to initialize Rutty application:', error);
      throw error;
    }
  }

  getRoutePlanner(): RoutePlannerService {
    return this.routePlanner;
  }

  getCarbonCalculator(): CarbonCalculatorService {
    return this.carbonCalculator;
  }

  getUserTracker(): UserTrackerService {
    return this.userTracker;
  }

  getRealtimeUpdater(): RealtimeUpdaterService {
    return this.realtimeUpdater;
  }

  getApiGateway(): ApiGateway {
    return this.apiGateway;
  }

  getExternalServiceManager(): ExternalServiceManager {
    return this.externalServiceManager;
  }

  getHealthMonitor(): ServiceHealthMonitor {
    return this.healthMonitor;
  }

  async shutdown(): Promise<void> {
    console.log('Shutting down Rutty application...');
    
    try {
      // Stop health monitoring
      this.healthMonitor.stopMonitoring();
      
      // Clear caches
      this.externalServiceManager.clearCaches();
      
      console.log('✅ Rutty application shutdown complete');
    } catch (error) {
      console.error('❌ Error during shutdown:', error);
      throw error;
    }
  }
}

// Export all modules for external use
export * from './models';
export * from './services';
export * from './api';

// Create and export default application instance
export const ruttyApp = new RuttyApplication();