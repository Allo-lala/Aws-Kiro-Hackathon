import React, { useState, useEffect } from 'react';
import { apiClient } from '../services/apiClient';

interface Trip {
  id: string;
  originName: string | null;
  destinationName: string | null;
  originLat: number;
  originLng: number;
  destinationLat: number;
  destinationLng: number;
  actualTransportationMode: string;
  carbonSavings: number | null;
  distance: number | null;
  duration: number | null;
  completedAt: string;
}

export const TripHistory: React.FC = () => {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [filter, setFilter] = useState<string>('');
  const pageSize = 10;

  useEffect(() => {
    loadTrips();
  }, [page, filter]);

  const loadTrips = async () => {
    try {
      setLoading(true);
      const params: any = {
        limit: pageSize,
        offset: page * pageSize,
      };
      
      if (filter) {
        params.transportationMode = filter;
      }

      const response = await apiClient.get('/users/me/trips', { params });
      // Backend might wrap response in a data object
      const newTrips = Array.isArray(response.data) ? response.data : (response.data.data || []);
      
      setTrips(newTrips);
      setHasMore(newTrips.length === pageSize);
    } catch (error) {
      console.error('Error loading trips:', error);
      setTrips([]); // Set empty array on error
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatMode = (mode: string) => {
    return mode.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const handlePrevPage = () => {
    if (page > 0) {
      setPage(page - 1);
    }
  };

  const handleNextPage = () => {
    if (hasMore) {
      setPage(page + 1);
    }
  };

  const handleFilterChange = (newFilter: string) => {
    setFilter(newFilter);
    setPage(0);
  };

  if (loading && trips.length === 0) {
    return <div className="loading">Loading trip history...</div>;
  }

  return (
    <div className="trip-history">
      <div className="trip-history-header">
        <h2>Trip History</h2>
        
        <div className="filter-controls">
          <label htmlFor="modeFilter">Filter by mode:</label>
          <select
            id="modeFilter"
            value={filter}
            onChange={(e) => handleFilterChange(e.target.value)}
            className="filter-select"
          >
            <option value="">All Modes</option>
            <option value="walking">Walking</option>
            <option value="cycling">Cycling</option>
            <option value="public_transit">Public Transit</option>
            <option value="driving">Driving</option>
            <option value="carpool">Carpool</option>
          </select>
        </div>
      </div>

      {trips.length === 0 ? (
        <div className="empty-state">
          <p>No trips found. Start planning your first eco-friendly route!</p>
        </div>
      ) : (
        <>
          <div className="trips-list">
            {trips.map((trip) => (
              <div key={trip.id} className="trip-card">
                <div className="trip-header">
                  <span className="trip-mode">{formatMode(trip.actualTransportationMode)}</span>
                  <span className="trip-date">{formatDate(trip.completedAt)}</span>
                </div>
                
                <div className="trip-route">
                  <div className="trip-location">
                    <span className="location-icon">📍</span>
                    <span className="location-name">
                      {trip.originName || `${trip.originLat.toFixed(4)}, ${trip.originLng.toFixed(4)}`}
                    </span>
                  </div>
                  <div className="route-arrow">→</div>
                  <div className="trip-location">
                    <span className="location-icon">🎯</span>
                    <span className="location-name">
                      {trip.destinationName || `${trip.destinationLat.toFixed(4)}, ${trip.destinationLng.toFixed(4)}`}
                    </span>
                  </div>
                </div>

                <div className="trip-stats">
                  {trip.distance && (
                    <div className="stat">
                      <span className="stat-label">Distance:</span>
                      <span className="stat-value">{trip.distance.toFixed(1)} mi</span>
                    </div>
                  )}
                  {trip.duration && (
                    <div className="stat">
                      <span className="stat-label">Duration:</span>
                      <span className="stat-value">{Math.round(trip.duration)} min</span>
                    </div>
                  )}
                  {trip.carbonSavings !== null && trip.carbonSavings !== undefined && (
                    <div className="stat carbon-savings">
                      <span className="stat-label">CO₂ Saved:</span>
                      <span className="stat-value">{trip.carbonSavings.toFixed(2)} kg</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="pagination">
            <button
              onClick={handlePrevPage}
              disabled={page === 0}
              className="btn btn-secondary"
            >
              Previous
            </button>
            <span className="page-info">Page {page + 1}</span>
            <button
              onClick={handleNextPage}
              disabled={!hasMore}
              className="btn btn-secondary"
            >
              Next
            </button>
          </div>
        </>
      )}
    </div>
  );
};
