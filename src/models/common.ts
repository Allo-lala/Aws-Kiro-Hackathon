// Common types and enums used across the application

export type TransportationType = 
  | 'walking' 
  | 'cycling' 
  | 'public_transit' 
  | 'electric_vehicle' 
  | 'conventional_vehicle' 
  | 'rideshare';

export type SustainabilityPriority = 'high' | 'medium' | 'low';

export type AvailabilityStatus = 'available' | 'limited' | 'unavailable';

export interface AccessibilityFeature {
  type: string;
  description: string;
  supported: boolean;
}

export interface AccessibilityRequirement {
  type: string;
  required: boolean;
  description?: string;
}

export interface SegmentEmission {
  segmentId: string;
  distance: number;
  transportationMode: TransportationType;
  emissions: number; // kg CO2 equivalent
}

export interface EmissionFactor {
  transportationMode: TransportationType;
  region: string;
  factor: number; // kg CO2 per mile
  source: string;
  lastUpdated: Date;
}

export interface LocationValidation {
  isValid: boolean;
  normalizedLocation?: import('./Location').Location;
  suggestions?: import('./Location').Location[];
  errorMessage?: string;
}

// Location interface is defined in Location.ts to avoid circular dependencies