// Main entry point for Rutty: Your Green Journey Companion
import { RoutePlannerService } from './services/RoutePlannerService';
import { CarbonCalculatorService } from './services/CarbonCalculatorService';
import { UserTrackerService } from './services/UserTrackerService';
import { RealtimeUpdaterService } from './services/RealtimeUpdaterService';

export class RuttyApplication {
  private routePlanner: RoutePlannerService;
  private carbonCalculator: CarbonCalculatorService;
  private userTracker: UserTrackerService;
  private realtimeUpdater: RealtimeUpdaterService;

  constructor() {
    this.routePlanner = new RoutePlannerService();
    this.carbonCalculator = new CarbonCalculatorService();
    this.userTracker = new UserTrackerService();
    this.realtimeUpdater = new RealtimeUpdaterService();
  }

  async initialize(): Promise<void> {
    console.log('Initializing Rutty: Your Green Journey Companion...');
    // Initialization logic will be added in subsequent tasks
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
}

// Export all modules for external use
export * from './models';
export * from './services';
export * from './api';

// Create and export default application instance
export const ruttyApp = new RuttyApplication();