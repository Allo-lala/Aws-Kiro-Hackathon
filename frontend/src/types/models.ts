// Type definitions for frontend application
// These mirror the backend models but are frontend-specific

export interface Location {
  latitude: number;
  longitude: number;
  name?: string;
  address?: string;
}

export interface TransportationMode {
  type: string;
  subtype?: string;
  provider?: string;
  emissionFactor?: number;
  accessibilityFeatures?: any[];
  availability?: any;
  [key: string]: any; // Allow additional properties
}

export interface CarbonFootprint {
  totalEmissions: number;
  emissionsPerMile?: number;
  comparisonToBaseline?: number;
  breakdown?: {
    transportation: number;
    infrastructure: number;
    other: number;
  };
  emissionsBySegment?: any[];
  methodology?: string;
  dataSources?: any[];
  [key: string]: any; // Allow additional properties
}

export interface RouteAlternative {
  id: string;
  origin: Location;
  destination: Location;
  transportationModes: TransportationMode[];
  distance?: number;
  duration?: number;
  carbonFootprint: CarbonFootprint;
  cost?: number;
  accessibilityCompliant?: boolean;
  ecoScore?: number;
  steps?: any[];
  totalDistance?: number;
  totalDuration?: number;
  [key: string]: any; // Allow additional properties
}

export interface UserPreferences {
  maxWalkingDistance: number;
  preferredTransportationModes: TransportationMode[];
  accessibilityNeeds: string[];
  sustainabilityPriority: 'low' | 'medium' | 'high';
  timeVsEnvironmentWeight: number;
  userId?: string;
  [key: string]: any; // Allow additional properties
}

export interface SustainabilityMetrics {
  totalTrips: number;
  totalSavedEmissions: number;
  totalDistance?: number;
  averageEcoScore?: number;
  milestones: Array<{
    id?: string;
    type: string;
    threshold: number;
    achieved: boolean;
    description: string;
    [key: string]: any;
  }>;
  [key: string]: any; // Allow additional properties
}
