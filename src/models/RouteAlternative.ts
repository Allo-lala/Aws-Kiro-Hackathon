import { Location } from './Location';
import { TransportationMode } from './TransportationMode';
import { CarbonFootprint } from './CarbonFootprint';

export interface RouteSegment {
  id: string;
  startLocation: Location;
  endLocation: Location;
  transportationMode: TransportationMode;
  distance: number;
  estimatedTime: number;
  instructions?: string;
}

export interface RouteAlternative {
  id: string;
  origin: Location;
  destination: Location;
  transportationModes: TransportationMode[];
  segments: RouteSegment[];
  totalDistance: number;
  estimatedTime: number;
  carbonFootprint: CarbonFootprint;
  ecoScore: number;
  accessibilityCompliant: boolean;
  cost?: number;
}