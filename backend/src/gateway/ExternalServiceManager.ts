import { ApiGateway, ExternalServiceConfig } from './ApiGateway';
import { Location } from '../models/Location';
import { RouteAlternative } from '../models/RouteAlternative';
import { TransportationMode } from '../models/TransportationMode';

export interface RouteApiResponse {
  routes: Array<{
    legs: Array<{
      distance: { value: number };
      duration: { value: number };
      steps: Array<{
        travel_mode: string;
        distance: { value: number };
        duration: { value: number };
      }>;
    }>;
  }>;
  status: string;
}

export interface TransitApiResponse {
  routes: Array<{
    legs: Array<{
      departure_time: { value: number };
      arrival_time: { value: number };
      steps: Array<{
        travel_mode: string;
        transit_details?: {
          line: { vehicle: { type: string } };
        };
      }>;
    }>;
  }>;
}

export interface DisruptionApiResponse {
  disruptions: Array<{
    id: string;
    type: 'delay' | 'cancellation' | 'route_change';
    affected_routes: string[];
    severity: 'low' | 'medium' | 'high';
    description: string;
    start_time: string;
    end_time?: string;
  }>;
}

export class ExternalServiceManager {
  private gateway: ApiGateway;
  private readonly CACHE_TTL = {
    ROUTES: 5 * 60 * 1000, // 5 minutes
    TRANSIT: 2 * 60 * 1000, // 2 minutes
    DISRUPTIONS: 30 * 1000, // 30 seconds
    GEOCODING: 60 * 60 * 1000, // 1 hour
  };

  constructor(gateway: ApiGateway) {
    this.gateway = gateway;
    this.initializeServices();
  }

  private initializeServices(): void {
    // Google Maps API configuration
    this.gateway.registerService('google-maps', {
      baseURL: 'https://maps.googleapis.com/maps/api',
      timeout: 10000,
      retries: 3,
      rateLimit: { maxRequests: 50, windowMs: 60000 },
    });

    // OpenStreetMap/OSRM configuration
    this.gateway.registerService('osrm', {
      baseURL: 'https://router.project-osrm.org',
      timeout: 8000,
      retries: 2,
      rateLimit: { maxRequests: 100, windowMs: 60000 },
    });

    // Transit API configuration (example: local transit authority)
    this.gateway.registerService('transit-api', {
      baseURL: process.env.TRANSIT_API_URL || 'https://api.transit.local',
      timeout: 5000,
      retries: 2,
      rateLimit: { maxRequests: 200, windowMs: 60000 },
    });

    // Real-time disruption service
    this.gateway.registerService('disruption-api', {
      baseURL: process.env.DISRUPTION_API_URL || 'https://api.disruptions.local',
      timeout: 3000,
      retries: 1,
      rateLimit: { maxRequests: 300, windowMs: 60000 },
    });
  }

  /**
   * Calculate routes using external routing services with fallback
   */
  async calculateRoutes(
    origin: Location,
    destination: Location,
    transportationModes: TransportationMode[]
  ): Promise<RouteAlternative[]> {
    const routes: RouteAlternative[] = [];

    try {
      // Try Google Maps first for comprehensive routing
      const googleRoutes = await this.getGoogleMapsRoutes(origin, destination, transportationModes);
      routes.push(...googleRoutes);
    } catch (error) {
      console.warn('Google Maps API failed, falling back to OSRM:', error);
      
      try {
        // Fallback to OSRM for basic routing
        const osrmRoutes = await this.getOSRMRoutes(origin, destination, transportationModes);
        routes.push(...osrmRoutes);
      } catch (fallbackError) {
        console.error('All routing services failed:', fallbackError);
        throw new Error('Route calculation services are currently unavailable. Please try again later.');
      }
    }

    // Enhance routes with real-time data if available
    try {
      await this.enhanceRoutesWithRealtimeData(routes);
    } catch (error) {
      console.warn('Real-time data enhancement failed:', error);
      // Continue without real-time data
    }

    return routes;
  }

  /**
   * Get current transportation disruptions
   */
  async getTransportationDisruptions(): Promise<DisruptionApiResponse> {
    try {
      return await this.gateway.request<DisruptionApiResponse>(
        'disruption-api',
        {
          url: '/disruptions',
          method: 'GET',
          params: {
            active: true,
            format: 'json',
          },
        },
        { ttl: this.CACHE_TTL.DISRUPTIONS }
      );
    } catch (error) {
      console.warn('Failed to fetch disruptions:', error);
      // Return empty disruptions to allow graceful degradation
      return { disruptions: [] };
    }
  }

  /**
   * Validate and geocode locations
   */
  async validateLocation(location: Location): Promise<{ valid: boolean; suggestions?: Location[] }> {
    try {
      const response = await this.gateway.request<any>(
        'google-maps',
        {
          url: '/geocode/json',
          method: 'GET',
          params: {
            address: `${location.latitude},${location.longitude}`,
            key: process.env.GOOGLE_MAPS_API_KEY,
          },
        },
        { ttl: this.CACHE_TTL.GEOCODING }
      );

      if (response.status === 'OK' && response.results.length > 0) {
        return { valid: true };
      } else if (response.status === 'ZERO_RESULTS') {
        // Try to find nearby locations
        const suggestions = await this.findNearbyLocations(location);
        return { valid: false, suggestions };
      } else {
        return { valid: false };
      }
    } catch (error) {
      console.error('Location validation failed:', error);
      return { valid: false };
    }
  }

  /**
   * Get service health status for monitoring
   */
  getServicesHealth(): any {
    return this.gateway.getServiceHealth();
  }

  /**
   * Clear service caches
   */
  clearCaches(): void {
    this.gateway.clearCache();
  }

  private async getGoogleMapsRoutes(
    origin: Location,
    destination: Location,
    transportationModes: TransportationMode[]
  ): Promise<RouteAlternative[]> {
    const routes: RouteAlternative[] = [];

    for (const mode of transportationModes) {
      try {
        const response = await this.gateway.request<RouteApiResponse>(
          'google-maps',
          {
            url: '/directions/json',
            method: 'GET',
            params: {
              origin: `${origin.latitude},${origin.longitude}`,
              destination: `${destination.latitude},${destination.longitude}`,
              mode: this.mapTransportationModeToGoogleMaps(mode),
              alternatives: true,
              key: process.env.GOOGLE_MAPS_API_KEY,
            },
          },
          { ttl: this.CACHE_TTL.ROUTES }
        );

        if (response.status === 'OK') {
          const convertedRoutes = this.convertGoogleMapsResponse(response, origin, destination, mode);
          routes.push(...convertedRoutes);
        }
      } catch (error) {
        console.warn(`Failed to get Google Maps routes for mode ${mode.type}:`, error);
      }
    }

    return routes;
  }

  private async getOSRMRoutes(
    origin: Location,
    destination: Location,
    transportationModes: TransportationMode[]
  ): Promise<RouteAlternative[]> {
    const routes: RouteAlternative[] = [];

    // OSRM primarily supports driving, walking, and cycling
    const supportedModes = transportationModes.filter(mode => 
      ['walking', 'cycling', 'conventional_vehicle'].includes(mode.type)
    );

    for (const mode of supportedModes) {
      try {
        const profile = this.mapTransportationModeToOSRM(mode);
        const response = await this.gateway.request<any>(
          'osrm',
          {
            url: `/route/v1/${profile}/${origin.longitude},${origin.latitude};${destination.longitude},${destination.latitude}`,
            method: 'GET',
            params: {
              alternatives: true,
              steps: true,
              geometries: 'geojson',
            },
          },
          { ttl: this.CACHE_TTL.ROUTES }
        );

        if (response.code === 'Ok') {
          const convertedRoutes = this.convertOSRMResponse(response, origin, destination, mode);
          routes.push(...convertedRoutes);
        }
      } catch (error) {
        console.warn(`Failed to get OSRM routes for mode ${mode.type}:`, error);
      }
    }

    return routes;
  }

  private async enhanceRoutesWithRealtimeData(routes: RouteAlternative[]): Promise<void> {
    const disruptions = await this.getTransportationDisruptions();
    
    for (const route of routes) {
      // Check if route is affected by any disruptions
      const affectedDisruptions = disruptions.disruptions.filter(disruption =>
        disruption.affected_routes.some(affectedRoute => 
          route.id.includes(affectedRoute) || route.segments.some(segment => 
            segment.instructions?.includes(affectedRoute)
          )
        )
      );

      if (affectedDisruptions.length > 0) {
        // Adjust time estimates based on disruptions
        const delayMinutes = affectedDisruptions.reduce((total, disruption) => {
          switch (disruption.severity) {
            case 'high': return total + 30;
            case 'medium': return total + 15;
            case 'low': return total + 5;
            default: return total;
          }
        }, 0);

        route.estimatedTime += delayMinutes * 60; // Convert to seconds
        route.metadata = {
          ...route.metadata,
          disruptions: affectedDisruptions,
          realTimeUpdated: true,
        };
      }
    }
  }

  private async findNearbyLocations(location: Location): Promise<Location[]> {
    try {
      const response = await this.gateway.request<any>(
        'google-maps',
        {
          url: '/place/nearbysearch/json',
          method: 'GET',
          params: {
            location: `${location.latitude},${location.longitude}`,
            radius: 5000, // 5km radius
            type: 'transit_station',
            key: process.env.GOOGLE_MAPS_API_KEY,
          },
        },
        { ttl: this.CACHE_TTL.GEOCODING }
      );

      return response.results.slice(0, 5).map((place: any) => ({
        latitude: place.geometry.location.lat,
        longitude: place.geometry.location.lng,
        address: place.name,
        name: place.name,
      }));
    } catch (error) {
      console.warn('Failed to find nearby locations:', error);
      return [];
    }
  }

  private mapTransportationModeToGoogleMaps(mode: TransportationMode): string {
    switch (mode.type) {
      case 'walking': return 'walking';
      case 'cycling': return 'bicycling';
      case 'public_transit': return 'transit';
      case 'conventional_vehicle':
      case 'electric_vehicle':
      case 'rideshare': return 'driving';
      default: return 'driving';
    }
  }

  private mapTransportationModeToOSRM(mode: TransportationMode): string {
    switch (mode.type) {
      case 'walking': return 'foot';
      case 'cycling': return 'bike';
      case 'conventional_vehicle':
      case 'electric_vehicle':
      case 'rideshare': return 'car';
      default: return 'car';
    }
  }

  private convertGoogleMapsResponse(
    response: RouteApiResponse,
    origin: Location,
    destination: Location,
    mode: TransportationMode
  ): RouteAlternative[] {
    return response.routes.map((route, index) => ({
      id: `google-${mode.type}-${index}`,
      origin,
      destination,
      transportationModes: [mode],
      segments: route.legs.map((leg, segIndex) => ({
        id: `segment-${index}-${segIndex}`,
        startLocation: origin,
        endLocation: destination,
        distance: leg.distance.value,
        estimatedTime: leg.duration.value,
        instructions: `${mode.type} route`,
        transportationMode: mode,
      })),
      totalDistance: route.legs.reduce((sum, leg) => sum + leg.distance.value, 0),
      estimatedTime: route.legs.reduce((sum, leg) => sum + leg.duration.value, 0),
      carbonFootprint: {
        totalEmissions: 0, // Will be calculated by CarbonCalculatorService
        emissionsBySegment: [],
        methodology: 'EPA 2023',
        dataSources: ['EPA eGRID'],
        calculationTimestamp: new Date(),
      },
      ecoScore: 0, // Will be calculated by EcoRankingService
      accessibilityCompliant: mode.accessibilityFeatures?.length > 0,
      metadata: {
        provider: 'google-maps',
        originalResponse: route,
      },
    }));
  }

  private convertOSRMResponse(
    response: any,
    origin: Location,
    destination: Location,
    mode: TransportationMode
  ): RouteAlternative[] {
    return response.routes.map((route: any, index: number) => ({
      id: `osrm-${mode.type}-${index}`,
      origin,
      destination,
      transportationModes: [mode],
      segments: [{
        id: `segment-${index}-0`,
        startLocation: origin,
        endLocation: destination,
        distance: route.distance,
        estimatedTime: route.duration,
        instructions: `${mode.type} route via OSRM`,
        transportationMode: mode,
      }],
      totalDistance: route.distance,
      estimatedTime: route.duration,
      carbonFootprint: {
        totalEmissions: 0, // Will be calculated by CarbonCalculatorService
        emissionsBySegment: [],
        methodology: 'EPA 2023',
        dataSources: ['EPA eGRID'],
        calculationTimestamp: new Date(),
      },
      ecoScore: 0, // Will be calculated by EcoRankingService
      accessibilityCompliant: mode.accessibilityFeatures?.length > 0,
      metadata: {
        provider: 'osrm',
        originalResponse: route,
      },
    }));
  }
}