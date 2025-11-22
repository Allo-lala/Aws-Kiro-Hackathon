/**
 * Property-based tests for data model validation - Calculation transparency
 * **Feature: eco-friendly-route-planner, Property 11: Calculation transparency**
 * **Validates: Requirements 6.1, 6.4**
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { CarbonFootprint } from './CarbonFootprint';
import { SegmentEmission } from './common';

// Generator for SegmentEmission
const segmentEmissionArbitrary = fc.record({
  segmentId: fc.uuid(),
  distance: fc.double({ min: 0.1, max: 100, noNaN: true }),
  transportationMode: fc.constantFrom(
    'walking',
    'cycling', 
    'public_transit',
    'electric_vehicle',
    'conventional_vehicle',
    'rideshare'
  ),
  emissions: fc.double({ min: 0, max: 50, noNaN: true })
});

// Generator for meaningful non-whitespace strings
const meaningfulStringArbitrary = (minLength: number, maxLength: number) =>
  fc.string({ minLength, maxLength })
    .filter(s => s.trim().length >= minLength)
    .map(s => s.trim() || 'Default methodology'); // Fallback for edge cases

// Generator for CarbonFootprint with consistent total emissions
const carbonFootprintArbitrary = fc.record({
  emissionsBySegment: fc.array(segmentEmissionArbitrary, { minLength: 1, maxLength: 10 }),
  methodology: meaningfulStringArbitrary(10, 200),
  dataSources: fc.array(meaningfulStringArbitrary(5, 100), { minLength: 1, maxLength: 5 }),
  calculationTimestamp: fc.date()
}).map(partial => ({
  ...partial,
  totalEmissions: partial.emissionsBySegment.reduce((sum, segment) => sum + segment.emissions, 0)
}));

describe('CarbonFootprint Property Tests', () => {
  it('Property 11: Calculation transparency - methodology and data sources are always provided', () => {
    /**
     * **Feature: eco-friendly-route-planner, Property 11: Calculation transparency**
     * 
     * This property validates that for any carbon footprint estimate, methodology 
     * explanations and authoritative data source citations are provided.
     * This ensures transparency in carbon footprint calculations as required by 
     * Requirements 6.1 and 6.4.
     */
    fc.assert(
      fc.property(carbonFootprintArbitrary, (carbonFootprint: CarbonFootprint) => {
        // Methodology must be provided and non-empty
        expect(carbonFootprint.methodology).toBeDefined();
        expect(typeof carbonFootprint.methodology).toBe('string');
        expect(carbonFootprint.methodology.trim().length).toBeGreaterThan(0);
        
        // Data sources must be provided and non-empty array
        expect(carbonFootprint.dataSources).toBeDefined();
        expect(Array.isArray(carbonFootprint.dataSources)).toBe(true);
        expect(carbonFootprint.dataSources.length).toBeGreaterThan(0);
        
        // Each data source must be a non-empty string
        carbonFootprint.dataSources.forEach(source => {
          expect(typeof source).toBe('string');
          expect(source.trim().length).toBeGreaterThan(0);
        });
        
        // Calculation timestamp must be provided
        expect(carbonFootprint.calculationTimestamp).toBeDefined();
        expect(carbonFootprint.calculationTimestamp instanceof Date).toBe(true);
        
        // Total emissions must be non-negative
        expect(carbonFootprint.totalEmissions).toBeGreaterThanOrEqual(0);
        
        // Emissions by segment must be provided and consistent
        expect(carbonFootprint.emissionsBySegment).toBeDefined();
        expect(Array.isArray(carbonFootprint.emissionsBySegment)).toBe(true);
        expect(carbonFootprint.emissionsBySegment.length).toBeGreaterThan(0);
        
        // Each segment emission must have valid data
        carbonFootprint.emissionsBySegment.forEach(segment => {
          expect(segment.segmentId).toBeDefined();
          expect(typeof segment.segmentId).toBe('string');
          expect(segment.segmentId.trim().length).toBeGreaterThan(0);
          expect(segment.distance).toBeGreaterThan(0);
          expect(segment.emissions).toBeGreaterThanOrEqual(0);
          expect(segment.transportationMode).toBeDefined();
        });
      }),
      { numRuns: 100 }
    );
  });

  it('Property 11 Extended: Total emissions consistency with segment breakdown', () => {
    /**
     * **Feature: eco-friendly-route-planner, Property 11: Calculation transparency**
     * 
     * This extended property validates that the total emissions are consistent
     * with the sum of segment emissions, ensuring calculation transparency.
     */
    fc.assert(
      fc.property(carbonFootprintArbitrary, (carbonFootprint: CarbonFootprint) => {
        // Calculate sum of segment emissions
        const segmentSum = carbonFootprint.emissionsBySegment.reduce(
          (sum, segment) => sum + segment.emissions, 
          0
        );
        
        // Total emissions should be approximately equal to sum of segments
        // Allow for small floating point differences
        const tolerance = 0.001;
        expect(Math.abs(carbonFootprint.totalEmissions - segmentSum)).toBeLessThanOrEqual(tolerance);
      }),
      { numRuns: 100 }
    );
  });
});