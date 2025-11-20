import { describe, it, expect, beforeEach } from 'vitest';
import { RealtimeUpdaterService } from './RealtimeUpdaterService';
import { RouteAlternative } from '../models/RouteAlternative';
import { TransportationDisruption } from './interfaces/IRealtimeUpdater';
import { Location } from '../models/Location';
import { TransportationMode } from '../models/TransportationMode';
import { CarbonFootprint } from '../models/CarbonFootprint';

describe('RealtimeUpdaterService', () => {
  let service: RealtimeUpdaterService;
  let mockRoute: RouteAlternative;

  beforeEach(() => {
    service = new RealtimeUpdaterService();
    
    const mockLocation: Location = {
      latitude: 40.7128,
      longitude: -74.0060,
      address: 'New York, NY',
      city: 'New York',
      country: 'USA'
    };

    const mockTransportationMode: TransportationMode = {
      type: 'public_transit',
      subtype: 'bus',
      emissionFactor: 0.2,
      accessibilityFeatures: [],
      availability: 'available'
    };

    const mockCarbonFootprint: CarbonFootprint = {
      totalEmissions: 2.0,
      emissionsBySegment: [],
      methodology: 'EPA standards',
      dataSources: ['EPA'],
      calculationTimestamp: new Date()
    };

    mockRoute = {
      id: 'test-route-1',
      origin: mockLocation,
      destination: { ...mockLocation, latitude: 40.7589 },
      transportationModes: [mockTransportationMode],
      segments: [{
        id: 'segment-1',
        startLocation: mockLocation,
        endLocation: { ...mockLocation, latitude: 40.7589 },
        transportationMode: mockTransportationMode,
        distance: 5.0,
        estimatedTime: 30,
        instructions: 'Take bus to destination'
      }],
      totalDistance: 5.0,
      estimatedTime: 30,
      carbonFootprint: mockCarbonFootprint,
      ecoScore: 75,
      accessibilityCompliant: true,
      cost: 2.50
    };
  });

  describe('subscribeToUpdates', () => {
    it('should create a subscription for provided routes', async () => {
      const subscription = await service.subscribeToUpdates([mockRoute]);
      
      expect(subscription).toBeDefined();
      expect(subscription.id).toBeDefined();
      expect(subscription.routeIds).toContain(mockRoute.id);
      expect(subscription.isActive).toBe(true);
      expect(typeof subscription.callback).toBe('function');
    });

    it('should throw error when no routes provided', async () => {
      await expect(service.subscribeToUpdates([])).rejects.toThrow('No routes provided for subscription');
    });
  });

  describe('handleDisruption', () => {
    it('should handle transportation disruption and return updates', async () => {
      // First subscribe to get the route in cache
      await service.subscribeToUpdates([mockRoute]);

      const disruption: TransportationDisruption = {
        id: 'disruption-1',
        type: 'service_interruption',
        affectedRoutes: [mockRoute.id],
        severity: 'medium',
        startTime: new Date(),
        description: 'Bus service temporarily suspended',
        alternativeOptions: ['walking', 'cycling']
      };

      const updates = await service.handleDisruption(disruption);
      
      expect(updates).toBeDefined();
      expect(updates.length).toBeGreaterThan(0);
      expect(updates[0].routeId).toBe(mockRoute.id);
      expect(updates[0].updateType).toBe('disruption');
      expect(updates[0].severity).toBe('medium');
      expect(updates[0].message).toContain('Bus service temporarily suspended');
    });

    it('should throw error when invalid disruption provided', async () => {
      const invalidDisruption = {
        id: 'invalid',
        type: 'service_interruption',
        affectedRoutes: [],
        severity: 'low',
        startTime: new Date(),
        description: 'Test',
        alternativeOptions: []
      } as TransportationDisruption;

      await expect(service.handleDisruption(invalidDisruption)).rejects.toThrow('Invalid disruption data provided');
    });
  });

  describe('refreshRouteData', () => {
    it('should refresh route data with real-time information', async () => {
      // First subscribe to get the route in cache
      await service.subscribeToUpdates([mockRoute]);

      const refreshedRoute = await service.refreshRouteData(mockRoute.id);
      
      expect(refreshedRoute).toBeDefined();
      expect(refreshedRoute.id).toBe(mockRoute.id);
      expect(refreshedRoute.origin).toEqual(mockRoute.origin);
      expect(refreshedRoute.destination).toEqual(mockRoute.destination);
    });

    it('should throw error when route not found in cache', async () => {
      await expect(service.refreshRouteData('non-existent-route')).rejects.toThrow('Route non-existent-route not found in cache');
    });

    it('should throw error when invalid route ID provided', async () => {
      await expect(service.refreshRouteData('')).rejects.toThrow('Invalid route ID provided');
    });
  });

  describe('subscription management', () => {
    it('should track active subscriptions', async () => {
      const subscription = await service.subscribeToUpdates([mockRoute]);
      
      const activeSubscriptions = service.getActiveSubscriptions();
      expect(activeSubscriptions).toHaveLength(1);
      expect(activeSubscriptions[0].id).toBe(subscription.id);
    });

    it('should remove subscription when unsubscribed', async () => {
      const subscription = await service.subscribeToUpdates([mockRoute]);
      
      await service.unsubscribe(subscription.id);
      
      const activeSubscriptions = service.getActiveSubscriptions();
      expect(activeSubscriptions).toHaveLength(0);
    });
  });
});