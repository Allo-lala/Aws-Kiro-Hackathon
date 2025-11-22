import React from 'react';
import { RouteAlternative } from '../types/models';

export interface RouteComparisonProps {
  routes: RouteAlternative[];
}

export const RouteComparison: React.FC<RouteComparisonProps> = ({ routes }) => {
  if (routes.length === 0) {
    return null;
  }

  const getModeLabel = (modes: any[]) => {
    if (!modes || modes.length === 0) return 'Unknown';
    return modes.map(m => m.type || m).join(' + ');
  };

  // Find the route with lowest emissions (baseline for comparison)
  const lowestEmissions = Math.min(...routes.map(r => r.carbonFootprint.totalEmissions));
  const highestEmissions = Math.max(...routes.map(r => r.carbonFootprint.totalEmissions));
  
  // Calculate savings compared to highest emissions route
  const maxSavings = highestEmissions - lowestEmissions;

  return (
    <div className="route-comparison">
      <h3>Route Comparison</h3>
      
      <div className="comparison-summary">
        <div className="summary-card">
          <div className="summary-icon">🌱</div>
          <div className="summary-content">
            <div className="summary-label">Best Eco Option</div>
            <div className="summary-value">
              {getModeLabel(routes.find(r => r.carbonFootprint.totalEmissions === lowestEmissions)?.transportationModes || [])}
            </div>
            <div className="summary-detail">
              {lowestEmissions.toFixed(2)} kg CO₂
            </div>
          </div>
        </div>

        {maxSavings > 0 && (
          <div className="summary-card">
            <div className="summary-icon">💰</div>
            <div className="summary-content">
              <div className="summary-label">Potential Savings</div>
              <div className="summary-value">
                {maxSavings.toFixed(2)} kg CO₂
              </div>
              <div className="summary-detail">
                By choosing the greenest option
              </div>
            </div>
          </div>
        )}

        <div className="summary-card">
          <div className="summary-icon">📊</div>
          <div className="summary-content">
            <div className="summary-label">Options Available</div>
            <div className="summary-value">{routes.length}</div>
            <div className="summary-detail">
              Different transportation modes
            </div>
          </div>
        </div>
      </div>

      <div className="comparison-chart">
        <h4>Emissions Comparison</h4>
        <div className="chart-bars">
          {routes
            .sort((a, b) => a.carbonFootprint.totalEmissions - b.carbonFootprint.totalEmissions)
            .map((route) => {
              const percentage = highestEmissions > 0 
                ? (route.carbonFootprint.totalEmissions / highestEmissions) * 100 
                : 100;
              const isLowest = route.carbonFootprint.totalEmissions === lowestEmissions;
              
              return (
                <div key={route.id} className="chart-bar-row">
                  <div className="chart-label">
                    {getModeLabel(route.transportationModes)}
                  </div>
                  <div className="chart-bar-container">
                    <div 
                      className={`chart-bar ${isLowest ? 'lowest' : ''}`}
                      style={{ width: `${percentage}%` }}
                    >
                      <span className="chart-value">
                        {route.carbonFootprint.totalEmissions.toFixed(2)} kg
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
        </div>
      </div>

      {routes.some(r => r.duration) && (
        <div className="comparison-table">
          <h4>Detailed Comparison</h4>
          <table>
            <thead>
              <tr>
                <th>Mode</th>
                <th>Distance</th>
                <th>Duration</th>
                <th>Emissions</th>
                <th>Eco Score</th>
              </tr>
            </thead>
            <tbody>
              {routes
                .sort((a, b) => (b.ecoScore || 0) - (a.ecoScore || 0))
                .map((route) => (
                  <tr key={route.id}>
                    <td>{getModeLabel(route.transportationModes)}</td>
                    <td>{(route.distance || route.totalDistance || 0).toFixed(2)} mi</td>
                    <td>
                      {Math.round((route.duration || route.totalDuration || 0))} min
                    </td>
                    <td>{route.carbonFootprint.totalEmissions.toFixed(2)} kg</td>
                    <td>
                      {route.ecoScore ? (
                        <span className="eco-score-badge">{route.ecoScore.toFixed(0)}</span>
                      ) : (
                        'N/A'
                      )}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
