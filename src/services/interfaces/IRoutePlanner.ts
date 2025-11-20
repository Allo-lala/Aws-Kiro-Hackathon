import { Location } from '../../models/Location';
import { RouteAlternative } from '../../models/RouteAlternative';
import { TransportationMode } from '../../models/TransportationMode';
import { UserPreferences } from '../../models/UserPreferences';
import { LocationValidation } from '../../models/common';

export interface IRoutePlanner {
  /**
   * Calculate multiple route alternatives between origin and destination
   * @param origin Starting location
   * @param destination End location
   * @param preferences User preferences for route calculation
   * @returns Array of route alternatives with different transportation modes
   */
  calculateRoutes(
    origin: Location, 
    destination: Location, 
    preferences?: UserPreferences
  ): Promise<RouteAlternative[]>;

  /**
   * Get available transportation modes for a specific location
   * @param location Location to check transportation availability
   * @returns Array of available transportation modes
   */
  getTransportationModes(location: Location): Promise<TransportationMode[]>;

  /**
   * Validate and normalize a location input
   * @param location Location to validate
   * @returns Validation result with normalized location or suggestions
   */
  validateLocation(location: Location): Promise<LocationValidation>;
}