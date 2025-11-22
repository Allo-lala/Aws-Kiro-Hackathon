import { IRoutePlanner } from './interfaces/IRoutePlanner';
import { Location } from '../models/Location';
import { RouteAlternative, RouteSegment } from '../models/RouteAlternative';
import { TransportationMode } from '../models/TransportationMode';
import { UserPreferences } from '../models/UserPreferences';
import { LocationValidation, TransportationType } from '../models/common';
import { validateLocation } from '../utils/validation';
import { CarbonFootprint } from '../models/CarbonFootprint';
import { EcoRankingService, RankingCriteria } from './EcoRankingService';
import { AccessibilityFilterService, AccessibilityFilterOptions } from './AccessibilityFilterService';
import { ExternalServiceManager } from '../gateway/ExternalServiceManager';
import { ApiGateway } from '../gateway/ApiGateway';

interface ExternalRouteAPI {
  calculateRoute(origin: Location, destination: Location, mode: TransportationType): Promise<ExternalRouteResult>;
  getAvailableModes(location: Location): Promise<TransportationType[]>;
}

interface ExternalRouteResult {
  distance: number;
  duration: number;
  segments: {
    startLat: number;
    startLng: number;
    endLat: number;
    endLng: number;
    distance: number;
    duration: number;
    instructions?: string;
  }[];
}

class MockExternalAPI implements ExternalRouteAPI {
  async calculateRoute(origin: Location, destination: Location, mode: TransportationType): Promise<ExternalRouteResult> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 10));
    
    // Calculate approximate distance using Haversine formula
    const distance = this.calculateDistance(origin, destination);
    
    // Estimate duration based on transportation mode
    const speed = this.getAverageSpeed(mode);
    const duration = (distance / speed) * 60; // minutes
    
    return {
      distance,
      duration,
      segments: [{
        startLat: origin.latitude,
        startLng: origin.longitude,
        endLat: destination.latitude,
        endLng: destination.longitude,
        distance,
        duration,
        instructions: `Travel via ${mode} from ${origin.address || 'origin'} to ${destination.address || 'destination'}`
      }]
    };
  }

  async getAvailableModes(location: Location): Promise<TransportationType[]> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 5));
    
    // Mock availability based on location type (simplified logic)
    const modes: TransportationType[] = ['walking', 'cycling'];
    
    // Add public transit for urban areas (simplified check)
    if (location.city && location.city.toLowerCase().includes('city')) {
      modes.push('public_transit');
    }
    
    // Always add vehicle options
    modes.push('electric_vehicle', 'conventional_vehicle', 'rideshare');
    
    return modes;
  }

  private calculateDistance(origin: Location, destination: Location): number {
    const R = 3959; // Earth's radius in miles
    const dLat = this.toRadians(destination.latitude - origin.latitude);
    const dLon = this.toRadians(destination.longitude - origin.longitude);
    
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(this.toRadians(origin.latitude)) * Math.cos(this.toRadians(destination.latitude)) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  private getAverageSpeed(mode: TransportationType): number {
    // Average speeds in mph
    switch (mode) {
      case 'walking': return 3;
      case 'cycling': return 12;
      case 'public_transit': return 15;
      case 'electric_vehicle': return 25;
      case 'conventional_vehicle': return 25;
      case 'rideshare': return 20;
      default: return 15;
    }
  }
}

export class RoutePlannerService implements IRoutePlanner {
  private externalAPI: ExternalRouteAPI;
  private ecoRankingService: EcoRankingService;
  private accessibilityService: AccessibilityFilterService;
  private externalServiceManager?: ExternalServiceManager;

  constructor(externalAPI?: ExternalRouteAPI, gateway?: ApiGateway) {
    this.externalAPI = externalAPI || new MockExternalAPI();
    this.ecoRankingService = new EcoRankingService();
    this.accessibilityService = new AccessibilityFilterService();
    
    // Initialize external service manager if gateway is provided
    if (gateway) {
      this.externalServiceManager = new ExternalServiceManager(gateway);
    }
  }

  async calculateRoutes(
    origin: Location, 
    destination: Location, 
    preferences?: UserPreferences
  ): Promise<RouteAlternative[]> {
    try {
      // Validate input locations using external service manager if available
      let routes: RouteAlternative[] = [];
      
      if (this.externalServiceManager) {
        // Use external service manager for enhanced route calculation
        const originValidation = await this.externalServiceManager.validateLocation(origin);
        const destinationValidation = await this.externalServiceManager.validateLocation(destination);
        
        if (!originValidation.valid) {
          if (originValidation.suggestions && originValidation.suggestions.length > 0) {
            throw new Error(`Route data is unavailable for the specified origin. Nearby supported locations: ${originValidation.suggestions.map(s => s.address || `${s.latitude}, ${s.longitude}`).join(', ')}`);
          } else {
            throw new Error('Route data is unavailable for the specified origin location');
          }
        }
        
        if (!destinationValidation.valid) {
          if (destinationValidation.suggestions && destinationValidation.suggestions.length > 0) {
            throw new Error(`Route data is unavailable for the specified destination. Nearby supported locations: ${destinationValidation.suggestions.map(s => s.address || `${s.latitude}, ${s.longitude}`).join(', ')}`);
          } else {
            throw new Error('Route data is unavailable for the specified destination location');
          }
        }

        // Get available transportation modes
        const availableModes = await this.getTransportationModes(origin);
        
        // Filter modes based on user preferences
        const filteredModes = this.filterModesByPreferences(availableModes, preferences);

        try {
          // Use external service manager for route calculation with fallback handling
          routes = await this.externalServiceManager.calculateRoutes(origin, destination, filteredModes);
        } catch (error) {
          console.warn('External service manager failed, falling back to mock API:', error);
          // Fall back to mock API if external services fail
          routes = await this.calculateRoutesWithMockAPI(origin, destination, filteredModes);
        }
      } else {
        // Fallback to original implementation
        const originValidation = await this.validateLocation(origin);
        if (!originValidation.isValid) {
          throw new Error(`Invalid origin: ${originValidation.errorMessage}`);
        }

        const destinationValidation = await this.validateLocation(destination);
        if (!destinationValidation.isValid) {
          throw new Error(`Invalid destination: ${destinationValidation.errorMessage}`);
        }

        // Use normalized locations
        const normalizedOrigin = originValidation.normalizedLocation || origin;
        const normalizedDestination = destinationValidation.normalizedLocation || destination;

        // Get available transportation modes
        const availableModes = await this.getTransportationModes(normalizedOrigin);
        
        // Filter modes based on user preferences
        const filteredModes = this.filterModesByPreferences(availableModes, preferences);

        routes = await this.calculateRoutesWithMockAPI(normalizedOrigin, normalizedDestination, filteredModes);
      }

      if (routes.length === 0) {
        throw new Error('No routes could be calculated between the specified locations');
      }

      // Check if any eco-friendly options are available (requirement 1.4)
      const ecoFriendlyRoutes = routes.filter(route => 
        route.transportationModes.some(mode => 
          mode.type === 'walking' || 
          mode.type === 'cycling' || 
          mode.type === 'public_transit' || 
          mode.type === 'electric_vehicle'
        )
      );

      // If no eco-friendly options are available, provide the least harmful conventional alternative
      if (ecoFriendlyRoutes.length === 0) {
        console.warn('No eco-friendly transportation options are available for this route');
        // Find the route with the lowest carbon footprint among conventional options
        const leastHarmfulRoute = routes.reduce((best, current) => 
          current.carbonFootprint.totalEmissions < best.carbonFootprint.totalEmissions ? current : best
        );
        
        // Add environmental impact disclosure
        leastHarmfulRoute.metadata = {
          ...leastHarmfulRoute.metadata,
          environmentalDisclosure: 'No eco-friendly options are available for this route. This is the least harmful conventional alternative.',
          isLeastHarmfulFallback: true
        };
      }

      // Apply accessibility-aware filtering if preferences are provided
      let finalRoutes = routes;
      if (preferences) {
        const accessibilityOptions: AccessibilityFilterOptions = {
          strictMode: false,
          fallbackToPartial: true,
          prioritizeCompliance: true
        };

        const filterResult = this.accessibilityService.filterAccessibleRoutes(
          routes,
          preferences,
          accessibilityOptions
        );

        finalRoutes = filterResult.routes;

        // Log accessibility filtering results for transparency
        if (filterResult.fallbackUsed) {
          console.info(`Accessibility filtering: ${filterResult.recommendationReason}`);
        }
      }

      // Use EcoRankingService for comprehensive ranking
      const rankingCriteria: RankingCriteria = {
        prioritizePublicTransit: true,
        highlightZeroEmission: true,
        weightEnvironmentOverTime: preferences?.sustainabilityPriority === 'high' ? 0.9 : 
                                   preferences?.sustainabilityPriority === 'low' ? 0.3 : 0.7
      };

      return this.ecoRankingService.rankRoutesByEcoFriendliness(finalRoutes, rankingCriteria);

    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Route calculation failed: ${error.message}`);
      }
      throw new Error('Route calculation failed due to an unknown error');
    }
  }

  async getTransportationModes(location: Location): Promise<TransportationMode[]> {
    try {
      const validation = await this.validateLocation(location);
      if (!validation.isValid) {
        throw new Error(`Invalid location: ${validation.errorMessage}`);
      }

      const normalizedLocation = validation.normalizedLocation || location;
      const availableTypes = await this.externalAPI.getAvailableModes(normalizedLocation);

      return availableTypes.map(type => this.createTransportationMode(type));
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to get transportation modes: ${error.message}`);
      }
      throw new Error('Failed to get transportation modes due to an unknown error');
    }
  }

  async validateLocation(location: Location): Promise<LocationValidation> {
    return validateLocation(location);
  }

  private filterModesByPreferences(
    modes: TransportationMode[], 
    preferences?: UserPreferences
  ): TransportationMode[] {
    if (!preferences) {
      return modes;
    }

    let filteredModes = modes;

    // Filter by accessibility requirements first (these are hard constraints)
    if (preferences.accessibilityNeeds.length > 0) {
      const accessibleModes = modes.filter(mode => {
        return preferences.accessibilityNeeds.every(need => {
          // Skip invalid or non-required accessibility needs
          if (!need.required || !need.type || need.type.trim() === '') return true;
          return mode.accessibilityFeatures.some(feature => 
            feature.type === need.type && feature.supported
          );
        });
      });
      
      // Use accessible modes if available, otherwise fall back to all modes
      // This satisfies requirement 4.3: provide sustainable alternatives when no fully accessible options exist
      filteredModes = accessibleModes.length > 0 ? accessibleModes : modes;
    }

    // Filter by preferred transportation modes if specified, but fall back if none available
    if (preferences.preferredTransportationModes.length > 0) {
      const preferredTypes = preferences.preferredTransportationModes.map(m => m.type);
      const preferredModes = filteredModes.filter(mode => preferredTypes.includes(mode.type));
      
      // Use preferred modes if available, otherwise fall back to all accessible modes
      // This satisfies requirement 1.4: provide alternatives when preferred options aren't available
      if (preferredModes.length > 0) {
        filteredModes = preferredModes;
      }
    }

    return filteredModes;
  }

  private createTransportationMode(type: TransportationType): TransportationMode {
    const emissionFactors: Record<TransportationType, number> = {
      'walking': 0,
      'cycling': 0,
      'public_transit': 0.2,
      'electric_vehicle': 0.1,
      'conventional_vehicle': 0.4,
      'rideshare': 0.3
    };

    return {
      type,
      emissionFactor: emissionFactors[type],
      accessibilityFeatures: this.getAccessibilityFeatures(type),
      availability: { available: true }
    };
  }

  private getAccessibilityFeatures(type: TransportationType) {
    switch (type) {
      case 'walking':
        return [
          { type: 'wheelchair_accessible', description: 'Sidewalk accessibility with curb cuts', supported: true },
          { type: 'visual_impairment', description: 'Audio pedestrian signals and tactile surfaces', supported: true },
          { type: 'mobility_assistance', description: 'Rest areas and benches available', supported: true }
        ];
      case 'cycling':
        return [
          { type: 'wheelchair_accessible', description: 'Not suitable for wheelchairs', supported: false },
          { type: 'visual_impairment', description: 'Requires visual navigation', supported: false },
          { type: 'mobility_assistance', description: 'Requires physical pedaling ability', supported: false }
        ];
      case 'public_transit':
        return [
          { type: 'wheelchair_accessible', description: 'ADA compliant vehicles with ramps/lifts', supported: true },
          { type: 'visual_impairment', description: 'Audio announcements and braille signage', supported: true },
          { type: 'hearing_impairment', description: 'Visual displays and LED signs', supported: true },
          { type: 'mobility_assistance', description: 'Priority seating and assistance available', supported: true },
          { type: 'cognitive_assistance', description: 'Clear route maps and announcements', supported: true }
        ];
      case 'electric_vehicle':
      case 'conventional_vehicle':
        return [
          { type: 'wheelchair_accessible', description: 'Wheelchair accessible vehicles can be requested', supported: true },
          { type: 'visual_impairment', description: 'GPS navigation with audio guidance', supported: true },
          { type: 'hearing_impairment', description: 'Visual navigation displays', supported: true },
          { type: 'mobility_assistance', description: 'Door-to-door service', supported: true }
        ];
      case 'rideshare':
        return [
          { type: 'wheelchair_accessible', description: 'WAV (Wheelchair Accessible Vehicle) options available', supported: true },
          { type: 'visual_impairment', description: 'App accessibility and driver assistance', supported: true },
          { type: 'hearing_impairment', description: 'Text-based communication with driver', supported: true },
          { type: 'mobility_assistance', description: 'Driver assistance and door-to-door service', supported: true }
        ];
      default:
        return [];
    }
  }

  private createRouteAlternative(
    origin: Location,
    destination: Location,
    mode: TransportationMode,
    externalResult: ExternalRouteResult
  ): RouteAlternative {
    const segments: RouteSegment[] = externalResult.segments.map((seg, index) => ({
      id: `segment-${index}`,
      startLocation: {
        latitude: seg.startLat,
        longitude: seg.startLng
      },
      endLocation: {
        latitude: seg.endLat,
        longitude: seg.endLng
      },
      transportationMode: mode,
      distance: seg.distance,
      estimatedTime: seg.duration,
      instructions: seg.instructions
    }));

    const carbonFootprint: CarbonFootprint = {
      totalEmissions: externalResult.distance * mode.emissionFactor,
      emissionsBySegment: segments.map(seg => ({
        segmentId: seg.id,
        distance: seg.distance,
        transportationMode: mode.type,
        emissions: seg.distance * mode.emissionFactor
      })),
      methodology: 'EPA emission factors per mile',
      dataSources: ['EPA eGRID', 'IPCC Guidelines'],
      calculationTimestamp: new Date()
    };

    // Create temporary route for eco-score calculation
    const tempRoute: RouteAlternative = {
      id: `temp-route-${mode.type}-${Date.now()}`,
      origin,
      destination,
      transportationModes: [mode],
      segments,
      totalDistance: externalResult.distance,
      estimatedTime: externalResult.duration,
      carbonFootprint,
      ecoScore: 0, // Will be calculated below
      accessibilityCompliant: mode.accessibilityFeatures.some(f => f.supported),
      cost: this.estimateCost(mode.type, externalResult.distance)
    };

    // Calculate eco-score using EcoRankingService
    const ecoScoreBreakdown = this.ecoRankingService.calculateEcoScore(tempRoute);
    const ecoScore = ecoScoreBreakdown.finalScore;

    return {
      id: `route-${mode.type}-${Date.now()}`,
      origin,
      destination,
      transportationModes: [mode],
      segments,
      totalDistance: externalResult.distance,
      estimatedTime: externalResult.duration,
      carbonFootprint,
      ecoScore,
      accessibilityCompliant: mode.accessibilityFeatures.some(f => f.supported),
      cost: this.estimateCost(mode.type, externalResult.distance)
    };
  }

  private async calculateRoutesWithMockAPI(
    origin: Location,
    destination: Location,
    filteredModes: TransportationMode[]
  ): Promise<RouteAlternative[]> {
    // Calculate routes for each transportation mode using mock API
    const routePromises = filteredModes.map(async (mode) => {
      try {
        const externalResult = await this.externalAPI.calculateRoute(
          origin, 
          destination, 
          mode.type
        );

        return this.createRouteAlternative(
          origin,
          destination,
          mode,
          externalResult
        );
      } catch (error) {
        console.warn(`Failed to calculate route for ${mode.type}:`, error);
        return null;
      }
    });

    return (await Promise.all(routePromises)).filter(route => route !== null) as RouteAlternative[];
  }

  private estimateCost(type: TransportationType, distance: number): number | undefined {
    // Simplified cost estimation
    switch (type) {
      case 'walking':
      case 'cycling':
        return 0;
      case 'public_transit':
        return 2.50; // Flat fare
      case 'electric_vehicle':
        return distance * 0.10; // $0.10 per mile
      case 'conventional_vehicle':
        return distance * 0.15; // $0.15 per mile
      case 'rideshare':
        return distance * 1.50 + 2.00; // Base fare + per mile
      default:
        return undefined;
    }
  }
}