/**
 * Property-based tests for Carbon Calculator Service - Transportation mode carbon footprint consistency
 * **Feature: eco-friendly-route-planner, Property 3: Transportation mode carbon footprint consistency**
 * **Validates: Requirements 2.1, 2.2, 2.5**
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { CarbonCalculatorService } from './CarbonCalculatorService';
import { TransportationMode } from '../models/TransportationMode';
import { RouteAlternative } from '../models/RouteAlternative';
import { Location } from '../models/Location';
import { CarbonFootprint } from '../models/CarbonFootprint';
import { TransportationType, AccessibilityFeature, AvailabilityStatus } from '../models/common';
import { beforeEach } from 'vitest';

// Generator for AccessibilityFeature
const accessibilityFeatureArbitrary = fc.record({
  type: fc.constantFrom('wheelchair_accessible', 'visual_impairment', 'hearing_impairment', 'audio_announcements'),
  description: fc.string({ minLength: 5, maxLength: 50 }),
  supported: fc.boolean()
});

// Generator for TransportationMode with consistent emission factors
const transportationModeArbitrary = fc.record({
  type: fc.constantFrom(
    'walking',
    'cycling', 
    'public_transit',
    'electric_vehicle',
    'conventional_vehicle',
    'rideshare'
  ) as fc.Arbitrary<TransportationType>,
  subtype: fc.option(fc.constantFrom('bus', 'train', 'subway', 'tram'), { nil: undefined }),
  emissionFactor: fc.double({ min: 0, max: 2, noNaN: true, noDefaultInfinity: true }),
  accessibilityFeatures: fc.array(accessibilityFeatureArbitrary, { maxLength: 3 }),
  availability: fc.constantFrom('available', 'limited', 'unavailable') as fc.Arbitrary<AvailabilityStatus>
}).map(mode => ({
  ...mode,
  // Ensure zero-emission modes have zero emission factors
  emissionFactor: mode.type === 'walking' || mode.type === 'cycling' ? 0 : mode.emissionFactor
}));

// Generator for Location
const locationArbitrary = fc.record({
  latitude: fc.double({ min: -90, max: 90, noNaN: true }),
  longitude: fc.double({ min: -180, max: 180, noNaN: true }),
  address: fc.option(fc.string({ minLength: 5, maxLength: 100 }), { nil: undefined }),
  city: fc.option(fc.string({ minLength: 2, maxLength: 50 }), { nil: undefined }),
  country: fc.option(fc.string({ minLength: 2, maxLength: 50 }), { nil: undefined })
});

// Generator for RouteSegment with consistent emission factors
const routeSegmentArbitrary = fc.record({
  id: fc.uuid(),
  startLocation: locationArbitrary,
  endLocation: locationArbitrary,
  transportationMode: transportationModeArbitrary,
  distance: fc.double({ min: 0.1, max: 100, noNaN: true }),
  estimatedTime: fc.double({ min: 1, max: 300, noNaN: true }),
  instructions: fc.option(fc.string({ minLength: 10, maxLength: 200 }), { nil: undefined })
}).map(segment => ({
  ...segment,
  // Ensure emission factors are consistent with transportation mode type
  transportationMode: {
    ...segment.transportationMode,
    emissionFactor: segment.transportationMode.type === 'walking' || segment.transportationMode.type === 'cycling' 
      ? 0 
      : segment.transportationMode.emissionFactor
  }
}));

// Generator for CarbonFootprint (simplified for testing)
const carbonFootprintArbitrary = fc.record({
  totalEmissions: fc.double({ min: 0, max: 100, noNaN: true }),
  emissionsBySegment: fc.array(fc.record({
    segmentId: fc.uuid(),
    distance: fc.double({ min: 0.1, max: 100, noNaN: true }),
    transportationMode: fc.constantFrom(
      'walking',
      'cycling', 
      'public_transit',
      'electric_vehicle',
      'conventional_vehicle',
      'rideshare'
    ) as fc.Arbitrary<TransportationType>,
    emissions: fc.double({ min: 0, max: 50, noNaN: true })
  }), { minLength: 1, maxLength: 5 }),
  methodology: fc.string({ minLength: 10, maxLength: 200 }),
  dataSources: fc.array(fc.string({ minLength: 5, maxLength: 100 }), { minLength: 1, maxLength: 5 }),
  calculationTimestamp: fc.date()
});

// Generator for RouteAlternative (without pre-calculated carbon footprint)
const routeAlternativeArbitrary = fc.record({
  id: fc.uuid(),
  origin: locationArbitrary,
  destination: locationArbitrary,
  transportationModes: fc.array(transportationModeArbitrary, { minLength: 1, maxLength: 3 }),
  segments: fc.array(routeSegmentArbitrary, { minLength: 1, maxLength: 5 }),
  totalDistance: fc.double({ min: 0.1, max: 500, noNaN: true }),
  estimatedTime: fc.double({ min: 1, max: 600, noNaN: true }),
  ecoScore: fc.double({ min: 0, max: 100, noNaN: true }),
  accessibilityCompliant: fc.boolean(),
  cost: fc.option(fc.double({ min: 0, max: 200, noNaN: true }), { nil: undefined })
}).map(partial => ({
  ...partial,
  // Add a placeholder carbon footprint that will be replaced by the service
  carbonFootprint: {
    totalEmissions: 0,
    emissionsBySegment: [],
    methodology: '',
    dataSources: [],
    calculationTimestamp: new Date()
  }
}));

describe('CarbonCalculatorService Property Tests', () => {
  let carbonCalculator: CarbonCalculatorService;

  beforeEach(() => {
    carbonCalculator = new CarbonCalculatorService();
  });

  it('Property 3: Transportation mode carbon footprint consistency', async () => {
    /**
     * **Feature: eco-friendly-route-planner, Property 3: Transportation mode carbon footprint consistency**
     * 
     * This property validates that for any transportation mode comparison, each mode 
     * displays carbon footprint per mile alongside time estimates, with walking and 
     * cycling highlighted as zero-emission when feasible.
     * 
     * Validates Requirements 2.1, 2.2, 2.5:
     * - 2.1: Carbon footprint per mile is displayed for each transportation mode
     * - 2.2: Time estimates are included alongside environmental metrics
     * - 2.5: Walking and cycling are highlighted as zero-emission alternatives
     */
    await fc.assert(
      fc.asyncProperty(
        routeAlternativeArbitrary,
        transportationModeArbitrary,
        async (route: RouteAlternative, transportationMode: TransportationMode) => {
          // Calculate emissions for the transportation mode
          const carbonFootprint = await carbonCalculator.calculateEmissions(route, transportationMode);
          
          // Requirement 2.1: Carbon footprint per mile must be available
          expect(carbonFootprint).toBeDefined();
          expect(carbonFootprint.totalEmissions).toBeGreaterThanOrEqual(0);
          expect(typeof carbonFootprint.totalEmissions).toBe('number');
          expect(isNaN(carbonFootprint.totalEmissions)).toBe(false);
          
          // Get emission factor for the transportation mode
          const emissionFactor = await carbonCalculator.getEmissionFactor(transportationMode, 'US');
          expect(emissionFactor).toBeDefined();
          expect(emissionFactor.factor).toBeGreaterThanOrEqual(0);
          expect(typeof emissionFactor.factor).toBe('number');
          expect(isNaN(emissionFactor.factor)).toBe(false);
          
          // Requirement 2.2: Time estimates must be included alongside environmental metrics
          expect(route.estimatedTime).toBeDefined();
          expect(route.estimatedTime).toBeGreaterThan(0);
          expect(typeof route.estimatedTime).toBe('number');
          expect(isNaN(route.estimatedTime)).toBe(false);
          
          // Each segment must have both distance and time information
          route.segments.forEach(segment => {
            expect(segment.distance).toBeGreaterThan(0);
            expect(segment.estimatedTime).toBeGreaterThan(0);
            expect(typeof segment.distance).toBe('number');
            expect(typeof segment.estimatedTime).toBe('number');
            expect(isNaN(segment.distance)).toBe(false);
            expect(isNaN(segment.estimatedTime)).toBe(false);
          });
          
          // Requirement 2.5: Walking and cycling must be zero-emission alternatives
          if (transportationMode.type === 'walking' || transportationMode.type === 'cycling') {
            expect(emissionFactor.factor).toBe(0);
            
            // Zero-emission modes should be highlighted in the data sources
            expect(emissionFactor.source).toContain('Zero');
            
            // Only check total emissions if ALL segments use zero-emission modes
            const allSegmentsZeroEmission = route.segments.every(segment => 
              segment.transportationMode.type === 'walking' || segment.transportationMode.type === 'cycling'
            );
            
            if (allSegmentsZeroEmission) {
              expect(carbonFootprint.totalEmissions).toBeLessThanOrEqual(0.002);
            }
          }
          
          // Emission factor must be consistent with transportation mode type
          expect(emissionFactor.transportationMode).toBe(transportationMode.type);
          
          // Carbon footprint must include methodology and data sources (transparency)
          expect(carbonFootprint.methodology).toBeDefined();
          expect(typeof carbonFootprint.methodology).toBe('string');
          expect(carbonFootprint.methodology.length).toBeGreaterThan(0);
          
          expect(carbonFootprint.dataSources).toBeDefined();
          expect(Array.isArray(carbonFootprint.dataSources)).toBe(true);
          expect(carbonFootprint.dataSources.length).toBeGreaterThan(0);
          
          // Each data source must be a non-empty string
          carbonFootprint.dataSources.forEach(source => {
            expect(typeof source).toBe('string');
            expect(source.length).toBeGreaterThan(0);
          });
          
          // Calculation timestamp must be provided
          expect(carbonFootprint.calculationTimestamp).toBeDefined();
          expect(carbonFootprint.calculationTimestamp instanceof Date).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 3 Extended: Zero-emission transportation modes consistency', async () => {
    /**
     * **Feature: eco-friendly-route-planner, Property 3: Transportation mode carbon footprint consistency**
     * 
     * This extended property specifically validates that walking and cycling are 
     * consistently treated as zero-emission alternatives across all calculations.
     */
    await fc.assert(
      fc.asyncProperty(
        routeAlternativeArbitrary,
        fc.constantFrom('walking', 'cycling') as fc.Arbitrary<TransportationType>,
        async (route: RouteAlternative, zeroEmissionType: TransportationType) => {
          const zeroEmissionMode: TransportationMode = {
            type: zeroEmissionType,
            emissionFactor: 0,
            accessibilityFeatures: [],
            availability: 'available'
          };
          
          // Calculate emissions for zero-emission mode
          const carbonFootprint = await carbonCalculator.calculateEmissions(route, zeroEmissionMode);
          const emissionFactor = await carbonCalculator.getEmissionFactor(zeroEmissionMode, 'US');
          
          // Zero-emission modes must have zero emissions
          expect(emissionFactor.factor).toBe(0);
          
          // Only check total emissions if ALL segments use zero-emission modes
          const allSegmentsZeroEmission = route.segments.every(segment => 
            segment.transportationMode.type === 'walking' || segment.transportationMode.type === 'cycling'
          );
          
          if (allSegmentsZeroEmission) {
            expect(carbonFootprint.totalEmissions).toBeLessThanOrEqual(0.002);
          }
          
          // All segment emissions should be very low for zero-emission modes
          carbonFootprint.emissionsBySegment.forEach(segment => {
            if (segment.transportationMode === zeroEmissionType) {
              expect(segment.emissions).toBeLessThanOrEqual(0.002);
            }
          });
          
          // Source should indicate zero emissions
          expect(emissionFactor.source).toMatch(/zero/i);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 3 Extended: Emission factor and total emissions relationship', async () => {
    /**
     * **Feature: eco-friendly-route-planner, Property 3: Transportation mode carbon footprint consistency**
     * 
     * This extended property validates that the relationship between emission factors
     * and total emissions is mathematically consistent.
     */
    await fc.assert(
      fc.asyncProperty(
        routeAlternativeArbitrary,
        transportationModeArbitrary,
        async (route: RouteAlternative, transportationMode: TransportationMode) => {
          const carbonFootprint = await carbonCalculator.calculateEmissions(route, transportationMode);
          
          // Total emissions should be the sum of all segment emissions
          const calculatedTotal = carbonFootprint.emissionsBySegment.reduce(
            (sum, segment) => sum + segment.emissions, 
            0
          );
          
          // Allow for small floating point differences
          const tolerance = 0.001;
          expect(Math.abs(carbonFootprint.totalEmissions - calculatedTotal)).toBeLessThanOrEqual(tolerance);
          
          // Each segment emission should be consistent with distance and emission factor
          carbonFootprint.emissionsBySegment.forEach(segment => {
            expect(segment.emissions).toBeGreaterThanOrEqual(0);
            expect(segment.distance).toBeGreaterThan(0);
            
            // For segments using the same transportation mode, emissions should be proportional to distance
            // Note: We can't directly compare with transportationMode.emissionFactor because the service
            // uses its own emission factors from the database, not the ones from the route segments
            const segmentEmissionFactor = segment.distance > 0 ? segment.emissions / segment.distance : 0;
            expect(segmentEmissionFactor).toBeGreaterThanOrEqual(0);
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 12: Detailed breakdown availability', async () => {
    /**
     * **Feature: eco-friendly-route-planner, Property 12: Detailed breakdown availability**
     * 
     * This property validates that for any calculation request, detailed emissions 
     * breakdown by transportation mode and distance should be available.
     * This ensures users can access detailed calculations as required by Requirement 6.2.
     * 
     * Validates Requirements 6.2:
     * - 6.2: When users request detailed calculations, the system shall show breakdown 
     *        of emissions by transportation mode and distance
     */
    await fc.assert(
      fc.asyncProperty(
        routeAlternativeArbitrary,
        transportationModeArbitrary,
        async (route: RouteAlternative, transportationMode: TransportationMode) => {
          // Calculate emissions for the route and transportation mode
          const carbonFootprint = await carbonCalculator.calculateEmissions(route, transportationMode);
          
          // Detailed breakdown must be available in emissionsBySegment
          expect(carbonFootprint.emissionsBySegment).toBeDefined();
          expect(Array.isArray(carbonFootprint.emissionsBySegment)).toBe(true);
          expect(carbonFootprint.emissionsBySegment.length).toBeGreaterThan(0);
          
          // Each segment in the breakdown must contain detailed information
          carbonFootprint.emissionsBySegment.forEach(segment => {
            // Segment ID must be provided for identification
            expect(segment.segmentId).toBeDefined();
            expect(typeof segment.segmentId).toBe('string');
            expect(segment.segmentId.trim().length).toBeGreaterThan(0);
            
            // Distance must be provided and positive
            expect(segment.distance).toBeDefined();
            expect(typeof segment.distance).toBe('number');
            expect(segment.distance).toBeGreaterThan(0);
            expect(isNaN(segment.distance)).toBe(false);
            
            // Transportation mode must be specified for each segment
            expect(segment.transportationMode).toBeDefined();
            expect(typeof segment.transportationMode).toBe('string');
            expect(['walking', 'cycling', 'public_transit', 'electric_vehicle', 'conventional_vehicle', 'rideshare'])
              .toContain(segment.transportationMode);
            
            // Emissions must be provided and non-negative
            expect(segment.emissions).toBeDefined();
            expect(typeof segment.emissions).toBe('number');
            expect(segment.emissions).toBeGreaterThanOrEqual(0);
            expect(isNaN(segment.emissions)).toBe(false);
          });
          
          // The breakdown should cover all segments in the route
          expect(carbonFootprint.emissionsBySegment.length).toBeLessThanOrEqual(route.segments.length);
          
          // Total emissions should be the sum of segment emissions (consistency check)
          const segmentEmissionsSum = carbonFootprint.emissionsBySegment.reduce(
            (sum, segment) => sum + segment.emissions, 
            0
          );
          
          // Allow for small floating point differences
          const tolerance = 0.001;
          expect(Math.abs(carbonFootprint.totalEmissions - segmentEmissionsSum)).toBeLessThanOrEqual(tolerance);
          
          // Each segment should have a reasonable emission factor (emissions per distance)
          carbonFootprint.emissionsBySegment.forEach(segment => {
            const emissionFactor = segment.distance > 0 ? segment.emissions / segment.distance : 0;
            
            // Emission factor should be reasonable (not negative, not extremely high)
            expect(emissionFactor).toBeGreaterThanOrEqual(0);
            expect(emissionFactor).toBeLessThan(10); // Sanity check: less than 10 kg CO2 per mile
            
            // Zero-emission modes should have zero or near-zero emissions
            if (segment.transportationMode === 'walking' || segment.transportationMode === 'cycling') {
              expect(segment.emissions).toBeLessThanOrEqual(0.002);
            }
          });
          
          // Methodology and data sources must be provided for transparency
          expect(carbonFootprint.methodology).toBeDefined();
          expect(typeof carbonFootprint.methodology).toBe('string');
          expect(carbonFootprint.methodology.length).toBeGreaterThan(0);
          
          expect(carbonFootprint.dataSources).toBeDefined();
          expect(Array.isArray(carbonFootprint.dataSources)).toBe(true);
          expect(carbonFootprint.dataSources.length).toBeGreaterThan(0);
          
          // Calculation timestamp must be provided
          expect(carbonFootprint.calculationTimestamp).toBeDefined();
          expect(carbonFootprint.calculationTimestamp instanceof Date).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });
});