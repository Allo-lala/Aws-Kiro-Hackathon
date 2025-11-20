/**
 * Property-based tests for Realtime Updater Service - Disruption response consistency
 * **Feature: eco-friendly-route-planner, Property 9: Disruption response consistency**
 * **Validates: Requirements 5.1, 5.2, 5.4**
 */

import { describe, it, expect, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { RealtimeUpdaterService } from './RealtimeUpdaterService';
import { TransportationDisruption, RouteUpdate } from './interfaces/IRealtimeUpdater';
import { RouteAlternative } from '../models/RouteAlternative';
import { Location } from '../models/Location';
import { TransportationMode } from '../models/TransportationMode';
import { CarbonFootprint } from '../models/CarbonFootprint';
import { TransportationType, AvailabilityStatus } from '../models/common';

// Generator for Location
const locationArbitrary = fc.record({
  latitude: fc.double({ min: -90, max: 90, noNaN: true }),
  longitude: fc.double({ min: -180, max: 180, noNaN: true }),
  address: fc.option(fc.string({ minLength: 5, maxLength: 100 }), { nil: undefined }),
  city: fc.option(fc.string({ minLength: 2, maxLength: 50 }), { nil: undefined }),
  country: fc.option(fc.string({ minLength: 2, maxLength: 50 }), { nil: undefined })
});

// Generator for TransportationMode
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
  accessibilityFeatures: fc.array(fc.record({
    type: fc.constantFrom('wheelchair_accessible', 'visual_impairment', 'hearing_impairment', 'audio_announcements'),
    description: fc.string({ minLength: 5, maxLength: 50 }),
    supported: fc.boolean()
  }), { maxLength: 3 }),
  availability: fc.constantFrom('available', 'limited', 'unavailable') as fc.Arbitrary<AvailabilityStatus>
});

// Generator for RouteSegment
const routeSegmentArbitrary = fc.record({
  id: fc.uuid(),
  startLocation: locationArbitrary,
  endLocation: locationArbitrary,
  transportationMode: transportationModeArbitrary,
  distance: fc.double({ min: 0.1, max: 100, noNaN: true }),
  estimatedTime: fc.double({ min: 1, max: 300, noNaN: true }),
  instructions: fc.option(fc.string({ minLength: 10, maxLength: 200 }), { nil: undefined })
});

// Generator for CarbonFootprint
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

// Generator for RouteAlternative
const routeAlternativeArbitrary = fc.record({
  id: fc.uuid(),
  origin: locationArbitrary,
  destination: locationArbitrary,
  transportationModes: fc.array(transportationModeArbitrary, { minLength: 1, maxLength: 3 }),
  segments: fc.array(routeSegmentArbitrary, { minLength: 1, maxLength: 5 }),
  totalDistance: fc.double({ min: 0.1, max: 500, noNaN: true }),
  estimatedTime: fc.double({ min: 1, max: 600, noNaN: true }),
  carbonFootprint: carbonFootprintArbitrary,
  ecoScore: fc.double({ min: 0, max: 100, noNaN: true }),
  accessibilityCompliant: fc.boolean(),
  cost: fc.option(fc.double({ min: 0, max: 200, noNaN: true }), { nil: undefined })
});

// Generator for TransportationDisruption
const transportationDisruptionArbitrary = fc.record({
  id: fc.uuid(),
  type: fc.constantFrom('service_interruption', 'delay', 'route_closure', 'weather', 'maintenance'),
  affectedRoutes: fc.array(fc.uuid(), { minLength: 1, maxLength: 5 }),
  severity: fc.constantFrom('low', 'medium', 'high'),
  startTime: fc.date(),
  estimatedEndTime: fc.option(fc.date(), { nil: undefined }),
  description: fc.string({ minLength: 10, maxLength: 200 }),
  alternativeOptions: fc.array(fc.string({ minLength: 5, maxLength: 50 }), { minLength: 0, maxLength: 5 })
});

describe('RealtimeUpdaterService Property Tests', () => {
  let realtimeUpdater: RealtimeUpdaterService;

  beforeEach(() => {
    realtimeUpdater = new RealtimeUpdaterService();
  });

  it('Property 9: Disruption response consistency', async () => {
    /**
     * **Feature: eco-friendly-route-planner, Property 9: Disruption response consistency**
     * 
     * This property validates that for any transportation disruption, affected routes 
     * should be automatically recalculated with eco-friendly alternatives prioritized 
     * and users notified of updates.
     * 
     * Validates Requirements 5.1, 5.2, 5.4:
     * - 5.1: When transportation disruptions occur, the system shall automatically recalculate affected routes
     * - 5.2: When providing disruption updates, the system shall prioritize alternative eco-friendly transportation modes
     * - 5.4: When disruptions affect recommended routes, the system shall notify users and suggest updated alternatives
     */
    await fc.assert(
      fc.asyncProperty(
        fc.array(routeAlternativeArbitrary, { minLength: 1, maxLength: 3 }),
        transportationDisruptionArbitrary,
        async (routes: RouteAlternative[], disruption: TransportationDisruption) => {
          // Ensure disruption affects at least one of the provided routes
          const affectedRouteIds = routes.slice(0, Math.min(routes.length, disruption.affectedRoutes.length))
            .map(route => route.id);
          const testDisruption: TransportationDisruption = {
            ...disruption,
            affectedRoutes: affectedRouteIds
          };

          // First, subscribe to routes to get them in the service cache
          await realtimeUpdater.subscribeToUpdates(routes);

          // Handle the disruption
          const updates = await realtimeUpdater.handleDisruption(testDisruption);

          // Requirement 5.1: Affected routes should be automatically recalculated
          expect(updates).toBeDefined();
          expect(Array.isArray(updates)).toBe(true);
          expect(updates.length).toBeGreaterThan(0);

          // Each affected route should have a corresponding update
          const updatedRouteIds = updates.map(update => update.routeId);
          affectedRouteIds.forEach(routeId => {
            expect(updatedRouteIds).toContain(routeId);
          });

          // Validate each route update
          updates.forEach((update: RouteUpdate) => {
            // Update must be properly structured
            expect(update.routeId).toBeDefined();
            expect(typeof update.routeId).toBe('string');
            expect(update.routeId.trim().length).toBeGreaterThan(0);

            expect(update.updateType).toBe('disruption');
            expect(['low', 'medium', 'high']).toContain(update.severity);
            
            expect(update.message).toBeDefined();
            expect(typeof update.message).toBe('string');
            expect(update.message.length).toBeGreaterThan(0);

            expect(update.timestamp).toBeDefined();
            expect(update.timestamp instanceof Date).toBe(true);

            expect(Array.isArray(update.affectedSegments)).toBe(true);

            // Requirement 5.4: Users should be notified with updated alternatives
            expect(update.message).toContain(testDisruption.description);

            // Requirement 5.2: Alternative eco-friendly transportation modes should be prioritized
            if (update.alternativeRoutes && update.alternativeRoutes.length > 0) {
              // Alternative routes should be provided
              expect(Array.isArray(update.alternativeRoutes)).toBe(true);
              expect(update.alternativeRoutes.length).toBeGreaterThan(0);
              expect(update.alternativeRoutes.length).toBeLessThanOrEqual(3); // Service limits to top 3

              // Each alternative route should be valid
              update.alternativeRoutes.forEach(altRoute => {
                expect(altRoute.id).toBeDefined();
                expect(altRoute.origin).toBeDefined();
                expect(altRoute.destination).toBeDefined();
                expect(altRoute.transportationModes).toBeDefined();
                expect(Array.isArray(altRoute.transportationModes)).toBe(true);
                expect(altRoute.transportationModes.length).toBeGreaterThan(0);
                expect(altRoute.ecoScore).toBeGreaterThanOrEqual(0);
                expect(altRoute.ecoScore).toBeLessThanOrEqual(100);
                expect(altRoute.carbonFootprint).toBeDefined();
                expect(altRoute.carbonFootprint.totalEmissions).toBeGreaterThanOrEqual(0);
              });

              // Alternative routes should be ranked by eco-friendliness (higher ecoScore is better)
              for (let i = 1; i < update.alternativeRoutes.length; i++) {
                expect(update.alternativeRoutes[i-1].ecoScore).toBeGreaterThanOrEqual(
                  update.alternativeRoutes[i].ecoScore
                );
              }

              // Alternative routes should not use disrupted transportation modes
              const disruptedModes = getDisruptedTransportationModes(testDisruption);
              update.alternativeRoutes.forEach(altRoute => {
                const usesDisruptedMode = altRoute.transportationModes.some(mode => 
                  disruptedModes.includes(mode.type)
                );
                expect(usesDisruptedMode).toBe(false);
              });

              // Message should indicate alternatives are available
              expect(update.message).toMatch(/alternative/i);
            }

            // Severity should be consistent with disruption severity
            expect(update.severity).toBe(testDisruption.severity);

            // Estimated resolution should be provided if available
            if (testDisruption.estimatedEndTime) {
              expect(update.estimatedResolution).toBeDefined();
              expect(update.estimatedResolution instanceof Date).toBe(true);
              expect(update.estimatedResolution).toEqual(testDisruption.estimatedEndTime);
            }
          });

          // All updates should be for routes that were actually affected
          updates.forEach(update => {
            expect(affectedRouteIds).toContain(update.routeId);
          });

          // Updates should be consistent across multiple calls with same disruption
          const secondUpdates = await realtimeUpdater.handleDisruption(testDisruption);
          expect(secondUpdates.length).toBe(updates.length);
          
          // Route IDs should be the same (though alternatives might differ due to randomness in mock)
          const firstRouteIds = updates.map(u => u.routeId).sort();
          const secondRouteIds = secondUpdates.map(u => u.routeId).sort();
          expect(firstRouteIds).toEqual(secondRouteIds);
        }
      ),
      { numRuns: 20 }
    );
  });

  it('Property 10: Real-time data integration', async () => {
    /**
     * **Feature: eco-friendly-route-planner, Property 10: Real-time data integration**
     * 
     * This property validates that for any real-time delay information, time estimates 
     * and carbon footprint calculations should be updated accordingly.
     * 
     * Validates Requirements 5.3:
     * - 5.3: When real-time data indicates delays, the system shall update time estimates and carbon footprint calculations accordingly
     */
    await fc.assert(
      fc.asyncProperty(
        routeAlternativeArbitrary,
        async (originalRoute: RouteAlternative) => {
          // First, subscribe to the route to get it in the service cache
          await realtimeUpdater.subscribeToUpdates([originalRoute]);

          // Store original values for comparison
          const originalTime = originalRoute.estimatedTime;

          // Refresh route data to get real-time updates (this simulates receiving delay information)
          const updatedRoute = await realtimeUpdater.refreshRouteData(originalRoute.id);

          // Requirement 5.3: Time estimates should be updated when delays occur
          expect(updatedRoute).toBeDefined();
          expect(updatedRoute.id).toBe(originalRoute.id);

          // Time estimates should be updated (either same if no delay, or increased if delay)
          expect(updatedRoute.estimatedTime).toBeGreaterThanOrEqual(originalTime);
          expect(typeof updatedRoute.estimatedTime).toBe('number');
          expect(updatedRoute.estimatedTime).toBeGreaterThan(0);

          // Carbon footprint should be recalculated and remain valid
          expect(updatedRoute.carbonFootprint).toBeDefined();
          expect(updatedRoute.carbonFootprint.totalEmissions).toBeGreaterThanOrEqual(0);
          expect(typeof updatedRoute.carbonFootprint.totalEmissions).toBe('number');

          // Route structure should remain intact
          expect(updatedRoute.segments.length).toBe(originalRoute.segments.length);
          expect(updatedRoute.transportationModes.length).toBe(originalRoute.transportationModes.length);
          expect(updatedRoute.totalDistance).toBe(originalRoute.totalDistance);
        }
      ),
      { numRuns: 5, timeout: 10000 }
    );
  });
});

// Helper function to determine disrupted transportation modes based on disruption type
function getDisruptedTransportationModes(disruption: TransportationDisruption): TransportationType[] {
  switch (disruption.type) {
    case 'service_interruption':
      return ['public_transit'];
    case 'route_closure':
      return ['conventional_vehicle', 'electric_vehicle', 'rideshare'];
    case 'weather':
      return ['cycling', 'walking'];
    case 'maintenance':
      return ['public_transit'];
    default:
      return [];
  }
}