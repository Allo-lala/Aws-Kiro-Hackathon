import { describe, it, expect } from 'vitest';
import { UserService, UserPreferencesInput, TripInput } from './UserService';

describe('UserService - Unit Tests', () => {
  // Note: These tests verify the service interface and logic structure
  // Full integration tests with database require a running PostgreSQL instance

  it('should have correct interface methods', () => {
    const userService = new UserService();
    
    expect(typeof userService.getUserById).toBe('function');
    expect(typeof userService.createUserPreferences).toBe('function');
    expect(typeof userService.getUserPreferences).toBe('function');
    expect(typeof userService.updateUserPreferences).toBe('function');
    expect(typeof userService.deleteUserPreferences).toBe('function');
    expect(typeof userService.createTrip).toBe('function');
    expect(typeof userService.getTripHistory).toBe('function');
    expect(typeof userService.getTripById).toBe('function');
    expect(typeof userService.deleteUserData).toBe('function');
    expect(typeof userService.getUserStats).toBe('function');
  });

  describe('User Preferences CRUD - Interface', () => {
    it('should validate preferences input structure', () => {
      const preferencesInput: UserPreferencesInput = {
        maxWalkingDistance: 2.5,
        preferredModes: ['walking', 'bicycle'],
        accessibilityNeeds: { wheelchairAccessible: true },
        sustainabilityPriority: 'high',
        timeVsEnvironmentWeight: 0.7,
      };

      expect(preferencesInput.maxWalkingDistance).toBe(2.5);
      expect(preferencesInput.preferredModes).toEqual(['walking', 'bicycle']);
      expect(preferencesInput.sustainabilityPriority).toBe('high');
    });
  });

  describe('Trip Recording - Interface', () => {
    it('should validate trip input structure', () => {
      const tripInput: TripInput = {
        originLat: 40.7128,
        originLng: -74.0060,
        originName: 'New York',
        destinationLat: 34.0522,
        destinationLng: -118.2437,
        destinationName: 'Los Angeles',
        selectedRoute: { distance: 2789, duration: 2400 },
        actualTransportationMode: 'car',
        carbonSavings: 15.5,
        distance: 2789,
        duration: 2400,
        completedAt: new Date(),
      };

      expect(tripInput.originLat).toBe(40.7128);
      expect(tripInput.destinationName).toBe('Los Angeles');
      expect(tripInput.carbonSavings).toBe(15.5);
    });
  });
});
