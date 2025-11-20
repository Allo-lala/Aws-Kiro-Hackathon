// Property-based testing generators for eco-friendly route planner
import * as fc from 'fast-check';
import { TransportationType, SustainabilityPriority, AvailabilityStatus } from '../models/common';

// Location generators
export const locationArbitrary = fc.record({
  latitude: fc.double({ min: -90, max: 90 }),
  longitude: fc.double({ min: -180, max: 180 }),
  address: fc.option(fc.string({ minLength: 5, maxLength: 100 }), { nil: undefined }),
  city: fc.option(fc.string({ minLength: 2, maxLength: 50 }), { nil: undefined }),
  country: fc.option(fc.string({ minLength: 2, maxLength: 50 }), { nil: undefined })
});

// Transportation type generators
export const transportationTypeArbitrary = fc.constantFrom(
  'walking',
  'cycling', 
  'public_transit',
  'electric_vehicle',
  'conventional_vehicle',
  'rideshare'
) as fc.Arbitrary<TransportationType>;

// Sustainability priority generators
export const sustainabilityPriorityArbitrary = fc.constantFrom(
  'high',
  'medium', 
  'low'
) as fc.Arbitrary<SustainabilityPriority>;

// Availability status generators
export const availabilityStatusArbitrary = fc.constantFrom(
  'available',
  'limited',
  'unavailable'
) as fc.Arbitrary<AvailabilityStatus>;

// User preferences generators
export const userPreferencesArbitrary = fc.record({
  userId: fc.uuid(),
  maxWalkingDistance: fc.double({ min: 0.1, max: 10 }),
  preferredTransportationModes: fc.array(fc.record({
    type: transportationTypeArbitrary,
    subtype: fc.option(fc.string(), { nil: undefined }),
    emissionFactor: fc.double({ min: 0, max: 1 }),
    accessibilityFeatures: fc.array(fc.record({
      type: fc.string(),
      description: fc.string(),
      supported: fc.boolean()
    })),
    availability: availabilityStatusArbitrary
  }), { minLength: 1, maxLength: 5 }),
  accessibilityNeeds: fc.array(fc.record({
    type: fc.string(),
    required: fc.boolean(),
    description: fc.option(fc.string(), { nil: undefined })
  })),
  sustainabilityPriority: sustainabilityPriorityArbitrary,
  timeVsEnvironmentWeight: fc.double({ min: 0, max: 1 })
});

// Valid location pair generator (ensures origin != destination)
export const locationPairArbitrary = fc.tuple(locationArbitrary, locationArbitrary)
  .filter(([origin, destination]) => 
    Math.abs(origin.latitude - destination.latitude) > 0.001 ||
    Math.abs(origin.longitude - destination.longitude) > 0.001
  );

// Distance generator (in miles)
export const distanceArbitrary = fc.double({ min: 0.1, max: 1000 });

// Emission factor generator (kg CO2 per mile)
export const emissionFactorArbitrary = fc.double({ min: 0, max: 2 });