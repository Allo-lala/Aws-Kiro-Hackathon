/**
 * Unit tests for CarbonCalculatorService
 * Tests specific examples and integration points
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { CarbonCalculatorService } from './CarbonCalculatorService';
import { RouteAlternative } from '../models/RouteAlternative';
import { TransportationMode } from '../models/TransportationMode';
import { Location } from '../models/Location';

describe('CarbonCalculatorService', () => {
  let carbonCalculator: CarbonCalculatorService;

  beforeEach(() => {
    carbonCalculator = new CarbonCalculatorService();
  });

  describe('getEmissionFactor', () => {
    it('should return correct emission factor for walking', async () => {
      const walkingMode: TransportationMode = {
        type: 'walking',
        emissionFactor: 0.0,
        accessibilityFeatures: [],
        availability: 'available'
      };

      const emissionFactor = await carbonCalculator.getEmissionFactor(walkingMode, 'US');
      
      expect(emissionFactor.factor).toBe(0.0);
      expect(emissionFactor.transportationMode).toBe('walking');
      expect(emissionFactor.source).toContain('EPA');
    });

    it('should return correct emission factor for conventional vehicle', async () => {
      const carMode: TransportationMode = {
        type: 'conventional_vehicle',
        emissionFactor: 0.89,
        accessibilityFeatures: [],
        availability: 'available'
      };

      const emissionFactor = await carbonCalculator.getEmissionFactor(carMode, 'US');
      
      expect(emissionFactor.factor).toBe(0.89);
      expect(emissionFactor.transportationMode).toBe('conventional_vehicle');
      expect(emissionFactor.source).toContain('EPA');
    });

    it('should apply regional adjustments', async () => {
      const evMode: TransportationMode = {
        type: 'electric_vehicle',
        emissionFactor: 0.28,
        accessibilityFeatures: [],
        availability: 'available'
      };

      const usEmissionFactor = await carbonCalculator.getEmissionFactor(evMode, 'US');
      const caEmissionFactor = await carbonCalculator.getEmissionFactor(evMode, 'CA');
      
      expect(caEmissionFactor.factor).toBeLessThan(usEmissionFactor.factor);
      expect(caEmissionFactor.region).toBe('CA');
    });
  });

  describe('calculateEmissions', () => {
    it('should calculate emissions for a simple route', async () => {
      const location1: Location = { latitude: 40.7128, longitude: -74.0060, address: 'New York, NY' };
      const location2: Location = { latitude: 40.7589, longitude: -73.9851, address: 'Times Square, NY' };
      
      const walkingMode: TransportationMode = {
        type: 'walking',
        emissionFactor: 0.0,
        accessibilityFeatures: [],
        availability: 'available'
      };

      const route: RouteAlternative = {
        id: 'test-route-1',
        origin: location1,
        destination: location2,
        transportationModes: [walkingMode],
        segments: [{
          id: 'segment-1',
          startLocation: location1,
          endLocation: location2,
          transportationMode: walkingMode,
          distance: 2.5,
          estimatedTime: 30
        }],
        totalDistance: 2.5,
        estimatedTime: 30,
        carbonFootprint: {
          totalEmissions: 0,
          emissionsBySegment: [],
          methodology: '',
          dataSources: [],
          calculationTimestamp: new Date()
        },
        ecoScore: 100,
        accessibilityCompliant: true
      };

      const carbonFootprint = await carbonCalculator.calculateEmissions(route, walkingMode);
      
      expect(carbonFootprint.totalEmissions).toBe(0);
      expect(carbonFootprint.emissionsBySegment).toHaveLength(1);
      expect(carbonFootprint.methodology).toContain('EPA');
      expect(carbonFootprint.dataSources).toContain('EPA eGRID 2022 - Electricity Grid Emission Factors');
      expect(carbonFootprint.calculationTimestamp).toBeInstanceOf(Date);
    });

    it('should calculate emissions for a car route', async () => {
      const location1: Location = { latitude: 40.7128, longitude: -74.0060, address: 'New York, NY' };
      const location2: Location = { latitude: 40.7589, longitude: -73.9851, address: 'Times Square, NY' };
      
      const carMode: TransportationMode = {
        type: 'conventional_vehicle',
        emissionFactor: 0.89,
        accessibilityFeatures: [],
        availability: 'available'
      };

      const route: RouteAlternative = {
        id: 'test-route-2',
        origin: location1,
        destination: location2,
        transportationModes: [carMode],
        segments: [{
          id: 'segment-1',
          startLocation: location1,
          endLocation: location2,
          transportationMode: carMode,
          distance: 2.5,
          estimatedTime: 10
        }],
        totalDistance: 2.5,
        estimatedTime: 10,
        carbonFootprint: {
          totalEmissions: 0,
          emissionsBySegment: [],
          methodology: '',
          dataSources: [],
          calculationTimestamp: new Date()
        },
        ecoScore: 50,
        accessibilityCompliant: true
      };

      const carbonFootprint = await carbonCalculator.calculateEmissions(route, carMode);
      
      expect(carbonFootprint.totalEmissions).toBe(2.5 * 0.89); // distance * emission factor
      expect(carbonFootprint.emissionsBySegment[0].emissions).toBe(2.5 * 0.89);
    });
  });

  describe('compareAlternatives', () => {
    it('should rank routes by eco-score', async () => {
      const location1: Location = { latitude: 40.7128, longitude: -74.0060, address: 'New York, NY' };
      const location2: Location = { latitude: 40.7589, longitude: -73.9851, address: 'Times Square, NY' };
      
      const walkingMode: TransportationMode = {
        type: 'walking',
        emissionFactor: 0.0,
        accessibilityFeatures: [],
        availability: 'available'
      };

      const carMode: TransportationMode = {
        type: 'conventional_vehicle',
        emissionFactor: 0.89,
        accessibilityFeatures: [],
        availability: 'available'
      };

      const walkingRoute: RouteAlternative = {
        id: 'walking-route',
        origin: location1,
        destination: location2,
        transportationModes: [walkingMode],
        segments: [{
          id: 'segment-1',
          startLocation: location1,
          endLocation: location2,
          transportationMode: walkingMode,
          distance: 2.5,
          estimatedTime: 30
        }],
        totalDistance: 2.5,
        estimatedTime: 30,
        carbonFootprint: {
          totalEmissions: 0,
          emissionsBySegment: [],
          methodology: '',
          dataSources: [],
          calculationTimestamp: new Date()
        },
        ecoScore: 0, // Will be calculated
        accessibilityCompliant: true
      };

      const carRoute: RouteAlternative = {
        id: 'car-route',
        origin: location1,
        destination: location2,
        transportationModes: [carMode],
        segments: [{
          id: 'segment-1',
          startLocation: location1,
          endLocation: location2,
          transportationMode: carMode,
          distance: 2.5,
          estimatedTime: 10
        }],
        totalDistance: 2.5,
        estimatedTime: 10,
        carbonFootprint: {
          totalEmissions: 2.225, // 2.5 * 0.89
          emissionsBySegment: [],
          methodology: '',
          dataSources: [],
          calculationTimestamp: new Date()
        },
        ecoScore: 0, // Will be calculated
        accessibilityCompliant: true
      };

      const comparison = await carbonCalculator.compareAlternatives([carRoute, walkingRoute]);
      
      expect(comparison.rankedByEcoScore).toHaveLength(2);
      expect(comparison.bestEcoOption.id).toBe('walking-route');
      expect(comparison.worstEcoOption.id).toBe('car-route');
      expect(comparison.bestEcoOption.ecoScore).toBeGreaterThan(comparison.worstEcoOption.ecoScore);
    });

    it('should throw error for empty routes array', async () => {
      await expect(carbonCalculator.compareAlternatives([])).rejects.toThrow('No routes provided for comparison');
    });
  });
});