import { describe, it, expect } from 'vitest';
import { 
  transformLocation, 
  transformTransportationMode, 
  transformRouteAlternative,
  ExternalLocationResponse,
  ExternalRouteResponse
} from './transformers';
import { CarbonFootprint } from '../models/CarbonFootprint';

describe('Location Transformation', () => {
  it('should transform external location with lat/lng format', () => {
    const external: ExternalLocationResponse = {
      lat: 37.7749,
      lng: -122.4194,
      formatted_address: '123 Main St, San Francisco, CA',
      city: 'San Francisco',
      country: 'USA'
    };

    const result = transformLocation(external);
    expect(result.latitude).toBe(37.7749);
    expect(result.longitude).toBe(-122.4194);
    expect(result.address).toBe('123 Main St, San Francisco, CA');
    expect(result.city).toBe('San Francisco');
    expect(result.country).toBe('USA');
  });

  it('should transform external location with latitude/longitude format', () => {
    const external: ExternalLocationResponse = {
      latitude: 40.7128,
      longitude: -74.0060,
      address: '456 Broadway, New York, NY'
    };

    const result = transformLocation(external);
    expect(result.latitude).toBe(40.7128);
    expect(result.longitude).toBe(-74.0060);
    expect(result.address).toBe('456 Broadway, New York, NY');
  });

  it('should throw error for missing coordinates', () => {
    const external: ExternalLocationResponse = {
      formatted_address: '123 Main St'
    };

    expect(() => transformLocation(external)).toThrow('Invalid location data: missing coordinates');
  });
});

describe('Transportation Mode Transformation', () => {
  it('should transform walking mode', () => {
    const result = transformTransportationMode('walking');
    expect(result.type).toBe('walking');
    expect(result.emissionFactor).toBe(0);
    expect(result.availability).toBe('available');
  });

  it('should transform cycling mode', () => {
    const result = transformTransportationMode('bicycle');
    expect(result.type).toBe('cycling');
    expect(result.emissionFactor).toBe(0);
  });

  it('should transform public transit with subtype', () => {
    const result = transformTransportationMode('bus');
    expect(result.type).toBe('public_transit');
    expect(result.subtype).toBe('bus');
    expect(result.emissionFactor).toBe(0.15);
  });

  it('should transform driving mode', () => {
    const result = transformTransportationMode('driving');
    expect(result.type).toBe('conventional_vehicle');
    expect(result.emissionFactor).toBe(0.404);
  });

  it('should handle unknown mode as conventional vehicle', () => {
    const result = transformTransportationMode('unknown_mode');
    expect(result.type).toBe('conventional_vehicle');
    expect(result.emissionFactor).toBe(0.404);
  });
});

describe('Route Alternative Transformation', () => {
  it('should transform complete external route', () => {
    const externalRoute: ExternalRouteResponse = {
      route_id: 'route123',
      origin: { lat: 37.7749, lng: -122.4194 },
      destination: { lat: 37.7849, lng: -122.4094 },
      legs: [
        {
          start_location: { lat: 37.7749, lng: -122.4194 },
          end_location: { lat: 37.7849, lng: -122.4094 },
          distance: { value: 1000 },
          duration: { value: 600 },
          travel_mode: 'walking'
        }
      ],
      total_distance: 1000,
      total_time: 600
    };

    const carbonFootprint: CarbonFootprint = {
      totalEmissions: 0,
      emissionsBySegment: [],
      methodology: 'test',
      dataSources: ['test'],
      calculationTimestamp: new Date()
    };

    const result = transformRouteAlternative(externalRoute, carbonFootprint, 100);
    
    expect(result.id).toBe('route123');
    expect(result.origin.latitude).toBe(37.7749);
    expect(result.destination.latitude).toBe(37.7849);
    expect(result.segments).toHaveLength(1);
    expect(result.segments[0].transportationMode.type).toBe('walking');
    expect(result.totalDistance).toBe(1000);
    expect(result.estimatedTime).toBe(600);
    expect(result.ecoScore).toBe(100);
  });

  it('should throw error for missing origin', () => {
    const externalRoute: ExternalRouteResponse = {
      destination: { lat: 37.7849, lng: -122.4094 }
    };

    const carbonFootprint: CarbonFootprint = {
      totalEmissions: 0,
      emissionsBySegment: [],
      methodology: 'test',
      dataSources: ['test'],
      calculationTimestamp: new Date()
    };

    expect(() => transformRouteAlternative(externalRoute, carbonFootprint, 100))
      .toThrow('Invalid route data: missing origin or destination');
  });
});