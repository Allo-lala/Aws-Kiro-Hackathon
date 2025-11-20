/**
 * Property-based tests for User Tracker Service - Savings calculation accuracy
 * **Feature: eco-friendly-route-planner, Property 5: Savings calculation accuracy**
 * **Validates: Requirements 3.1**
 */

import { describe, it, expect, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { UserTrackerService } from './UserTrackerService';
import { RouteAlternative } from '../models/RouteAlternative';
import { TransportationMode } from '../models/TransportationMode';
import { Location } from '../models/Location';
import { TransportationType, AvailabilityStatus } from '../models/common';
import { locationArbitrary, transportationTypeArbitrary } from '../test-utils/generators';

// Generator for AccessibilityFeature
const accessibilityFeatureArbitrary = fc.record({
  type: fc.constantFrom('wheelchair_accessible', 'visual_impairment', 'hearing_impairment', 'audio_announcements'),
  description: fc.string({ minLength: 5, maxLength: 50 }),
  supported: fc.boolean()
});

// Generator for TransportationMode with realistic emission factors
const transportationModeArbitrary = fc.record({
  type: transportationTypeArbitrary,
  subtype: fc.option(fc.constantFrom('bus', 'train', 'subway', 'tram'), { nil: undefined }),
  emissionFactor: fc.double({ min: 0, max: 2, noNaN: true, noDefaultInfinity: true }),
  accessibilityFeatures: fc.array(accessibilityFeatureArbitrary, { maxLength: 3 }),
  availability: fc.constantFrom('available', 'limited', 'unavailable') as fc.Arbitrary<AvailabilityStatus>
}).map(mode => ({
  ...mode,
  // Ensure zero-emission modes have zero emission factors
  emissionFactor: mode.type === 'walking' || mode.type === 'cycling' ? 0 : mode.emissionFactor
}));

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

// Generator for RouteAlternative
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
  // Add a placeholder carbon footprint
  carbonFootprint: {
    totalEmissions: 0,
    emissionsBySegment: [],
    methodology: 'Test methodology',
    dataSources: ['Test source'],
    calculationTimestamp: new Date()
  }
}));

// Generator for user IDs
const userIdArbitrary = fc.uuid();

// Generator for timeframes
const timeframeArbitrary = fc.record({
  start: fc.date({ min: new Date('2020-01-01'), max: new Date('2024-12-31') }),
  end: fc.date({ min: new Date('2020-01-01'), max: new Date('2024-12-31') })
}).filter(timeframe => timeframe.start < timeframe.end);

describe('UserTrackerService Property Tests', () => {
  let userTracker: UserTrackerService;

  beforeEach(() => {
    userTracker = new UserTrackerService();
  });

  it('Property 5: Savings calculation accuracy', async () => {
    /**
     * **Feature: eco-friendly-route-planner, Property 5: Savings calculation accuracy**
     * 
     * This property validates that for any completed eco-friendly trip, the carbon 
     * footprint savings should be correctly calculated compared to conventional 
     * alternatives and stored in user history.
     * 
     * Validates Requirements 3.1:
     * - 3.1: When a user completes a trip using a recommended eco-friendly route, 
     *        the Route_Planner shall calculate and store the Carbon_Footprint savings 
     *        compared to conventional alternatives
     */
    await fc.assert(
      fc.asyncProperty(
        userIdArbitrary,
        routeAlternativeArbitrary,
        transportationModeArbitrary,
        timeframeArbitrary,
        async (userId: string, route: RouteAlternative, actualMode: TransportationMode, timeframe) => {
          // Record a trip using the specified transportation mode
          const tripRecord = await userTracker.recordTrip(userId, route, actualMode);
          
          // Requirement 3.1: Trip record must be created and stored
          expect(tripRecord).toBeDefined();
          expect(tripRecord.userId).toBe(userId);
          expect(tripRecord.routeId).toBe(route.id);
          expect(tripRecord.actualTransportationMode).toBe(actualMode);
          
          // Savings calculation must be accurate
          const actualEmissions = route.totalDistance * actualMode.emissionFactor;
          const conventionalEmissions = route.totalDistance * 0.404; // Conventional car baseline
          const expectedSavings = Math.max(0, conventionalEmissions - actualEmissions);
          
          expect(tripRecord.actualCarbonFootprint).toBeCloseTo(actualEmissions, 3);
          expect(tripRecord.savedEmissions).toBeCloseTo(expectedSavings, 3);
          
          // Savings must be non-negative
          expect(tripRecord.savedEmissions).toBeGreaterThanOrEqual(0);
          
          // Trip date must be set and reasonable
          expect(tripRecord.tripDate).toBeInstanceOf(Date);
          expect(tripRecord.tripDate.getTime()).toBeLessThanOrEqual(Date.now());
          expect(tripRecord.tripDate.getTime()).toBeGreaterThan(Date.now() - 60000); // Within last minute
          
          // Origin and destination must be preserved
          expect(tripRecord.origin).toEqual(route.origin);
          expect(tripRecord.destination).toEqual(route.destination);
          
          // Calculate cumulative savings within a timeframe that includes the trip
          const extendedTimeframe = {
            start: new Date(tripRecord.tripDate.getTime() - 24 * 60 * 60 * 1000), // 1 day before
            end: new Date(tripRecord.tripDate.getTime() + 24 * 60 * 60 * 1000)    // 1 day after
          };
          
          const metrics = await userTracker.calculateSavings(userId, extendedTimeframe);
          
          // Cumulative metrics must include this trip
          expect(metrics.totalTrips).toBeGreaterThanOrEqual(1);
          expect(metrics.totalSavedEmissions).toBeGreaterThanOrEqual(tripRecord.savedEmissions);
          
          // Average savings calculation must be correct
          if (metrics.totalTrips > 0) {
            const expectedAverage = metrics.totalSavedEmissions / metrics.totalTrips;
            expect(metrics.averageSavingsPerTrip).toBeCloseTo(expectedAverage, 3);
          } else {
            expect(metrics.averageSavingsPerTrip).toBe(0);
          }
          
          // Timeframe must be preserved
          expect(metrics.timeframe).toEqual(extendedTimeframe);
          
          // Milestones must be defined
          expect(metrics.milestones).toBeDefined();
          expect(Array.isArray(metrics.milestones)).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 5 Extended: Zero-emission transportation savings', async () => {
    /**
     * **Feature: eco-friendly-route-planner, Property 5: Savings calculation accuracy**
     * 
     * This extended property specifically validates that zero-emission transportation
     * modes (walking, cycling) always result in maximum possible savings.
     */
    await fc.assert(
      fc.asyncProperty(
        userIdArbitrary,
        routeAlternativeArbitrary,
        fc.constantFrom('walking', 'cycling') as fc.Arbitrary<TransportationType>,
        async (userId: string, route: RouteAlternative, zeroEmissionType: TransportationType) => {
          const zeroEmissionMode: TransportationMode = {
            type: zeroEmissionType,
            emissionFactor: 0,
            accessibilityFeatures: [],
            availability: 'available'
          };
          
          const tripRecord = await userTracker.recordTrip(userId, route, zeroEmissionMode);
          
          // Zero-emission modes should have zero actual emissions
          expect(tripRecord.actualCarbonFootprint).toBe(0);
          
          // Savings should equal the full conventional emissions
          const conventionalEmissions = route.totalDistance * 0.404;
          expect(tripRecord.savedEmissions).toBeCloseTo(conventionalEmissions, 3);
          
          // Savings should be maximized for zero-emission modes
          expect(tripRecord.savedEmissions).toBeGreaterThan(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 5 Extended: High-emission transportation savings', async () => {
    /**
     * **Feature: eco-friendly-route-planner, Property 5: Savings calculation accuracy**
     * 
     * This extended property validates that high-emission transportation modes
     * result in zero or minimal savings compared to conventional alternatives.
     */
    await fc.assert(
      fc.asyncProperty(
        userIdArbitrary,
        routeAlternativeArbitrary,
        fc.record({
          type: fc.constantFrom('conventional_vehicle', 'rideshare') as fc.Arbitrary<TransportationType>,
          emissionFactor: fc.double({ min: 0.4, max: 2.0, noNaN: true, noDefaultInfinity: true }), // High emission factors
          accessibilityFeatures: fc.constant([]),
          availability: fc.constant('available' as AvailabilityStatus)
        }),
        async (userId: string, route: RouteAlternative, highEmissionMode: TransportationMode) => {
          const tripRecord = await userTracker.recordTrip(userId, route, highEmissionMode);
          
          // High-emission modes should have significant actual emissions
          const expectedEmissions = route.totalDistance * highEmissionMode.emissionFactor;
          expect(tripRecord.actualCarbonFootprint).toBeCloseTo(expectedEmissions, 3);
          
          // If emission factor is higher than conventional baseline, savings should be zero
          if (highEmissionMode.emissionFactor >= 0.404) {
            expect(tripRecord.savedEmissions).toBe(0);
          } else {
            // If slightly lower than baseline, savings should be positive but small
            const conventionalEmissions = route.totalDistance * 0.404;
            const expectedSavings = conventionalEmissions - expectedEmissions;
            expect(tripRecord.savedEmissions).toBeCloseTo(expectedSavings, 3);
            expect(tripRecord.savedEmissions).toBeGreaterThanOrEqual(0);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 5 Extended: Multiple trips cumulative accuracy', async () => {
    /**
     * **Feature: eco-friendly-route-planner, Property 5: Savings calculation accuracy**
     * 
     * This extended property validates that cumulative savings calculations remain
     * accurate across multiple trips with different transportation modes.
     */
    await fc.assert(
      fc.asyncProperty(
        userIdArbitrary,
        fc.array(
          fc.tuple(routeAlternativeArbitrary, transportationModeArbitrary),
          { minLength: 2, maxLength: 10 }
        ),
        timeframeArbitrary,
        async (userId: string, trips: Array<[RouteAlternative, TransportationMode]>, timeframe) => {
          const tripRecords = [];
          let expectedTotalSavings = 0;
          
          // Record multiple trips
          for (const [route, mode] of trips) {
            const tripRecord = await userTracker.recordTrip(userId, route, mode);
            tripRecords.push(tripRecord);
            expectedTotalSavings += tripRecord.savedEmissions;
          }
          
          // Extend timeframe to include all trips
          const allTripDates = tripRecords.map(trip => trip.tripDate);
          const minDate = new Date(Math.min(...allTripDates.map(d => d.getTime())));
          const maxDate = new Date(Math.max(...allTripDates.map(d => d.getTime())));
          
          const extendedTimeframe = {
            start: new Date(minDate.getTime() - 24 * 60 * 60 * 1000),
            end: new Date(maxDate.getTime() + 24 * 60 * 60 * 1000)
          };
          
          const metrics = await userTracker.calculateSavings(userId, extendedTimeframe);
          
          // Total trips should match recorded trips
          expect(metrics.totalTrips).toBe(tripRecords.length);
          
          // Total savings should match sum of individual trip savings
          expect(metrics.totalSavedEmissions).toBeCloseTo(expectedTotalSavings, 3);
          
          // Average savings should be calculated correctly
          const expectedAverage = expectedTotalSavings / tripRecords.length;
          expect(metrics.averageSavingsPerTrip).toBeCloseTo(expectedAverage, 3);
          
          // Each individual trip record should have correct savings
          tripRecords.forEach(tripRecord => {
            expect(tripRecord.savedEmissions).toBeGreaterThanOrEqual(0);
            expect(typeof tripRecord.savedEmissions).toBe('number');
            expect(isNaN(tripRecord.savedEmissions)).toBe(false);
          });
        }
      ),
      { numRuns: 50 } // Reduced runs due to complexity
    );
  });

  it('Property 5 Extended: Timeframe filtering accuracy', async () => {
    /**
     * **Feature: eco-friendly-route-planner, Property 5: Savings calculation accuracy**
     * 
     * This extended property validates that savings calculations correctly filter
     * trips based on the specified timeframe.
     */
    await fc.assert(
      fc.asyncProperty(
        userIdArbitrary,
        routeAlternativeArbitrary,
        transportationModeArbitrary,
        fc.record({
          start: fc.date({ min: new Date('2023-01-01'), max: new Date('2023-06-30') }),
          end: fc.date({ min: new Date('2023-07-01'), max: new Date('2023-12-31') })
        }),
        async (userId: string, route: RouteAlternative, mode: TransportationMode, timeframe) => {
          // Record a trip (will have current timestamp)
          const tripRecord = await userTracker.recordTrip(userId, route, mode);
          
          // Calculate savings for a timeframe that doesn't include the current trip
          const metrics = await userTracker.calculateSavings(userId, timeframe);
          
          // Since the trip was recorded with current timestamp and timeframe is in 2023,
          // the metrics should show zero trips and savings
          expect(metrics.totalTrips).toBe(0);
          expect(metrics.totalSavedEmissions).toBe(0);
          expect(metrics.averageSavingsPerTrip).toBe(0);
          
          // But if we use a timeframe that includes the current time
          const currentTimeframe = {
            start: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
            end: new Date(Date.now() + 24 * 60 * 60 * 1000)    // 1 day from now
          };
          
          const currentMetrics = await userTracker.calculateSavings(userId, currentTimeframe);
          
          // This should include the trip
          expect(currentMetrics.totalTrips).toBe(1);
          expect(currentMetrics.totalSavedEmissions).toBeCloseTo(tripRecord.savedEmissions, 3);
          expect(currentMetrics.averageSavingsPerTrip).toBeCloseTo(tripRecord.savedEmissions, 3);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 6: Cumulative tracking consistency', async () => {
    /**
     * **Feature: eco-friendly-route-planner, Property 6: Cumulative tracking consistency**
     * 
     * This property validates that for any user's trip history, cumulative environmental 
     * impact reductions should be accurately aggregated and milestone notifications should 
     * trigger at appropriate thresholds.
     * 
     * Validates Requirements 3.2, 3.3:
     * - 3.2: When viewing savings history, the Route_Planner shall display cumulative 
     *        environmental impact reductions over time
     * - 3.3: When savings milestones are reached, the Route_Planner shall provide positive 
     *        reinforcement and achievement notifications
     */
    await fc.assert(
      fc.asyncProperty(
        userIdArbitrary,
        fc.array(
          fc.tuple(routeAlternativeArbitrary, transportationModeArbitrary),
          { minLength: 1, maxLength: 15 }
        ),
        async (userId: string, trips: Array<[RouteAlternative, TransportationMode]>) => {
          // Record multiple trips over time
          const tripRecords = [];
          let cumulativeSavings = 0;
          
          for (const [route, mode] of trips) {
            const tripRecord = await userTracker.recordTrip(userId, route, mode);
            tripRecords.push(tripRecord);
            cumulativeSavings += tripRecord.savedEmissions;
            
            // Requirement 3.2: Cumulative tracking consistency
            // Calculate savings for a timeframe that includes all trips so far
            const timeframe = {
              start: new Date(tripRecords[0].tripDate.getTime() - 60000), // 1 minute before first trip
              end: new Date(Date.now() + 60000) // 1 minute from now
            };
            
            const metrics = await userTracker.calculateSavings(userId, timeframe);
            
            // Cumulative savings should match sum of individual trip savings
            expect(metrics.totalSavedEmissions).toBeCloseTo(cumulativeSavings, 3);
            
            // Total trips should match number of recorded trips
            expect(metrics.totalTrips).toBe(tripRecords.length);
            
            // Average savings should be calculated correctly
            const expectedAverage = cumulativeSavings / tripRecords.length;
            expect(metrics.averageSavingsPerTrip).toBeCloseTo(expectedAverage, 3);
            
            // Timeframe should be preserved
            expect(metrics.timeframe).toEqual(timeframe);
            
            // Requirement 3.3: Milestone notifications
            // Milestones should be defined and properly structured
            expect(metrics.milestones).toBeDefined();
            expect(Array.isArray(metrics.milestones)).toBe(true);
            
            // Check milestone achievement consistency
            for (const milestone of metrics.milestones) {
              expect(milestone).toHaveProperty('id');
              expect(milestone).toHaveProperty('type');
              expect(milestone).toHaveProperty('threshold');
              expect(milestone).toHaveProperty('achieved');
              expect(milestone).toHaveProperty('description');
              
              // Milestone achievement should be consistent with current metrics
              if (milestone.type === 'emissions_saved') {
                if (metrics.totalSavedEmissions >= milestone.threshold) {
                  expect(milestone.achieved).toBe(true);
                  expect(milestone.achievedDate).toBeInstanceOf(Date);
                } else {
                  expect(milestone.achieved).toBe(false);
                }
              } else if (milestone.type === 'trips_completed') {
                if (metrics.totalTrips >= milestone.threshold) {
                  expect(milestone.achieved).toBe(true);
                  expect(milestone.achievedDate).toBeInstanceOf(Date);
                } else {
                  expect(milestone.achieved).toBe(false);
                }
              }
              
              // Achieved milestones should have achievement dates
              if (milestone.achieved) {
                expect(milestone.achievedDate).toBeInstanceOf(Date);
                expect(milestone.achievedDate!.getTime()).toBeLessThanOrEqual(Date.now());
              }
            }
          }
          
          // Final validation: cumulative consistency over entire history
          const finalTimeframe = {
            start: new Date(tripRecords[0].tripDate.getTime() - 60000),
            end: new Date(Date.now() + 60000)
          };
          
          const finalMetrics = await userTracker.calculateSavings(userId, finalTimeframe);
          
          // Total cumulative savings should equal sum of all individual trip savings
          const expectedTotalSavings = tripRecords.reduce((sum, trip) => sum + trip.savedEmissions, 0);
          expect(finalMetrics.totalSavedEmissions).toBeCloseTo(expectedTotalSavings, 3);
          
          // Milestone progression should be monotonic (once achieved, stays achieved)
          const achievedMilestones = finalMetrics.milestones.filter(m => m.achieved);
          for (const milestone of achievedMilestones) {
            if (milestone.type === 'emissions_saved') {
              expect(finalMetrics.totalSavedEmissions).toBeGreaterThanOrEqual(milestone.threshold);
            } else if (milestone.type === 'trips_completed') {
              expect(finalMetrics.totalTrips).toBeGreaterThanOrEqual(milestone.threshold);
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 6 Extended: Milestone achievement timing', async () => {
    /**
     * **Feature: eco-friendly-route-planner, Property 6: Cumulative tracking consistency**
     * 
     * This extended property validates that milestones are achieved at the exact moment
     * when thresholds are crossed, ensuring proper notification timing.
     */
    await fc.assert(
      fc.asyncProperty(
        userIdArbitrary,
        fc.array(
          fc.tuple(
            routeAlternativeArbitrary,
            fc.record({
              type: fc.constantFrom('walking', 'cycling') as fc.Arbitrary<TransportationType>,
              emissionFactor: fc.constant(0), // Zero emissions for predictable savings
              accessibilityFeatures: fc.constant([]),
              availability: fc.constant('available' as AvailabilityStatus)
            })
          ),
          { minLength: 2, maxLength: 8 }
        ),
        async (userId: string, trips: Array<[RouteAlternative, TransportationMode]>) => {
          let previousMilestoneCount = 0;
          
          for (let i = 0; i < trips.length; i++) {
            const [route, mode] = trips[i];
            await userTracker.recordTrip(userId, route, mode);
            
            const timeframe = {
              start: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
              end: new Date(Date.now() + 60000) // 1 minute from now
            };
            
            const metrics = await userTracker.calculateSavings(userId, timeframe);
            const currentMilestoneCount = metrics.milestones.filter(m => m.achieved).length;
            
            // Milestone count should never decrease (monotonic achievement)
            expect(currentMilestoneCount).toBeGreaterThanOrEqual(previousMilestoneCount);
            
            // If new milestones were achieved, they should have recent achievement dates
            if (currentMilestoneCount > previousMilestoneCount) {
              const newlyAchieved = metrics.milestones.filter(m => 
                m.achieved && m.achievedDate && m.achievedDate.getTime() > Date.now() - 60000
              );
              expect(newlyAchieved.length).toBeGreaterThan(0);
            }
            
            previousMilestoneCount = currentMilestoneCount;
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  it('Property 6 Extended: Timeframe filtering for cumulative tracking', async () => {
    /**
     * **Feature: eco-friendly-route-planner, Property 6: Cumulative tracking consistency**
     * 
     * This extended property validates that cumulative tracking correctly filters
     * trips based on different timeframes while maintaining consistency.
     */
    await fc.assert(
      fc.asyncProperty(
        userIdArbitrary,
        fc.array(
          fc.tuple(routeAlternativeArbitrary, transportationModeArbitrary),
          { minLength: 3, maxLength: 10 }
        ),
        async (userId: string, trips: Array<[RouteAlternative, TransportationMode]>) => {
          // Record all trips
          const tripRecords = [];
          for (const [route, mode] of trips) {
            const tripRecord = await userTracker.recordTrip(userId, route, mode);
            tripRecords.push(tripRecord);
            
            // Add small delay to ensure different timestamps
            await new Promise(resolve => setTimeout(resolve, 10));
          }
          
          // Test different timeframe windows
          const allTripDates = tripRecords.map(trip => trip.tripDate);
          const minDate = new Date(Math.min(...allTripDates.map(d => d.getTime())));
          const maxDate = new Date(Math.max(...allTripDates.map(d => d.getTime())));
          
          // Full timeframe should include all trips
          const fullTimeframe = {
            start: new Date(minDate.getTime() - 60000),
            end: new Date(maxDate.getTime() + 60000)
          };
          
          const fullMetrics = await userTracker.calculateSavings(userId, fullTimeframe);
          expect(fullMetrics.totalTrips).toBe(tripRecords.length);
          
          // Partial timeframe should include subset of trips
          if (tripRecords.length > 1) {
            const midDate = new Date((minDate.getTime() + maxDate.getTime()) / 2);
            const partialTimeframe = {
              start: new Date(minDate.getTime() - 60000),
              end: midDate
            };
            
            const partialMetrics = await userTracker.calculateSavings(userId, partialTimeframe);
            expect(partialMetrics.totalTrips).toBeLessThanOrEqual(fullMetrics.totalTrips);
            expect(partialMetrics.totalSavedEmissions).toBeLessThanOrEqual(fullMetrics.totalSavedEmissions);
            
            // Verify that partial metrics only include trips within timeframe
            const expectedTripsInPartial = tripRecords.filter(trip => 
              trip.tripDate >= partialTimeframe.start && trip.tripDate <= partialTimeframe.end
            );
            expect(partialMetrics.totalTrips).toBe(expectedTripsInPartial.length);
            
            const expectedSavingsInPartial = expectedTripsInPartial.reduce(
              (sum, trip) => sum + trip.savedEmissions, 0
            );
            expect(partialMetrics.totalSavedEmissions).toBeCloseTo(expectedSavingsInPartial, 3);
          }
        }
      ),
      { numRuns: 50 }
    );
  });
});