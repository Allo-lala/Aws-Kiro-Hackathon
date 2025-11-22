import { describe, it, expect, beforeEach } from 'vitest';
import { AccessibilityFilterService } from './AccessibilityFilterService';
import { RouteAlternative } from '../models/RouteAlternative';
import { UserPreferences } from '../models/UserPreferences';
import { TransportationMode } from '../models/TransportationMode';
import { AccessibilityRequirement, AccessibilityFeature } from '../models/common';

describe('AccessibilityFilterService', () => {
  let service: AccessibilityFilterService;
  let mockRoutes: RouteAlternative[];
  let mockPreferences: UserPreferences;

  beforeEach(() => {
    service = new AccessibilityFilterService();

    // Create mock transportation modes with different accessibility features
    const walkingMode: TransportationMode = {
      type: 'walking',
      emissionFactor: 0,
      accessibilityFeatures: [
        { type: 'wheelchair_accessible', description: 'Sidewalk accessibility', supported: true },
        { type: 'visual_impairment', description: 'Audio signals', supported: true }
      ],
      availability: 'available'
    };

    const cyclingMode: TransportationMode = {
      type: 'cycling',
      emissionFactor: 0,
      accessibilityFeatures: [
        { type: 'wheelchair_accessible', description: 'Not wheelchair accessible', supported: false }
      ],
      availability: 'available'
    };

    const transitMode: TransportationMode = {
      type: 'public_transit',
      emissionFactor: 0.2,
      accessibilityFeatures: [
        { type: 'wheelchair_accessible', description: 'ADA compliant', supported: true },
        { type: 'visual_impairment', description: 'Audio announcements', supported: true },
        { type: 'hearing_impairment', description: 'Visual displays', supported: true }
      ],
      availability: 'available'
    };

    // Create mock routes
    mockRoutes = [
      {
        id: 'route-walking',
        origin: { latitude: 40.7128, longitude: -74.0060 },
        destination: { latitude: 40.7589, longitude: -73.9851 },
        transportationModes: [walkingMode],
        segments: [],
        totalDistance: 2.5,
        estimatedTime: 50,
        carbonFootprint: {
          totalEmissions: 0,
          emissionsBySegment: [],
          methodology: 'EPA',
          dataSources: ['EPA'],
          calculationTimestamp: new Date()
        },
        ecoScore: 100,
        accessibilityCompliant: true
      },
      {
        id: 'route-cycling',
        origin: { latitude: 40.7128, longitude: -74.0060 },
        destination: { latitude: 40.7589, longitude: -73.9851 },
        transportationModes: [cyclingMode],
        segments: [],
        totalDistance: 2.5,
        estimatedTime: 12,
        carbonFootprint: {
          totalEmissions: 0,
          emissionsBySegment: [],
          methodology: 'EPA',
          dataSources: ['EPA'],
          calculationTimestamp: new Date()
        },
        ecoScore: 95,
        accessibilityCompliant: false
      },
      {
        id: 'route-transit',
        origin: { latitude: 40.7128, longitude: -74.0060 },
        destination: { latitude: 40.7589, longitude: -73.9851 },
        transportationModes: [transitMode],
        segments: [],
        totalDistance: 2.5,
        estimatedTime: 25,
        carbonFootprint: {
          totalEmissions: 0.5,
          emissionsBySegment: [],
          methodology: 'EPA',
          dataSources: ['EPA'],
          calculationTimestamp: new Date()
        },
        ecoScore: 85,
        accessibilityCompliant: true
      }
    ];

    mockPreferences = {
      userId: 'test-user',
      maxWalkingDistance: 1.0,
      preferredTransportationModes: [],
      accessibilityNeeds: [],
      sustainabilityPriority: 'medium',
      timeVsEnvironmentWeight: 0.7
    };
  });

  describe('filterAccessibleRoutes', () => {
    it('should return all routes when no accessibility requirements', () => {
      const result = service.filterAccessibleRoutes(mockRoutes, mockPreferences);
      
      expect(result.routes).toHaveLength(3);
      expect(result.fallbackUsed).toBe(false);
      expect(result.recommendationReason).toContain('No accessibility requirements');
    });

    it('should filter routes based on wheelchair accessibility requirement', () => {
      mockPreferences.accessibilityNeeds = [
        { type: 'wheelchair_accessible', required: true }
      ];

      const result = service.filterAccessibleRoutes(mockRoutes, mockPreferences);
      
      expect(result.routes).toHaveLength(2); // walking and transit
      expect(result.routes.every(r => r.id !== 'route-cycling')).toBe(true);
      expect(result.fallbackUsed).toBe(false);
    });

    it('should use fallback when no fully accessible routes exist', () => {
      // Create requirements that no route satisfies at all (not even partially)
      mockPreferences.accessibilityNeeds = [
        { type: 'nonexistent_feature_1', required: true }, // This feature doesn't exist on any route
        { type: 'nonexistent_feature_2', required: true } // This feature doesn't exist on any route
      ];

      const result = service.filterAccessibleRoutes(mockRoutes, mockPreferences);
      
      expect(result.fallbackUsed).toBe(true);
      expect(result.recommendationReason).toContain('No fully accessible routes available');
      expect(result.routes.length).toBeGreaterThan(0);
    });

    it('should prioritize compliance over eco-score when specified', () => {
      mockPreferences.accessibilityNeeds = [
        { type: 'wheelchair_accessible', required: true }
      ];

      const result = service.filterAccessibleRoutes(mockRoutes, mockPreferences, {
        prioritizeCompliance: true
      });
      
      // Should include both walking and transit, with walking first (higher eco-score)
      expect(result.routes).toHaveLength(2);
      expect(result.routes[0].ecoScore).toBeGreaterThanOrEqual(result.routes[1].ecoScore);
    });
  });

  describe('assessRouteAccessibility', () => {
    it('should correctly assess fully compliant route', () => {
      const requirements: AccessibilityRequirement[] = [
        { type: 'wheelchair_accessible', required: true },
        { type: 'visual_impairment', required: true }
      ];

      const assessment = service.assessRouteAccessibility(mockRoutes[0], requirements); // walking route
      
      expect(assessment.isFullyCompliant).toBe(true);
      expect(assessment.complianceScore).toBe(1.0);
      expect(assessment.missingRequirements).toHaveLength(0);
    });

    it('should correctly assess partially compliant route', () => {
      const requirements: AccessibilityRequirement[] = [
        { type: 'wheelchair_accessible', required: true },
        { type: 'hearing_impairment', required: true }
      ];

      const assessment = service.assessRouteAccessibility(mockRoutes[0], requirements); // walking route
      
      expect(assessment.isFullyCompliant).toBe(false);
      expect(assessment.isPartiallyCompliant).toBe(true);
      expect(assessment.complianceScore).toBe(0.5); // 1 out of 2 requirements met
      expect(assessment.missingRequirements).toHaveLength(1);
      expect(assessment.missingRequirements[0].type).toBe('hearing_impairment');
    });

    it('should handle non-compliant route', () => {
      const requirements: AccessibilityRequirement[] = [
        { type: 'wheelchair_accessible', required: true }
      ];

      const assessment = service.assessRouteAccessibility(mockRoutes[1], requirements); // cycling route
      
      expect(assessment.isFullyCompliant).toBe(false);
      expect(assessment.isPartiallyCompliant).toBe(false);
      expect(assessment.complianceScore).toBe(0);
      expect(assessment.missingRequirements).toHaveLength(1);
    });
  });

  describe('updateAccessibilityPreferences', () => {
    it('should validate and update accessibility requirements', () => {
      const newRequirements: AccessibilityRequirement[] = [
        { type: 'wheelchair_accessible', required: true },
        { type: 'invalid_type', required: true }, // Now kept for fallback testing
        { type: 'visual_impairment', required: false }
      ];

      const updated = service.updateAccessibilityPreferences(mockPreferences, newRequirements);
      
      expect(updated.accessibilityNeeds).toHaveLength(3); // All requirements kept
      expect(updated.accessibilityNeeds.some(req => req.type === 'wheelchair_accessible')).toBe(true);
      expect(updated.accessibilityNeeds.some(req => req.type === 'visual_impairment')).toBe(true);
      expect(updated.accessibilityNeeds.some(req => req.type === 'invalid_type')).toBe(true);
    });

    it('should preserve other user preferences', () => {
      const newRequirements: AccessibilityRequirement[] = [
        { type: 'wheelchair_accessible', required: true }
      ];

      const updated = service.updateAccessibilityPreferences(mockPreferences, newRequirements);
      
      expect(updated.userId).toBe(mockPreferences.userId);
      expect(updated.sustainabilityPriority).toBe(mockPreferences.sustainabilityPriority);
      expect(updated.maxWalkingDistance).toBe(mockPreferences.maxWalkingDistance);
    });
  });

  describe('checkModeAccessibility', () => {
    it('should correctly check mode accessibility against requirements', () => {
      const requirements: AccessibilityRequirement[] = [
        { type: 'wheelchair_accessible', required: true }
      ];

      const modes = mockRoutes.map(route => route.transportationModes[0]);
      const results = service.checkModeAccessibility(modes, requirements);
      
      expect(results.get('walking')).toBe(true);
      expect(results.get('cycling')).toBe(false);
      expect(results.get('public_transit')).toBe(true);
    });

    it('should handle multiple requirements', () => {
      const requirements: AccessibilityRequirement[] = [
        { type: 'wheelchair_accessible', required: true },
        { type: 'visual_impairment', required: true }
      ];

      const modes = mockRoutes.map(route => route.transportationModes[0]);
      const results = service.checkModeAccessibility(modes, requirements);
      
      expect(results.get('walking')).toBe(true); // supports both
      expect(results.get('cycling')).toBe(false); // supports neither
      expect(results.get('public_transit')).toBe(true); // supports both
    });
  });
});