import { IRealtimeUpdater, UpdateSubscription, RouteUpdate, TransportationDisruption } from './interfaces/IRealtimeUpdater';
import { RouteAlternative } from '../models/RouteAlternative';

export class RealtimeUpdaterService implements IRealtimeUpdater {
  async subscribeToUpdates(_routes: RouteAlternative[]): Promise<UpdateSubscription> {
    // Implementation will be added in subsequent tasks
    throw new Error('Method not implemented');
  }

  async handleDisruption(_disruption: TransportationDisruption): Promise<RouteUpdate[]> {
    // Implementation will be added in subsequent tasks
    throw new Error('Method not implemented');
  }

  async refreshRouteData(_routeId: string): Promise<RouteAlternative> {
    // Implementation will be added in subsequent tasks
    throw new Error('Method not implemented');
  }
}