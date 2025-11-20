import { UserPreferences, TripRecord, SustainabilityMetrics } from '../../models/UserPreferences';
import { RouteAlternative } from '../../models/RouteAlternative';
import { TransportationMode } from '../../models/TransportationMode';
import { AccessibilityRequirement } from '../../models/common';

export interface IUserTracker {
  /**
   * Record a completed trip for carbon footprint tracking
   * @param userId User identifier
   * @param route Route that was taken
   * @param actualMode Transportation mode actually used
   * @returns Trip record with savings calculation
   */
  recordTrip(
    userId: string, 
    route: RouteAlternative, 
    actualMode: TransportationMode
  ): Promise<TripRecord>;

  /**
   * Calculate cumulative carbon footprint savings for a user
   * @param userId User identifier
   * @param timeframe Time period for calculation
   * @returns Sustainability metrics and savings data
   */
  calculateSavings(
    userId: string, 
    timeframe: { start: Date; end: Date }
  ): Promise<SustainabilityMetrics>;

  /**
   * Get user preferences for route planning
   * @param userId User identifier
   * @returns User preferences and settings
   */
  getUserPreferences(userId: string): Promise<UserPreferences>;

  /**
   * Update user accessibility requirements
   * @param userId User identifier
   * @param needs Updated accessibility requirements
   */
  updateAccessibilityNeeds(
    userId: string, 
    needs: AccessibilityRequirement[]
  ): Promise<void>;
}