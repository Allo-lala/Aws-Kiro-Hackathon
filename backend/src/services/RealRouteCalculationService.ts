import { Location } from '../models/Location';
import { TransportationType } from '../models/common';
import { 
  ExternalRouteAPIClient, 
  ExternalRouteConfig, 
  ExternalRouteRequest, 
  ExternalRouteResponse 
} from './ExternalRouteAPIClient';
import { RouteCacheService, RouteCacheKey } from './RouteCacheService';

export interface RealRouteCalculationConfig {
  provider: 'google_maps' | 'geoapify';
  apiKey: string;
  enableCache?: boolean;
  cacheTTLMinutes?: number;
  timeout?: number;
  maxRetries?: number;
}

export class RealRouteCalculationService {
  private apiClient: ExternalRouteAPIClient;
  private cacheService: RouteCacheService;
  private cacheEnabled: boolean;

  constructor(config: RealRouteCalculationConfig) {
    const apiConfig: ExternalRouteConfig = {
      provider: config.provider,
      apiKey: config.apiKey,
      timeout: config.timeout,
      maxRetries: config.maxRetries
    };

    this.apiClient = new ExternalRouteAPIClient(apiConfig);
    this.cacheService = new RouteCacheService(config.cacheTTLMinutes || 60);
    this.cacheEnabled = config.enableCache !== false; // Default to true
  }

  /**
   * Calculate a route using external API with caching
   */
  async calculateRoute(
    origin: Location,
    destination: Location,
    mode: TransportationType
  ): Promise<ExternalRouteResponse> {
    const cacheKey: RouteCacheKey = { origin, destination, mode };

    // Try to get from cache first
    if (this.cacheEnabled) {
      const cached = this.cacheService.get(cacheKey);
      if (cached) {
        console.log(`Cache hit for route: ${mode} from (${origin.latitude},${origin.longitude}) to (${destination.latitude},${destination.longitude})`);
        return cached;
      }
    }

    // Cache miss or cache disabled - call external API
    console.log(`Cache miss for route: ${mode} from (${origin.latitude},${origin.longitude}) to (${destination.latitude},${destination.longitude})`);
    
    const request: ExternalRouteRequest = { origin, destination, mode };
    const response = await this.apiClient.calculateRoute(request);

    // Store in cache
    if (this.cacheEnabled) {
      this.cacheService.set(cacheKey, response);
    }

    return response;
  }

  /**
   * Calculate routes for multiple transportation modes
   */
  async calculateMultiModeRoutes(
    origin: Location,
    destination: Location,
    modes: TransportationType[]
  ): Promise<Map<TransportationType, ExternalRouteResponse>> {
    const results = new Map<TransportationType, ExternalRouteResponse>();
    
    // Calculate routes in parallel for better performance
    const promises = modes.map(async (mode) => {
      try {
        const response = await this.calculateRoute(origin, destination, mode);
        return { mode, response };
      } catch (error) {
        console.error(`Failed to calculate route for mode ${mode}:`, error instanceof Error ? error.message : error);
        if (error instanceof Error) {
          console.error('Error stack:', error.stack);
        }
        return { mode, response: null };
      }
    });

    const settled = await Promise.all(promises);
    
    settled.forEach(({ mode, response }) => {
      if (response) {
        results.set(mode, response);
      }
    });

    return results;
  }

  /**
   * Get a cached route without calling the API
   */
  getCachedRoute(
    origin: Location,
    destination: Location,
    mode: TransportationType
  ): ExternalRouteResponse | null {
    if (!this.cacheEnabled) {
      return null;
    }

    const cacheKey: RouteCacheKey = { origin, destination, mode };
    return this.cacheService.get(cacheKey);
  }

  /**
   * Clear the route cache
   */
  clearCache(): void {
    this.cacheService.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; entries: number } {
    return this.cacheService.getStats();
  }

  /**
   * Enable or disable caching
   */
  setCacheEnabled(enabled: boolean): void {
    this.cacheEnabled = enabled;
  }
}
