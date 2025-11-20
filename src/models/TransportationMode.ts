import { TransportationType, AccessibilityFeature } from './common';

export interface AvailabilityInfo {
  available: boolean;
  nextAvailable?: Date;
  restrictions?: string[];
}

export interface TransportationMode {
  type: TransportationType;
  subtype?: string; // e.g., 'bus', 'train', 'subway'
  emissionFactor: number; // kg CO2 per mile
  accessibilityFeatures: AccessibilityFeature[];
  availability: AvailabilityInfo;
}