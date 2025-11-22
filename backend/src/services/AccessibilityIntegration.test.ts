import { describe, it, expect, beforeEach } from 'vitest';
import { RoutePlannerService } from './RoutePlannerService';
import { UserTrackerService } from './UserTrackerService';
import { Location } from '../models/Location';
import { AccessibilityRequirement } from '../models/common';

describe('Accessibility Integration Tests', () => {
  let routePlanner: RoutePlannerService;
  let userTracker: UserTrackerService;

  beforeEach(() => {
    routePlanner = new RoutePlannerService();
    userTracker = new UserTrackerService();
  });

  it('should filter routes based on accessibility requirements', async () => {
    const origin: Location = {
      latitude: 40.7128,
      longitude: -74.0060,
      address: 'New York, NY'
    };

    const destination: Location = {
      latitude: 40.7589,
      longitude: -73.9851,
      address: 'Central Park, NY'
    };

    // Get user preferences with wheelchair accessibility requirement
    const preferences = await userTracker.getUserPreferences('test-user');
    await userTracker.updateAccessibilityNeeds('test-user', [
      { type: 'wheelchair_accessible', required: true }
    ]);

    const updatedPreferences = await userTracker.getUserPreferences('test-user');

    // Calculate routes with accessibility filtering
    const routes = await routePlanner.calculateRoutes(origin, destination, updatedPreferences);

    // All returned routes should be wheelchair accessible
    routes.forEach(route => {
      const hasWheelchairAccess = route.transportationModes.some(mode =>
        mode.accessibilityFeatures.some(feature =>
          feature.type === 'wheelchair_accessible' && feature.supported
        )
      );
      expect(hasWheelchairAccess).toBe(true);
    });

    // Should not include cycling routes (not wheelchair accessible)
    const hasCyclingRoute = routes.some(route =>
      route.transportationModes.some(mode => mode.type === 'cycling')
    );
    expect(hasCyclingRoute).toBe(false);
  });

  it('should provide fallback routes when no accessible options exist', async () => {
    const origin: Location = {
      latitude: 40.7128,
      longitude: -74.0060,
      address: 'New York, NY'
    };

    const destination: Location = {
      latitude: 40.7589,
      longitude: -73.9851,
      address: 'Central Park, NY'
    };

    // Set impossible accessibility requirements
    await userTracker.updateAccessibilityNeeds('test-user', [
      { type: 'nonexistent_feature', required: true }
    ]);

    const preferences = await userTracker.getUserPreferences('test-user');

    // Should still return routes (fallback behavior)
    const routes = await routePlanner.calculateRoutes(origin, destination, preferences);
    
    expect(routes.length).toBeGreaterThan(0);
    // Routes should be ordered by eco-score as fallback
    for (let i = 1; i < routes.length; i++) {
      expect(routes[i-1].ecoScore).toBeGreaterThanOrEqual(routes[i].ecoScore);
    }
  });

  it('should handle multiple accessibility requirements', async () => {
    const origin: Location = {
      latitude: 40.7128,
      longitude: -74.0060,
      address: 'New York, NY'
    };

    const destination: Location = {
      latitude: 40.7589,
      longitude: -73.9851,
      address: 'Central Park, NY'
    };

    // Set multiple accessibility requirements
    await userTracker.updateAccessibilityNeeds('test-user', [
      { type: 'wheelchair_accessible', required: true },
      { type: 'visual_impairment', required: true }
    ]);

    const preferences = await userTracker.getUserPreferences('test-user');
    const routes = await routePlanner.calculateRoutes(origin, destination, preferences);

    // All returned routes should support both requirements
    routes.forEach(route => {
      const supportedFeatures = new Set(
        route.transportationModes.flatMap(mode =>
          mode.accessibilityFeatures
            .filter(f => f.supported)
            .map(f => f.type)
        )
      );

      expect(supportedFeatures.has('wheelchair_accessible')).toBe(true);
      expect(supportedFeatures.has('visual_impairment')).toBe(true);
    });
  });

  it('should validate accessibility requirements', async () => {
    const invalidRequirements: AccessibilityRequirement[] = [
      { type: '', required: true }, // Empty type
      { type: 'wheelchair_accessible', required: true }, // Valid
      { type: 'visual_impairment', required: false } // Valid
    ];

    await userTracker.updateAccessibilityNeeds('test-user', invalidRequirements);
    const preferences = await userTracker.getUserPreferences('test-user');

    // Should filter out invalid requirements
    expect(preferences.accessibilityNeeds.length).toBe(2);
    expect(preferences.accessibilityNeeds.every(req => req.type !== '')).toBe(true);
  });
});