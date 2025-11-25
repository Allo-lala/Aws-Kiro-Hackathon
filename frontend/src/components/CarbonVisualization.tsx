import React, { useState, useEffect } from 'react';
import { apiClient } from '../services/apiClient';

interface UserStats {
  totalTrips: number;
  totalCarbonSavings: number;
  totalDistance: number;
  averageCarbonSavingsPerTrip: number;
  mostUsedTransportationMode: string | null;
}

interface Trip {
  id: string;
  completedAt: string;
  carbonSavings: number | null;
  actualTransportationMode: string;
}

export const CarbonVisualization: React.FC = () => {
  const [stats, setStats] = useState<UserStats | null>(null);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'year' | 'all'>('month');

  useEffect(() => {
    loadData();
  }, [timeRange]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load stats
      const statsResponse = await apiClient.get('/users/me/stats');
      // Backend might wrap response in a data object
      const statsData = statsResponse.data.data || statsResponse.data;
      setStats(statsData);

      // Load trips for chart
      const params: any = { limit: 100 };
      
      // Calculate date range
      const now = new Date();
      if (timeRange === 'week') {
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        params.startDate = weekAgo.toISOString();
      } else if (timeRange === 'month') {
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        params.startDate = monthAgo.toISOString();
      } else if (timeRange === 'year') {
        const yearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        params.startDate = yearAgo.toISOString();
      }

      const tripsResponse = await apiClient.get('/users/me/trips', { params });
      // Backend might wrap response in a data object
      const tripsData = Array.isArray(tripsResponse.data) ? tripsResponse.data : (tripsResponse.data.data || []);
      setTrips(tripsData);
    } catch (error) {
      console.error('Error loading data:', error);
      setStats(null);
      setTrips([]);
    } finally {
      setLoading(false);
    }
  };

  const calculateMilestones = () => {
    if (!stats) return [];
    
    const milestones = [
      { threshold: 10, label: '10 kg CO₂ saved', icon: '🌱' },
      { threshold: 50, label: '50 kg CO₂ saved', icon: '🌿' },
      { threshold: 100, label: '100 kg CO₂ saved', icon: '🌳' },
      { threshold: 500, label: '500 kg CO₂ saved', icon: '🌲' },
      { threshold: 1000, label: '1 ton CO₂ saved', icon: '🏆' },
    ];

    return milestones.map(m => ({
      ...m,
      achieved: stats.totalCarbonSavings >= m.threshold,
      progress: Math.min((stats.totalCarbonSavings / m.threshold) * 100, 100),
    }));
  };

  const getModeBreakdown = () => {
    const modeCount: Record<string, number> = {};
    const modeSavings: Record<string, number> = {};

    trips.forEach(trip => {
      const mode = trip.actualTransportationMode;
      modeCount[mode] = (modeCount[mode] || 0) + 1;
      modeSavings[mode] = (modeSavings[mode] || 0) + (trip.carbonSavings || 0);
    });

    return Object.entries(modeCount).map(([mode, count]) => ({
      mode,
      count,
      savings: modeSavings[mode],
      percentage: (count / trips.length) * 100,
    }));
  };

  const formatMode = (mode: string) => {
    return mode.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const getEquivalentComparison = (kgCO2: number) => {
    // 1 tree absorbs ~21 kg CO2 per year
    const trees = (kgCO2 / 21).toFixed(1);
    // Average car emits ~4.6 metric tons per year, or ~12.6 kg per day
    const carDays = (kgCO2 / 12.6).toFixed(1);
    
    return { trees, carDays };
  };

  if (loading) {
    return <div className="loading">Loading statistics...</div>;
  }

  if (!stats) {
    return <div className="error">Failed to load statistics</div>;
  }

  const milestones = calculateMilestones();
  const modeBreakdown = getModeBreakdown();
  const equivalent = getEquivalentComparison(stats.totalCarbonSavings);

  return (
    <div className="carbon-visualization">
      <h2>Environmental Impact</h2>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">🌍</div>
          <div className="stat-content">
            <div className="stat-value">{Number(stats.totalCarbonSavings || 0).toFixed(1)} kg</div>
            <div className="stat-label">Total CO₂ Saved</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">🚶</div>
          <div className="stat-content">
            <div className="stat-value">{stats.totalTrips || 0}</div>
            <div className="stat-label">Total Trips</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">📏</div>
          <div className="stat-content">
            <div className="stat-value">{Number(stats.totalDistance || 0).toFixed(1)} mi</div>
            <div className="stat-label">Total Distance</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">📊</div>
          <div className="stat-content">
            <div className="stat-value">{Number(stats.averageCarbonSavingsPerTrip || 0).toFixed(2)} kg</div>
            <div className="stat-label">Avg CO₂ per Trip</div>
          </div>
        </div>
      </div>

      <div className="equivalents-section">
        <h3>That's Equivalent To:</h3>
        <div className="equivalents">
          <div className="equivalent-item">
            <span className="equivalent-icon">🌳</span>
            <span className="equivalent-text">
              {equivalent.trees} trees working for a year
            </span>
          </div>
          <div className="equivalent-item">
            <span className="equivalent-icon">🚗</span>
            <span className="equivalent-text">
              Taking a car off the road for {equivalent.carDays} days
            </span>
          </div>
        </div>
      </div>

      <div className="milestones-section">
        <h3>Milestones</h3>
        <div className="milestones">
          {milestones.map((milestone, index) => (
            <div
              key={index}
              className={`milestone ${milestone.achieved ? 'achieved' : 'pending'}`}
            >
              <div className="milestone-icon">{milestone.icon}</div>
              <div className="milestone-content">
                <div className="milestone-label">{milestone.label}</div>
                <div className="milestone-progress">
                  <div
                    className="milestone-progress-bar"
                    style={{ width: `${milestone.progress}%` }}
                  />
                </div>
                <div className="milestone-status">
                  {milestone.achieved ? '✓ Achieved' : `${Number(milestone.progress || 0).toFixed(0)}%`}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {modeBreakdown.length > 0 && (
        <div className="mode-breakdown-section">
          <h3>Transportation Mode Breakdown</h3>
          <div className="time-range-selector">
            <button
              className={timeRange === 'week' ? 'active' : ''}
              onClick={() => setTimeRange('week')}
            >
              Week
            </button>
            <button
              className={timeRange === 'month' ? 'active' : ''}
              onClick={() => setTimeRange('month')}
            >
              Month
            </button>
            <button
              className={timeRange === 'year' ? 'active' : ''}
              onClick={() => setTimeRange('year')}
            >
              Year
            </button>
            <button
              className={timeRange === 'all' ? 'active' : ''}
              onClick={() => setTimeRange('all')}
            >
              All Time
            </button>
          </div>
          <div className="mode-breakdown">
            {modeBreakdown.map((item, index) => (
              <div key={index} className="mode-item">
                <div className="mode-header">
                  <span className="mode-name">{formatMode(item.mode)}</span>
                  <span className="mode-count">{item.count} trips</span>
                </div>
                <div className="mode-bar">
                  <div
                    className="mode-bar-fill"
                    style={{ width: `${item.percentage}%` }}
                  />
                </div>
                <div className="mode-savings">
                  {Number(item.savings || 0).toFixed(2)} kg CO₂ saved
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
