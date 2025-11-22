import React, { useState } from 'react';
import { apiClient } from '../services/apiClient';

export const DataExport: React.FC = () => {
  const [exporting, setExporting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const exportData = async (format: 'json' | 'csv') => {
    try {
      setExporting(true);
      setMessage(null);

      // Fetch all user data
      const [tripsResponse, preferencesResponse, statsResponse] = await Promise.all([
        apiClient.get('/users/me/trips', { params: { limit: 1000 } }),
        apiClient.get('/users/me/preferences'),
        apiClient.get('/users/me/stats'),
      ]);

      const data = {
        exportDate: new Date().toISOString(),
        statistics: statsResponse.data,
        preferences: preferencesResponse.data,
        trips: tripsResponse.data,
      };

      if (format === 'json') {
        downloadJSON(data);
      } else {
        downloadCSV(data);
      }

      setMessage({ type: 'success', text: `Data exported successfully as ${format.toUpperCase()}` });
    } catch (error: any) {
      console.error('Error exporting data:', error);
      setMessage({ type: 'error', text: 'Failed to export data' });
    } finally {
      setExporting(false);
    }
  };

  const downloadJSON = (data: any) => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `rutty-data-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const downloadCSV = (data: any) => {
    // Convert trips to CSV
    const trips = data.trips;
    if (trips.length === 0) {
      setMessage({ type: 'error', text: 'No trips to export' });
      return;
    }

    const headers = [
      'Date',
      'Origin',
      'Destination',
      'Mode',
      'Distance (mi)',
      'Duration (min)',
      'CO2 Saved (kg)',
    ];

    const rows = trips.map((trip: any) => [
      new Date(trip.completedAt).toLocaleString(),
      trip.originName || `${trip.originLat}, ${trip.originLng}`,
      trip.destinationName || `${trip.destinationLat}, ${trip.destinationLng}`,
      trip.actualTransportationMode,
      trip.distance?.toFixed(2) || '',
      trip.duration || '',
      trip.carbonSavings?.toFixed(2) || '',
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `rutty-trips-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="data-export">
      <h3>Export Your Data</h3>
      <p>Download all your trip history, preferences, and statistics.</p>

      {message && (
        <div className={`message ${message.type}`} role="alert">
          {message.text}
        </div>
      )}

      <div className="export-options">
        <button
          onClick={() => exportData('json')}
          disabled={exporting}
          className="btn btn-secondary"
        >
          {exporting ? 'Exporting...' : 'Export as JSON'}
        </button>
        <button
          onClick={() => exportData('csv')}
          disabled={exporting}
          className="btn btn-secondary"
        >
          {exporting ? 'Exporting...' : 'Export Trips as CSV'}
        </button>
      </div>

      <div className="export-info">
        <h4>What's included:</h4>
        <ul>
          <li>All trip history with routes and carbon savings</li>
          <li>Your preferences and settings</li>
          <li>Cumulative statistics and milestones</li>
        </ul>
      </div>
    </div>
  );
};
