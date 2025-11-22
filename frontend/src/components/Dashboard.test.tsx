import { describe, it, expect } from 'vitest';

describe('Dashboard Components', () => {
  it('should export UserProfile component', async () => {
    const { UserProfile } = await import('./UserProfile');
    expect(UserProfile).toBeDefined();
  });

  it('should export TripHistory component', async () => {
    const { TripHistory } = await import('./TripHistory');
    expect(TripHistory).toBeDefined();
  });

  it('should export CarbonVisualization component', async () => {
    const { CarbonVisualization } = await import('./CarbonVisualization');
    expect(CarbonVisualization).toBeDefined();
  });

  it('should export DataExport component', async () => {
    const { DataExport } = await import('./DataExport');
    expect(DataExport).toBeDefined();
  });
});
