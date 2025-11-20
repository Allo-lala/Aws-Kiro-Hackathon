/**
 * Property-based tests for Accessibility Filter Service - Accessibility-aware eco-optimization
 * **Feature: eco-friendly-route-planner, Property 8: Accessibility-aware eco-optimization**
 * **Validates: Requirements 4.1, 4.2**
 */

import { describe, it, expect, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { AccessibilityFilterService } from './AccessibilityFilterService';
import { RouteAlternative } from '../models/RouteAlternative';
import { UserPreferences } from '../models/UserPreferences';
import { TransportationMode } from '../models/TransportationMode';
import { AccessibilityRequirement, AccessibilityFeature, TransportationType, AvailabilityStatus } from '../models/common';

// Generator for AccessibilityFeature
const accessibilityFeatureArbitrary = fc.record({
  type: fc.constantFrom(
    'wheelchair_accessible', 
    'visual_impairment', 
    'hearing_impairment', 
    'mobility_assistance',
    'cognitive_assistance',
    'audio_announcements'
  ),
  description: fc.string({ minLength: 5, maxLength: 50 }),
  supported: fc.boolean()
});

// Generator for AccessibilityRequirement
const accessibilityRequirementArbitrary = fc.record({
  type: fc.constantFrom(
    'wheelchair_accessible', 
    'visual_impairment', 
    'hearing_impairment', 
    'mobility_assistance',
    'cognitive_assistance'
  ),
  required: fc.boolean(),
  description: fc.option(fc.string({ minLength: 5, maxLength: 100 }), { nil: undefined })
});

// Generator for TransportationMode with accessibility features
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
  accessibilityFeatures: fc.array(accessibilityFeatureArbitrary, { minLength: 0, maxLength: 5 }),
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
  carbonFootprint: fc.record({
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
  }),
  ecoScore: fc.double({ min: 0, max: 100, noNaN: true }),
  accessibilityCompliant: fc.boolean(),
  cost: fc.option(fc.double({ min: 0, max: 200, noNaN: true }), { nil: undefined })
});

// Generator for UserPreferences with accessibility needs
const userPreferencesArbitrary = fc.record({
  userId: fc.uuid(),
  maxWalkingDistance: fc.double({ min: 0.1, max: 10 }),
  preferredTransportationModes: fc.array(transportationModeArbitrary, { minLength: 0, maxLength: 5 }),
  accessibilityNeeds: fc.array(accessibilityRequirementArbitrary, { minLength: 0, maxLength: 5 }),
  sustainabilityPriority: fc.constantFrom('high', 'medium', 'low'),
  timeVsEnvironmentWeight: fc.double({ min: 0, max: 1 })
});

describe('AccessibilityFilterService Property Tests', () => {
  let accessibilityFilter: AccessibilityFilterService;

  beforeEach(() => {
    accessibilityFilter = new AccessibilityFilterService();
  });

  it('Property 8: Accessibility-aware eco-optimization', () => {
    /**
     * **Feature: eco-friendly-route-planner, Property 8: Accessibility-aware eco-optimization**
     * 
     * This property validates that for any accessibility preferences, route filtering 
     * should include only accessible transportation modes while maintaining focus on 
     * minimizing carbon footprint within those constraints.
     * 
     * Validates Requirements 4.1, 4.2:
     * - 4.1: When accessibility preferences are set, the Route_Planner SHALL filter 
     *        Route_Alternatives to include only accessible Transportation_Modes
     * - 4.2: When calculating accessible routes, the Route_Planner SHALL maintain focus 
     *        on minimizing Carbon_Footprint within accessibility constraints
     */
    fc.assert(
      fc.property(
        fc.array(routeAlternativeArbitrary, { minLength: 1, maxLength: 10 }),
        userPreferencesArbitrary,
        (routes: RouteAlternative[], preferences: UserPreferences) => {
          // Filter routes using the accessibility filter service
          const result = accessibilityFilter.filterAccessibleRoutes(routes, preferences);
          
          // If no accessibility requirements, all routes should be returned (no filtering)
          if (!preferences.accessibilityNeeds || preferences.accessibilityNeeds.length === 0) {
            expect(result.routes).toHaveLength(routes.length);
            expect(result.fallbackUsed).toBe(false);
            return;
          }
          
          // Get required accessibility needs
          const requiredNeeds = preferences.accessibilityNeeds.filter(need => need.required);
          
          // If no required accessibility needs, all routes should be returned
          if (requiredNeeds.length === 0) {
            expect(result.routes).toHaveLength(routes.length);
            expect(result.fallbackUsed).toBe(false);
            return;
          }
          
          // Requirement 4.1: Only accessible transportation modes should be included
          result.routes.forEach(route => {
            const assessment = result.accessibilityAssessments.get(route.id);
            expect(assessment).toBeDefined();
            
            // If not using fallback, routes should be at least partially compliant
            if (!result.fallbackUsed) {
              expect(assessment!.isPartiallyCompliant).toBe(true);
            }
            
            // Check that route's transportation modes support required accessibility features
            const supportedFeatureTypes = new Set<string>();
            route.transportationModes.forEach(mode => {
              mode.accessibilityFeatures
                .filter(feature => feature.supported)
                .forEach(feature => supportedFeatureTypes.add(feature.type));
            });
            
            // For non-fallback routes, at least some required needs should be met
            if (!result.fallbackUsed) {
              const metRequirements = requiredNeeds.filter(need => 
                supportedFeatureTypes.has(need.type)
              );
              expect(metRequirements.length).toBeGreaterThan(0);
            }
          });
          
          // Requirement 4.2: Routes should be ordered by eco-friendliness within accessibility constraints
          if (result.routes.length > 1) {
            // Check that routes are sorted by a combination of accessibility compliance and eco-score
            for (let i = 0; i < result.routes.length - 1; i++) {
              const currentRoute = result.routes[i];
              const nextRoute = result.routes[i + 1];
              
              const currentAssessment = result.accessibilityAssessments.get(currentRoute.id)!;
              const nextAssessment = result.accessibilityAssessments.get(nextRoute.id)!;
              
              // If both routes have same compliance level, eco-score should be descending
              if (currentAssessment.isFullyCompliant === nextAssessment.isFullyCompliant) {
                // Allow for small differences in eco-scores due to floating point precision
                const ecoScoreDiff = currentRoute.ecoScore - nextRoute.ecoScore;
                expect(ecoScoreDiff).toBeGreaterThanOrEqual(-0.001);
              } else {
                // Fully compliant routes should come before partially compliant ones
                if (currentAssessment.isFullyCompliant) {
                  expect(nextAssessment.isFullyCompliant).toBe(false);
                }
              }
            }
          }
          
          // Accessibility assessments should be provided for all routes
          expect(result.accessibilityAssessments.size).toBeGreaterThanOrEqual(result.routes.length);
          
          // Each assessment should have valid compliance scores
          result.accessibilityAssessments.forEach((assessment, routeId) => {
            expect(assessment.complianceScore).toBeGreaterThanOrEqual(0);
            expect(assessment.complianceScore).toBeLessThanOrEqual(1);
            expect(typeof assessment.complianceScore).toBe('number');
            expect(isNaN(assessment.complianceScore)).toBe(false);
            
            // Compliance booleans should be consistent with score
            if (assessment.complianceScore === 1) {
              expect(assessment.isFullyCompliant).toBe(true);
              expect(assessment.isPartiallyCompliant).toBe(true);
            } else if (assessment.complianceScore > 0) {
              expect(assessment.isFullyCompliant).toBe(false);
              expect(assessment.isPartiallyCompliant).toBe(true);
            } else {
              expect(assessment.isFullyCompliant).toBe(false);
              expect(assessment.isPartiallyCompliant).toBe(false);
            }
            
            // Missing requirements should be consistent with compliance
            expect(Array.isArray(assessment.missingRequirements)).toBe(true);
            expect(Array.isArray(assessment.supportedFeatures)).toBe(true);
            
            if (assessment.isFullyCompliant) {
              expect(assessment.missingRequirements).toHaveLength(0);
            }
          });
          
          // Result should include a meaningful recommendation reason
          expect(result.recommendationReason).toBeDefined();
          expect(typeof result.recommendationReason).toBe('string');
          expect(result.recommendationReason.length).toBeGreaterThan(0);
          
          // Fallback usage should be consistent with route availability
          if (result.fallbackUsed) {
            expect(result.recommendationReason).toMatch(/fallback|alternative|no.*accessible/i);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 8 Extended: Accessibility constraint preservation', () => {
    /**
     * **Feature: eco-friendly-route-planner, Property 8: Accessibility-aware eco-optimization**
     * 
     * This extended property validates that accessibility constraints are never violated
     * when eco-optimization is applied, ensuring that accessibility takes precedence
     * over environmental considerations when there's a conflict.
     */
    fc.assert(
      fc.property(
        fc.array(routeAlternativeArbitrary, { minLength: 2, maxLength: 10 }),
        fc.array(accessibilityRequirementArbitrary.filter(req => req.required), { minLength: 1, maxLength: 3 }),
        (routes: RouteAlternative[], requiredAccessibilityNeeds: AccessibilityRequirement[]) => {
          const preferences: UserPreferences = {
            userId: 'test-user',
            maxWalkingDistance: 1.0,
            preferredTransportationModes: [],
            accessibilityNeeds: requiredAccessibilityNeeds,
            sustainabilityPriority: 'high',
            timeVsEnvironmentWeight: 0.8
          };
          
          const result = accessibilityFilter.filterAccessibleRoutes(routes, preferences, {
            strictMode: false,
            fallbackToPartial: true,
            prioritizeCompliance: true
          });
          
          // Every returned route must meet accessibility constraints (unless fallback is used)
          result.routes.forEach(route => {
            const assessment = result.accessibilityAssessments.get(route.id)!;
            
            if (!result.fallbackUsed) {
              // Non-fallback routes must be at least partially compliant
              expect(assessment.isPartiallyCompliant).toBe(true);
              expect(assessment.complianceScore).toBeGreaterThan(0);
            }
            
            // Check that the route actually supports some of the required features
            const routeSupportedFeatures = new Set<string>();
            route.transportationModes.forEach(mode => {
              mode.accessibilityFeatures
                .filter(feature => feature.supported)
                .forEach(feature => routeSupportedFeatures.add(feature.type));
            });
            
            if (!result.fallbackUsed) {
              // At least one required accessibility need should be met
              const metNeeds = requiredAccessibilityNeeds.filter(need => 
                routeSupportedFeatures.has(need.type)
              );
              expect(metNeeds.length).toBeGreaterThan(0);
            }
          });
          
          // If there are accessible routes, they should be prioritized over inaccessible ones
          if (result.routes.length > 1 && !result.fallbackUsed) {
            const assessments = result.routes.map(route => 
              result.accessibilityAssessments.get(route.id)!
            );
            
            // Routes should be grouped by compliance level, with higher compliance first
            let foundPartiallyCompliant = false;
            assessments.forEach(assessment => {
              if (assessment.isFullyCompliant) {
                // Should not find partially compliant routes after fully compliant ones
                expect(foundPartiallyCompliant).toBe(false);
              } else if (assessment.isPartiallyCompliant) {
                foundPartiallyCompliant = true;
              }
            });
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 8 Extended: Eco-optimization within accessibility constraints', () => {
    /**
     * **Feature: eco-friendly-route-planner, Property 8: Accessibility-aware eco-optimization**
     * 
     * This extended property validates that within the same accessibility compliance level,
     * routes are optimized for environmental impact (higher eco-scores preferred).
     */
    fc.assert(
      fc.property(
        fc.array(routeAlternativeArbitrary, { minLength: 3, maxLength: 8 }),
        userPreferencesArbitrary,
        (routes: RouteAlternative[], preferences: UserPreferences) => {
          // Ensure we have some accessibility requirements
          if (!preferences.accessibilityNeeds || preferences.accessibilityNeeds.length === 0) {
            return; // Skip this test case
          }
          
          const result = accessibilityFilter.filterAccessibleRoutes(routes, preferences, {
            prioritizeCompliance: true
          });
          
          if (result.routes.length <= 1) {
            return; // Need multiple routes to test ordering
          }
          
          // Group routes by compliance level
          const fullyCompliantRoutes: RouteAlternative[] = [];
          const partiallyCompliantRoutes: RouteAlternative[] = [];
          
          result.routes.forEach(route => {
            const assessment = result.accessibilityAssessments.get(route.id)!;
            if (assessment.isFullyCompliant) {
              fullyCompliantRoutes.push(route);
            } else if (assessment.isPartiallyCompliant) {
              partiallyCompliantRoutes.push(route);
            }
          });
          
          // Within each compliance group, routes should be ordered by eco-score (descending)
          const checkEcoScoreOrdering = (routeGroup: RouteAlternative[]) => {
            for (let i = 0; i < routeGroup.length - 1; i++) {
              const currentEcoScore = routeGroup[i].ecoScore;
              const nextEcoScore = routeGroup[i + 1].ecoScore;
              
              // Allow for small floating point differences
              expect(currentEcoScore).toBeGreaterThanOrEqual(nextEcoScore - 0.001);
            }
          };
          
          if (fullyCompliantRoutes.length > 1) {
            checkEcoScoreOrdering(fullyCompliantRoutes);
          }
          
          if (partiallyCompliantRoutes.length > 1) {
            checkEcoScoreOrdering(partiallyCompliantRoutes);
          }
          
          // Fully compliant routes should appear before partially compliant ones
          const firstPartialIndex = result.routes.findIndex(route => {
            const assessment = result.accessibilityAssessments.get(route.id)!;
            return assessment.isPartiallyCompliant && !assessment.isFullyCompliant;
          });
          
          const lastFullIndex = result.routes.map((route, index) => {
            const assessment = result.accessibilityAssessments.get(route.id)!;
            return assessment.isFullyCompliant ? index : -1;
          }).reduce((max, current) => Math.max(max, current), -1);
          
          if (firstPartialIndex !== -1 && lastFullIndex !== -1) {
            expect(lastFullIndex).toBeLessThan(firstPartialIndex);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});