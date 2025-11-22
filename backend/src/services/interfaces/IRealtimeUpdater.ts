import { RouteAlternative } from '../../models/RouteAlternative';

export interface UpdateSubscription {
  id: string;
  routeIds: string[];
  userId?: string;
  callback: (update: RouteUpdate) => void;
  isActive: boolean;
}

export interface RouteUpdate {
  routeId: string;
  updateType: 'disruption' | 'delay' | 'cancellation' | 'route_change';
  severity: 'low' | 'medium' | 'high';
  message: string;
  affectedSegments: string[];
  alternativeRoutes?: RouteAlternative[];
  estimatedResolution?: Date;
  timestamp: Date;
}

export interface TransportationDisruption {
  id: string;
  type: 'service_interruption' | 'delay' | 'route_closure' | 'weather' | 'maintenance';
  affectedRoutes: string[];
  severity: 'low' | 'medium' | 'high';
  startTime: Date;
  estimatedEndTime?: Date;
  description: string;
  alternativeOptions: string[];
}

export interface IRealtimeUpdater {
  /**
   * Subscribe to real-time updates for specific routes
   * @param routes Array of routes to monitor
   * @returns Subscription object for managing updates
   */
  subscribeToUpdates(routes: RouteAlternative[]): Promise<UpdateSubscription>;

  /**
   * Handle transportation disruption and calculate alternative routes
   * @param disruption Disruption event details
   * @returns Array of route updates with alternatives
   */
  handleDisruption(disruption: TransportationDisruption): Promise<RouteUpdate[]>;

  /**
   * Refresh route data with latest real-time information
   * @param routeId Route identifier to refresh
   * @returns Updated route alternative with current data
   */
  refreshRouteData(routeId: string): Promise<RouteAlternative>;
}