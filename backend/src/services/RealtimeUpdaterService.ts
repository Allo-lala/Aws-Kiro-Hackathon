import { IRealtimeUpdater, UpdateSubscription, RouteUpdate, TransportationDisruption } from './interfaces/IRealtimeUpdater';
import { RouteAlternative } from '../models/RouteAlternative';
import { RoutePlannerService } from './RoutePlannerService';
import { EcoRankingService, RankingCriteria } from './EcoRankingService';
import { TransportationType } from '../models/common';
import { ExternalServiceManager } from '../gateway/ExternalServiceManager';

interface RealtimeDataSource {
  getDelayInfo(routeId: string): Promise<DelayInfo | null>;
  getDisruptions(): Promise<TransportationDisruption[]>;
  subscribeToUpdates(routeIds: string[], callback: (update: RouteUpdate) => void): Promise<string>;
  unsubscribe(subscriptionId: string): Promise<void>;
}

interface DelayInfo {
  routeId: string;
  delayMinutes: number;
  reason: string;
  affectedSegments: string[];
  lastUpdated: Date;
}

// Mock real-time data source for demonstration
class MockRealtimeDataSource implements RealtimeDataSource {
  private subscriptions = new Map<string, { routeIds: string[], callback: (update: RouteUpdate) => void }>();
  private disruptions: TransportationDisruption[] = [];

  async getDelayInfo(routeId: string): Promise<DelayInfo | null> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 10));
    
    // Mock delay data - randomly generate delays for demonstration
    if (Math.random() < 0.3) { // 30% chance of delay
      return {
        routeId,
        delayMinutes: Math.floor(Math.random() * 20) + 5, // 5-25 minute delays
        reason: this.getRandomDelayReason(),
        affectedSegments: [`segment-${Math.floor(Math.random() * 3)}`],
        lastUpdated: new Date()
      };
    }
    
    return null;
  }

  async getDisruptions(): Promise<TransportationDisruption[]> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 15));
    return [...this.disruptions];
  }

  async subscribeToUpdates(routeIds: string[], callback: (update: RouteUpdate) => void): Promise<string> {
    const subscriptionId = `sub-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    this.subscriptions.set(subscriptionId, { routeIds, callback });
    
    // Simulate periodic updates
    this.startPeriodicUpdates(subscriptionId);
    
    return subscriptionId;
  }

  async unsubscribe(subscriptionId: string): Promise<void> {
    this.subscriptions.delete(subscriptionId);
  }

  // Add a disruption for testing
  addDisruption(disruption: TransportationDisruption): void {
    this.disruptions.push(disruption);
    this.notifySubscribers(disruption);
  }

  private startPeriodicUpdates(subscriptionId: string): void {
    const interval = setInterval(async () => {
      const subscription = this.subscriptions.get(subscriptionId);
      if (!subscription) {
        clearInterval(interval);
        return;
      }

      // Randomly generate updates for subscribed routes
      for (const routeId of subscription.routeIds) {
        if (Math.random() < 0.1) { // 10% chance of update per check
          const delayInfo = await this.getDelayInfo(routeId);
          if (delayInfo) {
            const update: RouteUpdate = {
              routeId,
              updateType: 'delay',
              severity: delayInfo.delayMinutes > 15 ? 'high' : delayInfo.delayMinutes > 10 ? 'medium' : 'low',
              message: `${delayInfo.delayMinutes} minute delay: ${delayInfo.reason}`,
              affectedSegments: delayInfo.affectedSegments,
              timestamp: new Date()
            };
            subscription.callback(update);
          }
        }
      }
    }, 30000); // Check every 30 seconds
  }

  private notifySubscribers(disruption: TransportationDisruption): void {
    for (const subscription of this.subscriptions.values()) {
      const affectedRoutes = subscription.routeIds.filter(routeId => 
        disruption.affectedRoutes.includes(routeId)
      );
      
      if (affectedRoutes.length > 0) {
        for (const routeId of affectedRoutes) {
          const update: RouteUpdate = {
            routeId,
            updateType: 'disruption',
            severity: disruption.severity,
            message: disruption.description,
            affectedSegments: [], // Would be populated with actual affected segments
            timestamp: new Date()
          };
          subscription.callback(update);
        }
      }
    }
  }

  private getRandomDelayReason(): string {
    const reasons = [
      'Heavy traffic conditions',
      'Signal maintenance',
      'Weather conditions',
      'Vehicle breakdown',
      'Construction work',
      'High passenger volume'
    ];
    return reasons[Math.floor(Math.random() * reasons.length)];
  }
}

export class RealtimeUpdaterService implements IRealtimeUpdater {
  private dataSource: RealtimeDataSource;
  private routePlannerService: RoutePlannerService;
  private ecoRankingService: EcoRankingService;
  private subscriptions = new Map<string, UpdateSubscription>();
  private routeCache = new Map<string, RouteAlternative>();
  private externalServiceManager?: ExternalServiceManager;

  constructor(
    dataSource?: RealtimeDataSource,
    routePlannerService?: RoutePlannerService,
    externalServiceManager?: ExternalServiceManager
  ) {
    this.dataSource = dataSource || new MockRealtimeDataSource();
    this.routePlannerService = routePlannerService || new RoutePlannerService();
    this.ecoRankingService = new EcoRankingService();
    this.externalServiceManager = externalServiceManager;
  }

  async subscribeToUpdates(routes: RouteAlternative[]): Promise<UpdateSubscription> {
    try {
      if (!routes || routes.length === 0) {
        throw new Error('No routes provided for subscription');
      }

      // Cache routes for later reference
      routes.forEach(route => {
        this.routeCache.set(route.id, route);
      });

      const routeIds = routes.map(route => route.id);
      const subscriptionId = `subscription-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      // Create update callback that handles notifications
      const callback = (update: RouteUpdate) => {
        this.handleRouteUpdate(subscriptionId, update);
      };

      // Subscribe to real-time data source
      const dataSourceSubId = await this.dataSource.subscribeToUpdates(routeIds, callback);

      const subscription: UpdateSubscription = {
        id: subscriptionId,
        routeIds,
        callback,
        isActive: true
      };

      this.subscriptions.set(subscriptionId, subscription);

      return subscription;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to subscribe to updates: ${error.message}`);
      }
      throw new Error('Failed to subscribe to updates due to an unknown error');
    }
  }

  async handleDisruption(disruption: TransportationDisruption): Promise<RouteUpdate[]> {
    try {
      if (!disruption || !disruption.affectedRoutes || disruption.affectedRoutes.length === 0) {
        throw new Error('Invalid disruption data provided');
      }

      // Get real-time disruption data from external service manager if available
      if (this.externalServiceManager) {
        try {
          const currentDisruptions = await this.externalServiceManager.getTransportationDisruptions();
          // Merge with provided disruption for comprehensive handling
          const allDisruptions = [disruption, ...currentDisruptions.disruptions];
          
          // Process all disruptions for better route recalculation
          return await this.processMultipleDisruptions(allDisruptions);
        } catch (error) {
          console.warn('Failed to get real-time disruption data, proceeding with provided disruption:', error);
        }
      }

      const updates: RouteUpdate[] = [];

      for (const routeId of disruption.affectedRoutes) {
        const cachedRoute = this.routeCache.get(routeId);
        if (!cachedRoute) {
          console.warn(`Route ${routeId} not found in cache, skipping disruption handling`);
          continue;
        }

        try {
          // Calculate alternative routes prioritizing eco-friendly options
          const alternativeRoutes = await this.calculateEcoFriendlyAlternatives(
            cachedRoute,
            disruption
          );

          const update: RouteUpdate = {
            routeId,
            updateType: 'disruption',
            severity: disruption.severity,
            message: `${disruption.description}. ${alternativeRoutes.length} eco-friendly alternatives available.`,
            affectedSegments: this.getAffectedSegments(cachedRoute, disruption),
            alternativeRoutes,
            estimatedResolution: disruption.estimatedEndTime,
            timestamp: new Date()
          };

          updates.push(update);

          // Notify active subscriptions
          this.notifySubscriptions(update);

        } catch (error) {
          console.error(`Failed to handle disruption for route ${routeId}:`, error);
          
          // Create update without alternatives if calculation fails
          const update: RouteUpdate = {
            routeId,
            updateType: 'disruption',
            severity: 'high', // Escalate severity if we can't provide alternatives
            message: `${disruption.description}. Unable to calculate alternatives at this time.`,
            affectedSegments: this.getAffectedSegments(cachedRoute, disruption),
            estimatedResolution: disruption.estimatedEndTime,
            timestamp: new Date()
          };

          updates.push(update);
          this.notifySubscriptions(update);
        }
      }

      return updates;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to handle disruption: ${error.message}`);
      }
      throw new Error('Failed to handle disruption due to an unknown error');
    }
  }

  async refreshRouteData(routeId: string): Promise<RouteAlternative> {
    try {
      if (!routeId || routeId.trim() === '') {
        throw new Error('Invalid route ID provided');
      }

      const cachedRoute = this.routeCache.get(routeId);
      if (!cachedRoute) {
        throw new Error(`Route ${routeId} not found in cache`);
      }

      // Get real-time delay information
      const delayInfo = await this.dataSource.getDelayInfo(routeId);
      
      if (!delayInfo) {
        // No delays, return cached route
        return cachedRoute;
      }

      // Create updated route with delay information
      const updatedRoute: RouteAlternative = {
        ...cachedRoute,
        estimatedTime: cachedRoute.estimatedTime + delayInfo.delayMinutes,
        segments: cachedRoute.segments.map(segment => {
          if (delayInfo.affectedSegments.includes(segment.id)) {
            return {
              ...segment,
              estimatedTime: segment.estimatedTime + (delayInfo.delayMinutes / delayInfo.affectedSegments.length)
            };
          }
          return segment;
        })
      };

      // Update cache with new data
      this.routeCache.set(routeId, updatedRoute);

      return updatedRoute;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to refresh route data: ${error.message}`);
      }
      throw new Error('Failed to refresh route data due to an unknown error');
    }
  }

  // Helper method to unsubscribe from updates
  async unsubscribe(subscriptionId: string): Promise<void> {
    const subscription = this.subscriptions.get(subscriptionId);
    if (subscription) {
      subscription.isActive = false;
      this.subscriptions.delete(subscriptionId);
    }
  }

  // Helper method to get all active subscriptions (for testing/monitoring)
  getActiveSubscriptions(): UpdateSubscription[] {
    return Array.from(this.subscriptions.values()).filter(sub => sub.isActive);
  }

  private async calculateEcoFriendlyAlternatives(
    originalRoute: RouteAlternative,
    disruption: TransportationDisruption
  ): Promise<RouteAlternative[]> {
    try {
      // Calculate new routes avoiding disrupted transportation modes
      const alternativeRoutes = await this.routePlannerService.calculateRoutes(
        originalRoute.origin,
        originalRoute.destination
      );

      // Filter out routes that use disrupted transportation modes
      const disruptedModes = this.getDisruptedTransportationModes(disruption);
      const viableRoutes = alternativeRoutes.filter(route => {
        return !route.transportationModes.some(mode => 
          disruptedModes.includes(mode.type)
        );
      });

      // Prioritize eco-friendly alternatives using EcoRankingService
      const rankingCriteria: RankingCriteria = {
        prioritizePublicTransit: true,
        highlightZeroEmission: true,
        weightEnvironmentOverTime: 0.8 // Prioritize environment during disruptions
      };

      const rankedRoutes = this.ecoRankingService.rankRoutesByEcoFriendliness(
        viableRoutes,
        rankingCriteria
      );

      // Return top 3 alternatives to avoid overwhelming users
      return rankedRoutes.slice(0, 3);
    } catch (error) {
      console.error('Failed to calculate eco-friendly alternatives:', error);
      return [];
    }
  }

  private getDisruptedTransportationModes(disruption: TransportationDisruption): TransportationType[] {
    // Map disruption types to affected transportation modes
    switch (disruption.type) {
      case 'service_interruption':
        return ['public_transit'];
      case 'route_closure':
        return ['conventional_vehicle', 'electric_vehicle', 'rideshare'];
      case 'weather':
        return ['cycling', 'walking']; // Severe weather affects outdoor modes
      case 'maintenance':
        return ['public_transit']; // Usually affects transit systems
      default:
        return []; // Unknown disruption type, don't filter modes
    }
  }

  private getAffectedSegments(route: RouteAlternative, disruption: TransportationDisruption): string[] {
    // Determine which segments are affected by the disruption
    const disruptedModes = this.getDisruptedTransportationModes(disruption);
    
    return route.segments
      .filter(segment => disruptedModes.includes(segment.transportationMode.type))
      .map(segment => segment.id);
  }

  private handleRouteUpdate(subscriptionId: string, update: RouteUpdate): void {
    const subscription = this.subscriptions.get(subscriptionId);
    if (subscription && subscription.isActive) {
      // Log update for monitoring
      console.info(`Route update for subscription ${subscriptionId}:`, {
        routeId: update.routeId,
        type: update.updateType,
        severity: update.severity,
        message: update.message
      });

      // The callback is already handled by the subscription
      // This method can be extended for additional processing
    }
  }

  private async processMultipleDisruptions(disruptions: any[]): Promise<RouteUpdate[]> {
    const updates: RouteUpdate[] = [];
    const processedRoutes = new Set<string>();

    for (const disruption of disruptions) {
      if (!disruption.affected_routes && !disruption.affectedRoutes) continue;
      
      const affectedRoutes = disruption.affected_routes || disruption.affectedRoutes;
      
      for (const routeId of affectedRoutes) {
        if (processedRoutes.has(routeId)) continue;
        processedRoutes.add(routeId);

        const cachedRoute = this.routeCache.get(routeId);
        if (!cachedRoute) continue;

        try {
          // Convert external disruption format to internal format
          const normalizedDisruption: TransportationDisruption = {
            id: disruption.id || `disruption-${Date.now()}`,
            type: this.mapDisruptionType(disruption.type),
            affectedRoutes: [routeId],
            severity: disruption.severity || 'medium',
            description: disruption.description || 'Transportation disruption',
            startTime: new Date(disruption.start_time || Date.now()),
            estimatedEndTime: disruption.end_time ? new Date(disruption.end_time) : undefined,
            alternativeOptions: ['public_transit', 'walking', 'cycling', 'electric_vehicle']
          };

          const alternativeRoutes = await this.calculateEcoFriendlyAlternatives(
            cachedRoute,
            normalizedDisruption
          );

          const update: RouteUpdate = {
            routeId,
            updateType: 'disruption',
            severity: normalizedDisruption.severity,
            message: `${normalizedDisruption.description}. ${alternativeRoutes.length} eco-friendly alternatives available.`,
            affectedSegments: this.getAffectedSegments(cachedRoute, normalizedDisruption),
            alternativeRoutes,
            estimatedResolution: normalizedDisruption.estimatedEndTime,
            timestamp: new Date()
          };

          updates.push(update);
          this.notifySubscriptions(update);

        } catch (error) {
          console.error(`Failed to process disruption for route ${routeId}:`, error);
        }
      }
    }

    return updates;
  }

  private mapDisruptionType(externalType: string): 'service_interruption' | 'route_closure' | 'weather' | 'maintenance' {
    switch (externalType) {
      case 'delay':
      case 'cancellation':
        return 'service_interruption';
      case 'route_change':
        return 'route_closure';
      default:
        return 'maintenance';
    }
  }

  private notifySubscriptions(update: RouteUpdate): void {
    for (const subscription of this.subscriptions.values()) {
      if (subscription.isActive && subscription.routeIds.includes(update.routeId)) {
        try {
          subscription.callback(update);
        } catch (error) {
          console.error(`Failed to notify subscription ${subscription.id}:`, error);
        }
      }
    }
  }
}