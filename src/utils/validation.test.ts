import { describe, it, expect } from 'vitest';
import { validateLocation, validateUserPreferences, validateTransportationMode } from './validation';
import { Location } from '../models/Location';
import { UserPreferences } from '../models/UserPreferences';
import { TransportationMode } from '../models/TransportationMode';

describe('Location Validation', () => {
  it('should validate correct location', () => {
    const location: Location = {
      latitude: 37.7749,
      longitude: -122.4194,
      address: '123 Main St',
      city: 'San Francisco',
      country: 'USA'
    };

    const result = validateLocation(location);
    expect(result.isValid).toBe(true);
    expect(result.normalizedLocation).toBeDefined();
    expect(result.normalizedLocation?.latitude).toBe(37.7749);
  });

  it('should reject invalid latitude', () => {
    const location: Location = {
      latitude: 91, // Invalid: > 90
      longitude: -122.4194
    };

    const result = validateLocation(location);
    expect(result.isValid).toBe(false);
    expect(result.errorMessage).toContain('Latitude must be a number between -90 and 90');
  });

  it('should reject invalid longitude', () => {
    const location: Location = {
      latitude: 37.7749,
      longitude: 181 // Invalid: > 180
    };

    const result = validateLocation(location);
    expect(result.isValid).toBe(false);
    expect(result.errorMessage).toContain('Longitude must be a number between -180 and 180');
  });

  it('should reject null location', () => {
    const result = validateLocation(null as any);
    expect(result.isValid).toBe(false);
    expect(result.errorMessage).toBe('Location is required');
  });
});

describe('User Preferences Validation', () => {
  it('should validate correct user preferences', () => {
    const preferences: UserPreferences = {
      userId: 'user123',
      maxWalkingDistance: 1.5,
      preferredTransportationModes: [],
      accessibilityNeeds: [],
      sustainabilityPriority: 'high',
      timeVsEnvironmentWeight: 0.7
    };

    const result = validateUserPreferences(preferences);
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should reject empty userId', () => {
    const preferences: UserPreferences = {
      userId: '',
      maxWalkingDistance: 1.5,
      preferredTransportationModes: [],
      accessibilityNeeds: [],
      sustainabilityPriority: 'high',
      timeVsEnvironmentWeight: 0.7
    };

    const result = validateUserPreferences(preferences);
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('User ID is required and must be a non-empty string');
  });

  it('should reject negative walking distance', () => {
    const preferences: UserPreferences = {
      userId: 'user123',
      maxWalkingDistance: -1,
      preferredTransportationModes: [],
      accessibilityNeeds: [],
      sustainabilityPriority: 'high',
      timeVsEnvironmentWeight: 0.7
    };

    const result = validateUserPreferences(preferences);
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Maximum walking distance must be a non-negative number');
  });

  it('should reject invalid sustainability priority', () => {
    const preferences: UserPreferences = {
      userId: 'user123',
      maxWalkingDistance: 1.5,
      preferredTransportationModes: [],
      accessibilityNeeds: [],
      sustainabilityPriority: 'invalid' as any,
      timeVsEnvironmentWeight: 0.7
    };

    const result = validateUserPreferences(preferences);
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Sustainability priority must be one of: high, medium, low');
  });
});

describe('Transportation Mode Validation', () => {
  it('should validate correct transportation mode', () => {
    const mode: TransportationMode = {
      type: 'walking',
      emissionFactor: 0,
      accessibilityFeatures: [],
      availability: { available: true }
    };

    const result = validateTransportationMode(mode);
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should reject invalid transportation type', () => {
    const mode: TransportationMode = {
      type: 'invalid' as any,
      emissionFactor: 0,
      accessibilityFeatures: [],
      availability: { available: true }
    };

    const result = validateTransportationMode(mode);
    expect(result.isValid).toBe(false);
    expect(result.errors[0]).toContain('Transportation type must be one of:');
  });

  it('should reject negative emission factor', () => {
    const mode: TransportationMode = {
      type: 'walking',
      emissionFactor: -1,
      accessibilityFeatures: [],
      availability: { available: true }
    };

    const result = validateTransportationMode(mode);
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Emission factor must be a non-negative number');
  });
});