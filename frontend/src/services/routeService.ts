import { apiClient } from './apiClient';
import { Location, RouteAlternative } from '../types/models';

export interface CalculateRoutesRequest {
  origin: Location;
  destination: Location;
  modes: string[];
  preferences?: any;
}

export interface CalculateRoutesResponse {
  routes: RouteAlternative[];
}

export interface SaveTripRequest {
  origin: Location;
  destination: Location;
  selectedRoute: RouteAlternative;
  actualTransportationMode: string;
}

export interface SaveTripResponse {
  tripId: string;
  message: string;
}

export const routeService = {
  /**
   * Calculate routes using the backend API
   */
  async calculateRoutes(request: CalculateRoutesRequest): Promise<RouteAlternative[]> {
    try {
      const response = await apiClient.post<any>(
        '/routes/calculate',
        request
      );
      // Backend returns {success: true, data: {routes: [...], origin: ..., destination: ...}}
      const routes = response.data?.data?.routes || response.data?.routes || [];
      console.log('Received routes from backend:', routes);
      return routes;
    } catch (error: any) {
      console.error('Error calculating routes:', error);
      throw new Error(
        error.response?.data?.message || 
        'Failed to calculate routes. Please try again.'
      );
    }
  },

  /**
   * Save a completed trip
   */
  async saveTrip(request: SaveTripRequest): Promise<SaveTripResponse> {
    try {
      // Transform the request to match backend expectations
      const carbonSavings = request.selectedRoute.carbonFootprint?.comparisonToAverage || 0;
      
      const backendRequest = {
        originLat: request.origin.latitude,
        originLng: request.origin.longitude,
        originName: request.origin.name || '',
        destinationLat: request.destination.latitude,
        destinationLng: request.destination.longitude,
        destinationName: request.destination.name || '',
        selectedRoute: request.selectedRoute,
        actualTransportationMode: request.actualTransportationMode,
        // Carbon savings must be positive - if negative, it means more emissions, so set to 0
        carbonSavings: Math.max(0, Math.abs(carbonSavings)),
        distance: request.selectedRoute.distance,
        // Duration must be an integer (convert from minutes to whole number)
        duration: Math.round(request.selectedRoute.duration),
      };

      console.log('Sending save trip request:', JSON.stringify(backendRequest, null, 2));

      const response = await apiClient.post<any>(
        '/routes/save-trip',
        backendRequest
      );
      return response.data?.data || response.data;
    } catch (error: any) {
      console.error('Error saving trip:', error);
      console.error('Error response data:', error.response?.data);
      console.error('Validation details:', error.response?.data?.details);
      
      // Show validation errors if available
      if (error.response?.data?.details) {
        const validationErrors = error.response.data.details
          .map((d: any) => `${d.field}: ${d.message}`)
          .join(', ');
        throw new Error(`Validation failed: ${validationErrors}`);
      }
      
      throw new Error(
        error.response?.data?.error || 
        error.response?.data?.message || 
        'Failed to save trip. Please try again.'
      );
    }
  },

  /**
   * Get a cached route by ID
   */
  async getCachedRoute(routeId: string): Promise<RouteAlternative> {
    try {
      const response = await apiClient.get<RouteAlternative>(
        `/routes/${routeId}`
      );
      return response.data;
    } catch (error: any) {
      console.error('Error fetching cached route:', error);
      throw new Error(
        error.response?.data?.message || 
        'Failed to fetch route. Please try again.'
      );
    }
  },
};
