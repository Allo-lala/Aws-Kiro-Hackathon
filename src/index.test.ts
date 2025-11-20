import { describe, it, expect } from 'vitest';
import { RuttyApplication } from './index';

describe('RuttyApplication', () => {
  it('should initialize with all required services', () => {
    const app = new RuttyApplication();
    
    expect(app.getRoutePlanner()).toBeDefined();
    expect(app.getCarbonCalculator()).toBeDefined();
    expect(app.getUserTracker()).toBeDefined();
    expect(app.getRealtimeUpdater()).toBeDefined();
  });

  it('should have proper service types', () => {
    const app = new RuttyApplication();
    
    expect(app.getRoutePlanner().constructor.name).toBe('RoutePlannerService');
    expect(app.getCarbonCalculator().constructor.name).toBe('CarbonCalculatorService');
    expect(app.getUserTracker().constructor.name).toBe('UserTrackerService');
    expect(app.getRealtimeUpdater().constructor.name).toBe('RealtimeUpdaterService');
  });
});