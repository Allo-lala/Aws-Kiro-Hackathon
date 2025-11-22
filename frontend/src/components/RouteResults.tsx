import React from 'react';
import { RouteAlternative } from '../types/models';

export interface RouteResultsProps {
  routes: RouteAlternative[];
  onSelectRoute: (route: RouteAlternative) => void;
  selectedRouteId?: string;
  onSaveTrip?: (route: RouteAlternative) => void;
  savingTripId?: string;
}

export const RouteResults: React.FC<RouteResultsProps> = ({ 
  routes, 
  onSelectRoute, 
  selectedRouteId,
  onSaveTrip,
  savingTripId
}) => {
  if (routes.length === 0) {
    return (
      <div className="route-results-empty">
        <p>No routes to display. Enter origin and destination to calculate routes.</p>
      </div>
    );
  }

  const formatDistance = (distance?: number) => {
    if (!distance) return 'N/A';
    return `${distance.toFixed(2)} miles`;
  };

  const formatDuration = (duration?: number) => {
    if (!duration) return 'N/A';
    const hours = Math.floor(duration / 60);
    const minutes = Math.round(duration % 60);
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const formatEmissions = (emissions: number) => {
    return `${emissions.toFixed(2)} kg CO₂`;
  };

  const getModeIcon = (mode: string) => {
    const icons: Record<string, string> = {
      walking: '🚶',
      cycling: '🚴',
      public_transit: '🚌',
      electric_vehicle: '⚡',
      conventional_vehicle: '🚗',
      rideshare: '🚕',
    };
    return icons[mode] || '🚗';
  };

  const getModeLabel = (modes: any[]) => {
    if (!modes || modes.length === 0) return 'Unknown';
    return modes.map(m => m.type || m).join(' + ');
  };

  const sortedRoutes = [...routes].sort((a, b) => {
    // Sort by eco score (higher is better), then by emissions (lower is better)
    if (a.ecoScore && b.ecoScore) {
      return b.ecoScore - a.ecoScore;
    }
    return a.carbonFootprint.totalEmissions - b.carbonFootprint.totalEmissions;
  });

  return (
    <div className="route-results">
      <h3>Route Alternatives ({routes.length})</h3>
      <div className="routes-list">
        {sortedRoutes.map((route, index) => {
          const isSelected = route.id === selectedRouteId;
          const isSaving = route.id === savingTripId;
          const primaryMode = route.transportationModes?.[0]?.type || 'unknown';
          
          return (
            <div 
              key={route.id} 
              className={`route-card ${isSelected ? 'selected' : ''}`}
              onClick={() => onSelectRoute(route)}
            >
              <div className="route-header">
                <div className="route-mode">
                  <span className="mode-icon-large">
                    {getModeIcon(primaryMode)}
                  </span>
                  <span className="mode-name">
                    {getModeLabel(route.transportationModes)}
                  </span>
                </div>
                {route.ecoScore && (
                  <div className="eco-badge">
                    <span className="eco-score">{route.ecoScore.toFixed(0)}</span>
                    <span className="eco-label">Eco Score</span>
                  </div>
                )}
              </div>

              <div className="route-details">
                <div className="detail-item">
                  <span className="detail-label">Distance</span>
                  <span className="detail-value">{formatDistance(route.distance || route.totalDistance)}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Duration</span>
                  <span className="detail-value">{formatDuration(route.duration || route.totalDuration)}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Emissions</span>
                  <span className="detail-value emissions">
                    {formatEmissions(route.carbonFootprint.totalEmissions)}
                  </span>
                </div>
                {route.cost !== undefined && (
                  <div className="detail-item">
                    <span className="detail-label">Cost</span>
                    <span className="detail-value">${route.cost.toFixed(2)}</span>
                  </div>
                )}
              </div>

              {route.carbonFootprint.comparisonToBaseline !== undefined && (
                <div className="savings-badge">
                  {route.carbonFootprint.comparisonToBaseline < 0 ? (
                    <span className="savings-positive">
                      ✓ {Math.abs(route.carbonFootprint.comparisonToBaseline).toFixed(1)}% less emissions
                    </span>
                  ) : (
                    <span className="savings-negative">
                      {route.carbonFootprint.comparisonToBaseline.toFixed(1)}% more emissions
                    </span>
                  )}
                </div>
              )}

              {isSelected && onSaveTrip && (
                <button
                  className="btn btn-primary btn-small save-trip-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSaveTrip(route);
                  }}
                  disabled={isSaving}
                >
                  {isSaving ? 'Saving...' : 'Save This Trip'}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
