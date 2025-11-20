import { IUserTracker } from './interfaces/IUserTracker';
import { UserPreferences, TripRecord, SustainabilityMetrics } from '../models/UserPreferences';
import { RouteAlternative } from '../models/RouteAlternative';
import { TransportationMode } from '../models/TransportationMode';
import { AccessibilityRequirement } from '../models/common';

export class UserTrackerService implements IUserTracker {
  async recordTrip(
    _userId: string, 
    _route: RouteAlternative, 
    _actualMode: TransportationMode
  ): Promise<TripRecord> {
    // Implementation will be added in subsequent tasks
    throw new Error('Method not implemented');
  }

  async calculateSavings(
    _userId: string, 
    _timeframe: { start: Date; end: Date }
  ): Promise<SustainabilityMetrics> {
    // Implementation will be added in subsequent tasks
    throw new Error('Method not implemented');
  }

  async getUserPreferences(_userId: string): Promise<UserPreferences> {
    // Implementation will be added in subsequent tasks
    throw new Error('Method not implemented');
  }

  async updateAccessibilityNeeds(
    _userId: string, 
    _needs: AccessibilityRequirement[]
  ): Promise<void> {
    // Implementation will be added in subsequent tasks
    throw new Error('Method not implemented');
  }
}