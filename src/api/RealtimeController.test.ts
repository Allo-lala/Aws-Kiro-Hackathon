import { describe, it, expect, beforeEach } from 'vitest';
import { RealtimeController } from './RealtimeController';
import { RealtimeUpdaterService } from '../services/RealtimeUpdaterService';
import { RouteAlternative } from '../models/RouteAlternative';
import { TransportationDisruption } from '../services/interfaces/IRealtimeUpdater';
import { Location } from '../models/Location';
import { TransportationMode } from '../models/TransportationMode';
import { CarbonFootprint } from '../models/CarbonFootprint';

describe('RealtimeController', () => {
  let controller: RealtimeController;
  let service: RealtimeUpdaterService;
  let mockRoute: RouteAlternative;

  beforeEach(() => {
    service = new RealtimeUpdaterService();
    controller = new RealtimeController(service);
    
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
    it('should successfully subscribe to route updates', async () => {
      const request = {
        routes: [mockRoute],
        userId: 'user-123'
      };

      const response = await controller.subscribeToUpdates(request);
      
      expect(response).toBeDefined();
      expect(response.subscriptionId).toBeDefined();
      expect(response.routeIds).toContain(mockRoute.id);
      expect(response.message).toContain('Successfully subscribed');
    });

    it('should throw error when no routes provided', async () => {
      const request = { routes: [] };

      await expect(controller.subscribeToUpdates(request)).rejects.toThrow('No routes provided for subscription');
    });
  });

  describe('handleDisruption', () => {
    it('should handle disruption and return updates', async () => {
      // First subscribe to cache the route
      await controller.subscribeToUpdates({ routes: [mockRoute] });

      const disruption: TransportationDisruption = {
        id: 'disruption-1',
        type: 'service_interruption',
        affectedRoutes: [mockRoute.id],
        severity: 'high',
        startTime: new Date(),
        description: 'Major service disruption',
        alternativeOptions: ['walking', 'cycling']
      };

      const request = { disruption };
      const response = await controller.handleDisruption(request);
      
      expect(response).toBeDefined();
      expect(response.updates).toBeDefined();
      expect(response.affectedRoutes).toBeGreaterThanOrEqual(0);
      expect(response.message).toContain('Processed disruption');
    });

    it('should throw error when no disruption data provided', async () => {
      const request = { disruption: null as any };

      await expect(controller.handleDisruption(request)).rejects.toThrow('No disruption data provided');
    });
  });

  describe('refreshRouteData', () => {
    it('should refresh route data successfully', async () => {
      // First subscribe to cache the route
      await controller.subscribeToUpdates({ routes: [mockRoute] });

      const request = { routeId: mockRoute.id };
      const response = await controller.refreshRouteData(request);
      
      expect(response).toBeDefined();
      expect(response.route).toBeDefined();
      expect(response.route.id).toBe(mockRoute.id);
      expect(response.hasUpdates).toBeDefined();
      expect(response.message).toBeDefined();
    });

    it('should throw error when route ID is empty', async () => {
      const request = { routeId: '' };

      await expect(controller.refreshRouteData(request)).rejects.toThrow('Route ID is required');
    });
  });

  describe('getCurrentDisruptions', () => {
    it('should return current disruptions', async () => {
      const response = await controller.getCurrentDisruptions();
      
      expect(response).toBeDefined();
      expect(response.disruptions).toBeDefined();
      expect(Array.isArray(response.disruptions)).toBe(true);
      expect(response.message).toBeDefined();
    });
  });

  describe('unsubscribe', () => {
    it('should unsubscribe successfully', async () => {
      const subscribeResponse = await controller.subscribeToUpdates({ routes: [mockRoute] });
      
      const response = await controller.unsubscribe(subscribeResponse.subscriptionId);
      
      expect(response).toBeDefined();
      expect(response.message).toContain('Successfully unsubscribed');
    });

    it('should throw error when subscription ID is empty', async () => {
      await expect(controller.unsubscribe('')).rejects.toThrow('Subscription ID is required');
    });
  });
});