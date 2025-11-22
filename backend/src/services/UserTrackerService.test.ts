import { describe, it, expect, beforeEach } from 'vitest';
import { UserTrackerService } from './UserTrackerService';
import { RouteAlternative } from '../models/RouteAlternative';
import { TransportationMode } from '../models/TransportationMode';
import { Location } from '../models/Location';

describe('UserTrackerService', () => {
  let userTracker: UserTrackerService;
  let mockRoute: RouteAlternative;
  let mockWalkingMode: TransportationMode;
  let mockCarMode: TransportationMode;

  beforeEach(() => {
    userTracker = new UserTrackerService();
    
    const mockLocation: Location = {
      latitude: 40.7128,
      longitude: -74.0060,
      address: '123 Test St',
      city: 'New York',
      country: 'USA'
    };

    mockWalkingMode = {
      type: 'walking',
      emissionFactor: 0,
      accessibilityFeatures: [],
      availability: 'available'
    };

    mockCarMode = {
      type: 'conventional_vehicle',
      emissionFactor: 0.404,
      accessibilityFeatures: [],
      availability: 'available'
    };

    mockRoute = {
      id: 'test-route-1',
      origin: mockLocation,
      destination: { ...mockLocation, latitude: 40.7589 },
      transportationModes: [mockWalkingMode],
      segments: [{
        id: 'segment-1',
        startLocation: mockLocation,
        endLocation: { ...mockLocation, latitude: 40.7589 },
        transportationMode: mockWalkingMode,
        distance: 2.5,
        estimatedTime: 30
      }],
      totalDistance: 2.5,
      estimatedTime: 30,
      carbonFootprint: {
        totalEmissions: 0,
        emissionsBySegment: [{
          segmentId: 'segment-1',
          distance: 2.5,
          transportationMode: 'walking',
          emissions: 0
        }],
        methodology: 'EPA 2023',
        dataSources: ['EPA eGRID'],
        calculationTimestamp: new Date()
      },
      ecoScore: 100,
      accessibilityCompliant: true
    };
  });

  describe('recordTrip', () => {
    it('should record a trip and calculate savings correctly', async () => {
      const userId = 'user-123';
      
      const tripRecord = await userTracker.recordTrip(userId, mockRoute, mockWalkingMode);
      
      expect(tripRecord.userId).toBe(userId);
      expect(tripRecord.routeId).toBe(mockRoute.id);
      expect(tripRecord.actualTransportationMode).toBe(mockWalkingMode);
      expect(tripRecord.actualCarbonFootprint).toBe(0); // Walking has 0 emissions
      expect(tripRecord.savedEmissions).toBeGreaterThan(0); // Should save emissions vs car
      expect(tripRecord.tripDate).toBeInstanceOf(Date);
    });

    it('should calculate zero savings when using high-emission transportation', async () => {
      const userId = 'user-123';
      
      const tripRecord = await userTracker.recordTrip(userId, mockRoute, mockCarMode);
      
      expect(tripRecord.actualCarbonFootprint).toBeGreaterThan(0);
      expect(tripRecord.savedEmissions).toBe(0); // No savings when using conventional car
    });
  });

  describe('calculateSavings', () => {
    it('should calculate cumulative savings correctly', async () => {
      const userId = 'user-123';
      const now = new Date();
      const timeframe = {
        start: new Date(now.getTime() - 24 * 60 * 60 * 1000), // 1 day ago
        end: new Date(now.getTime() + 24 * 60 * 60 * 1000)    // 1 day from now
      };

      // Record multiple trips
      await userTracker.recordTrip(userId, mockRoute, mockWalkingMode);
      await userTracker.recordTrip(userId, mockRoute, mockWalkingMode);
      
      const metrics = await userTracker.calculateSavings(userId, timeframe);
      
      expect(metrics.totalTrips).toBe(2);
      expect(metrics.totalSavedEmissions).toBeGreaterThan(0);
      expect(metrics.averageSavingsPerTrip).toBeGreaterThan(0);
      expect(metrics.timeframe).toEqual(timeframe);
      expect(metrics.milestones).toBeDefined();
    });

    it('should return zero metrics for user with no trips', async () => {
      const userId = 'new-user';
      const now = new Date();
      const timeframe = {
        start: new Date(now.getTime() - 24 * 60 * 60 * 1000),
        end: new Date(now.getTime() + 24 * 60 * 60 * 1000)
      };
      
      const metrics = await userTracker.calculateSavings(userId, timeframe);
      
      expect(metrics.totalTrips).toBe(0);
      expect(metrics.totalSavedEmissions).toBe(0);
      expect(metrics.averageSavingsPerTrip).toBe(0);
    });
  });

  describe('getUserPreferences', () => {
    it('should return default preferences for new user', async () => {
      const userId = 'new-user';
      
      const preferences = await userTracker.getUserPreferences(userId);
      
      expect(preferences.userId).toBe(userId);
      expect(preferences.maxWalkingDistance).toBe(1.0);
      expect(preferences.sustainabilityPriority).toBe('medium');
      expect(preferences.timeVsEnvironmentWeight).toBe(0.7);
    });
  });

  describe('updateAccessibilityNeeds', () => {
    it('should update user accessibility preferences', async () => {
      const userId = 'user-123';
      const accessibilityNeeds = [
        { type: 'wheelchair_accessible', required: true, description: 'wheelchair_accessible support' }
      ];
      
      await userTracker.updateAccessibilityNeeds(userId, accessibilityNeeds);
      
      const preferences = await userTracker.getUserPreferences(userId);
      expect(preferences.accessibilityNeeds).toEqual(accessibilityNeeds);
    });
  });
});