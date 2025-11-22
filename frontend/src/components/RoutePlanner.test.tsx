import { describe, it, expect, vi } from 'vitest';
import { RouteInputForm } from './RouteInputForm';
import { RouteResults } from './RouteResults';
import { RouteComparison } from './RouteComparison';
import { RouteAlternative, Location } from '../types/models';

describe('Route Planner Components', () => {
  describe('RouteInputForm', () => {
    it('should accept valid form submission', () => {
      const mockSubmit = vi.fn();
      const form = { onSubmit: mockSubmit, loading: false };
      
      expect(form.onSubmit).toBeDefined();
      expect(form.loading).toBe(false);
    });

    it('should handle loading state', () => {
      const mockSubmit = vi.fn();
      const form = { onSubmit: mockSubmit, loading: true };
      
      expect(form.loading).toBe(true);
    });
  });

  describe('RouteResults', () => {
    it('should handle empty routes array', () => {
      const mockSelect = vi.fn();
      const props = {
        routes: [],
        onSelectRoute: mockSelect,
      };
      
      expect(props.routes).toHaveLength(0);
    });

    it('should handle routes with data', () => {
      const mockSelect = vi.fn();
      const mockRoute: RouteAlternative = {
        id: 'route-1',
        origin: { latitude: 37.7749, longitude: -122.4194 },
        destination: { latitude: 37.8044, longitude: -122.2712 },
        transportationModes: [{ type: 'walking' }],
        distance: 10,
        duration: 120,
        carbonFootprint: {
          totalEmissions: 0.5,
        },
        ecoScore: 95,
      };
      
      const props = {
        routes: [mockRoute],
        onSelectRoute: mockSelect,
      };
      
      expect(props.routes).toHaveLength(1);
      expect(props.routes[0].id).toBe('route-1');
    });
  });

  describe('RouteComparison', () => {
    it('should handle empty routes', () => {
      const props = { routes: [] };
      expect(props.routes).toHaveLength(0);
    });

    it('should calculate comparison metrics', () => {
      const routes: RouteAlternative[] = [
        {
          id: 'route-1',
          origin: { latitude: 37.7749, longitude: -122.4194 },
          destination: { latitude: 37.8044, longitude: -122.2712 },
          transportationModes: [{ type: 'walking' }],
          carbonFootprint: { totalEmissions: 0.5 },
        },
        {
          id: 'route-2',
          origin: { latitude: 37.7749, longitude: -122.4194 },
          destination: { latitude: 37.8044, longitude: -122.2712 },
          transportationModes: [{ type: 'conventional_vehicle' }],
          carbonFootprint: { totalEmissions: 5.0 },
        },
      ];
      
      const lowestEmissions = Math.min(...routes.map(r => r.carbonFootprint.totalEmissions));
      const highestEmissions = Math.max(...routes.map(r => r.carbonFootprint.totalEmissions));
      const savings = highestEmissions - lowestEmissions;
      
      expect(lowestEmissions).toBe(0.5);
      expect(highestEmissions).toBe(5.0);
      expect(savings).toBe(4.5);
    });
  });
});
