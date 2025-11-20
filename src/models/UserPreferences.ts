import { TransportationMode } from './TransportationMode';
import { AccessibilityRequirement, SustainabilityPriority } from './common';

export interface UserPreferences {
  userId: string;
  maxWalkingDistance: number;
  preferredTransportationModes: TransportationMode[];
  accessibilityNeeds: AccessibilityRequirement[];
  sustainabilityPriority: SustainabilityPriority;
  timeVsEnvironmentWeight: number; // 0-1 scale
}

export interface TripRecord {
  id: string;
  userId: string;
  routeId: string;
  actualTransportationMode: TransportationMode;
  actualCarbonFootprint: number;
  savedEmissions: number;
  tripDate: Date;
  origin: Location;
  destination: Location;
}

export interface SustainabilityMetrics {
  totalSavedEmissions: number;
  totalTrips: number;
  averageSavingsPerTrip: number;
  timeframe: {
    start: Date;
    end: Date;
  };
  milestones: Milestone[];
}

export interface Milestone {
  id: string;
  type: 'emissions_saved' | 'trips_completed' | 'streak';
  threshold: number;
  achieved: boolean;
  achievedDate?: Date;
  description: string;
}

import { Location } from './Location';