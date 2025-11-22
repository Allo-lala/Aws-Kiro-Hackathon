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
      const response = await apiClient.post<CalculateRoutesResponse>(
        '/routes/calculate',
        request
      );
      return response.data.routes;
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
      const response = await apiClient.post<SaveTripResponse>(
        '/routes/save-trip',
        request
      );
      return response.data;
    } catch (error: any) {
      console.error('Error saving trip:', error);
      throw new Error(
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
