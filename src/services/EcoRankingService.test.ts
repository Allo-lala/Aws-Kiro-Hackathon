import { describe, it, expect } from 'vitest';
import { EcoRankingService } from './EcoRankingService';
import { RouteAlternative } from '../models/RouteAlternative';
import { TransportationMode } from '../models/TransportationMode';
import { CarbonFootprint } from '../models/CarbonFootprint';

describe('EcoRankingService', () => {
  const ecoRankingService = new EcoRankingService();

  const createMockRoute = (
    transportationType: string,
    emissionFactor: number,
    distance: number = 10,
    estimatedTime: number = 30
  ): RouteAlternative => {
    const mode: TransportationMode = {
      type: transportationType as any,
      emissionFactor,
      accessibilityFeatures: [],
      availability: 'available'
    };

    const carbonFootprint: CarbonFootprint = {
      totalEmissions: distance * emissionFactor,
      emissionsBySegment: [],
      methodology: 'Test methodology',
      dataSources: ['Test source'],
      calculationTimestamp: new Date()
    };

    return {
      id: `test-route-${transportationType}`,
      origin: { latitude: 0, longitude: 0 },
      destination: { latitude: 1, longitude: 1 },
      transportationModes: [mode],
      segments: [],
      totalDistance: distance,
      estimatedTime,
      carbonFootprint,
      ecoScore: 0,
      accessibilityCompliant: true
    };
  };

  describe('calculateEcoScore', () => {
    it('should give maximum score to zero-emission transportation', () => {
      const walkingRoute = createMockRoute('walking', 0);
      const scoreBreakdown = ecoRankingService.calculateEcoScore(walkingRoute);
      
      expect(scoreBreakdown.finalScore).toBe(100);
      expect(scoreBreakdown.zeroEmissionBonus).toBe(25);
      expect(scoreBreakdown.emissionsPenalty).toBe(0);
    });

    it('should penalize high-emission transportation', () => {
      const carRoute = createMockRoute('conventional_vehicle', 0.4);
      const scoreBreakdown = ecoRankingService.calculateEcoScore(carRoute);
      
      expect(scoreBreakdown.finalScore).toBeLessThan(100);
      expect(scoreBreakdown.emissionsPenalty).toBeGreaterThan(0);
    });

    it('should give bonus to public transit', () => {
      const transitRoute = createMockRoute('public_transit', 0.2);
      const scoreBreakdown = ecoRankingService.calculateEcoScore(transitRoute);
      
      expect(scoreBreakdown.publicTransitBonus).toBe(15);
    });
  });

  describe('rankRoutesByEcoFriendliness', () => {
    it('should rank zero-emission routes highest', () => {
      const routes = [
        createMockRoute('conventional_vehicle', 0.4),
        createMockRoute('walking', 0),
        createMockRoute('public_transit', 0.2)
      ];

      const ranked = ecoRankingService.rankRoutesByEcoFriendliness(routes);
      
      expect(ranked[0].transportationModes[0].type).toBe('walking');
      expect(ranked[0].ecoScore).toBeGreaterThanOrEqual(ranked[1].ecoScore);
      expect(ranked[1].ecoScore).toBeGreaterThan(ranked[2].ecoScore);
    });

    it('should prefer faster routes when eco-scores are similar', () => {
      const routes = [
        createMockRoute('walking', 0, 10, 60), // slower
        createMockRoute('cycling', 0, 10, 30)  // faster
      ];

      const ranked = ecoRankingService.rankRoutesByEcoFriendliness(routes);
      
      // Both should have similar eco-scores, so faster should be first
      expect(ranked[0].transportationModes[0].type).toBe('cycling');
    });
  });

  describe('prioritizePublicTransit', () => {
    it('should place public transit routes before private vehicle routes', () => {
      const routes = [
        createMockRoute('conventional_vehicle', 0.4),
        createMockRoute('public_transit', 0.2),
        createMockRoute('electric_vehicle', 0.1)
      ];

      const prioritized = ecoRankingService.prioritizePublicTransit(routes);
      
      // Public transit should come before private vehicles
      const transitIndex = prioritized.findIndex(r => r.transportationModes[0].type === 'public_transit');
      const carIndex = prioritized.findIndex(r => r.transportationModes[0].type === 'conventional_vehicle');
      const evIndex = prioritized.findIndex(r => r.transportationModes[0].type === 'electric_vehicle');
      
      expect(transitIndex).toBeLessThan(carIndex);
      expect(transitIndex).toBeLessThan(evIndex);
    });
  });

  describe('highlightZeroEmissionOptions', () => {
    it('should separate zero-emission from other routes', () => {
      const routes = [
        createMockRoute('walking', 0),
        createMockRoute('cycling', 0),
        createMockRoute('conventional_vehicle', 0.4),
        createMockRoute('public_transit', 0.2)
      ];

      const { zeroEmissionRoutes, otherRoutes } = ecoRankingService.highlightZeroEmissionOptions(routes);
      
      expect(zeroEmissionRoutes).toHaveLength(2);
      expect(otherRoutes).toHaveLength(2);
      expect(zeroEmissionRoutes.every(r => r.carbonFootprint.totalEmissions === 0)).toBe(true);
      expect(otherRoutes.every(r => r.carbonFootprint.totalEmissions > 0)).toBe(true);
    });
  });

  describe('getMostEcoFriendlyRoute', () => {
    it('should return the route with highest eco-score', () => {
      const routes = [
        createMockRoute('conventional_vehicle', 0.4),
        createMockRoute('walking', 0),
        createMockRoute('public_transit', 0.2)
      ];

      const mostEcoFriendly = ecoRankingService.getMostEcoFriendlyRoute(routes);
      
      expect(mostEcoFriendly?.transportationModes[0].type).toBe('walking');
    });

    it('should return null for empty route array', () => {
      const mostEcoFriendly = ecoRankingService.getMostEcoFriendlyRoute([]);
      expect(mostEcoFriendly).toBeNull();
    });
  });
});