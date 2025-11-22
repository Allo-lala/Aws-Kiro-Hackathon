import React, { useState } from 'react';
import { RouteInputForm } from '../components/RouteInputForm';
import { RouteResults } from '../components/RouteResults';
import { RouteComparison } from '../components/RouteComparison';
import { routeService } from '../services/routeService';
import { Location, RouteAlternative } from '../types/models';

export const RoutePlanner: React.FC = () => {
  const [routes, setRoutes] = useState<RouteAlternative[]>([]);
  const [selectedRoute, setSelectedRoute] = useState<RouteAlternative | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savingTripId, setSavingTripId] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleCalculateRoutes = async (
    origin: Location,
    destination: Location,
    modes: string[]
  ) => {
    setLoading(true);
    setError(null);
    setSuccessMessage(null);
    setRoutes([]);
    setSelectedRoute(null);

    try {
      const calculatedRoutes = await routeService.calculateRoutes({
        origin,
        destination,
        modes,
      });

      setRoutes(calculatedRoutes);
      
      if (calculatedRoutes.length === 0) {
        setError('No routes found for the selected criteria. Please try different locations or transportation modes.');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to calculate routes. Please try again.');
      console.error('Route calculation error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectRoute = (route: RouteAlternative) => {
    setSelectedRoute(route);
    setSuccessMessage(null);
  };

  const handleSaveTrip = async (route: RouteAlternative) => {
    setSavingTripId(route.id);
    setError(null);
    setSuccessMessage(null);

    try {
      const primaryMode = route.transportationModes?.[0]?.type || 'unknown';
      
      const response = await routeService.saveTrip({
        origin: route.origin,
        destination: route.destination,
        selectedRoute: route,
        actualTransportationMode: primaryMode,
      });

      setSuccessMessage(`Trip saved successfully! You saved ${route.carbonFootprint.totalEmissions.toFixed(2)} kg CO₂`);
    } catch (err: any) {
      setError(err.message || 'Failed to save trip. Please try again.');
      console.error('Save trip error:', err);
    } finally {
      setSavingTripId(null);
    }
  };

  return (
    <div className="route-planner">
      <div className="planner-header">
        <h2>Plan Your Eco-Friendly Route</h2>
        <p>Compare different transportation options and choose the greenest way to travel.</p>
      </div>

      {error && (
        <div className="error-message" role="alert">
          <strong>Error:</strong> {error}
        </div>
      )}

      {successMessage && (
        <div className="success-message" role="alert">
          <strong>Success!</strong> {successMessage}
        </div>
      )}

      <div className="planner-content">
        <div className="planner-sidebar">
          <RouteInputForm 
            onSubmit={handleCalculateRoutes}
            loading={loading}
          />
        </div>

        <div className="planner-main">
          {loading && (
            <div className="loading-state">
              <div className="spinner"></div>
              <p>Calculating routes...</p>
            </div>
          )}

          {!loading && routes.length > 0 && (
            <>
              <RouteResults
                routes={routes}
                onSelectRoute={handleSelectRoute}
                selectedRouteId={selectedRoute?.id}
                onSaveTrip={handleSaveTrip}
                savingTripId={savingTripId || undefined}
              />
              
              <RouteComparison routes={routes} />
            </>
          )}

          {!loading && routes.length === 0 && !error && (
            <div className="empty-state">
              <div className="empty-icon">🗺️</div>
              <h3>Ready to Plan Your Route</h3>
              <p>Enter your origin and destination to get started with eco-friendly route options.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
