import { TransportationType, AccessibilityFeature, AvailabilityStatus } from './common';

export interface TransportationMode {
  type: TransportationType;
  subtype?: string; // e.g., 'bus', 'train', 'subway'
  emissionFactor: number; // kg CO2 per mile
  accessibilityFeatures: AccessibilityFeature[];
  availability: AvailabilityStatus;
}