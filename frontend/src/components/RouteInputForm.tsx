import React, { useState } from 'react';
import { Location } from '../types/models';

export interface RouteInputFormProps {
  onSubmit: (origin: Location, destination: Location, modes: string[]) => void;
  loading?: boolean;
}

export const RouteInputForm: React.FC<RouteInputFormProps> = ({ onSubmit, loading = false }) => {
  const [originLat, setOriginLat] = useState('');
  const [originLng, setOriginLng] = useState('');
  const [originName, setOriginName] = useState('');
  const [destLat, setDestLat] = useState('');
  const [destLng, setDestLng] = useState('');
  const [destName, setDestName] = useState('');
  const [selectedModes, setSelectedModes] = useState<string[]>(['walking', 'cycling', 'public_transit']);

  const transportModes = [
    { value: 'walking', label: 'Walking', icon: '🚶' },
    { value: 'cycling', label: 'Cycling', icon: '🚴' },
    { value: 'public_transit', label: 'Public Transit', icon: '🚌' },
    { value: 'electric_vehicle', label: 'Electric Vehicle', icon: '⚡' },
    { value: 'conventional_vehicle', label: 'Car', icon: '🚗' },
    { value: 'rideshare', label: 'Rideshare', icon: '🚕' },
  ];

  const handleModeToggle = (mode: string) => {
    setSelectedModes(prev => 
      prev.includes(mode) 
        ? prev.filter(m => m !== mode)
        : [...prev, mode]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const origin: Location = {
      latitude: parseFloat(originLat),
      longitude: parseFloat(originLng),
      name: originName || undefined,
    };

    const destination: Location = {
      latitude: parseFloat(destLat),
      longitude: parseFloat(destLng),
      name: destName || undefined,
    };

    onSubmit(origin, destination, selectedModes);
  };

  const isFormValid = () => {
    return originLat && originLng && destLat && destLng && selectedModes.length > 0;
  };

  return (
    <form onSubmit={handleSubmit} className="route-input-form">
      <div className="form-section">
        <h3>Origin</h3>
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="origin-name">Location Name (Optional)</label>
            <input
              id="origin-name"
              type="text"
              value={originName}
              onChange={(e) => setOriginName(e.target.value)}
              placeholder="e.g., Home, Office"
              disabled={loading}
            />
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="origin-lat">Latitude *</label>
            <input
              id="origin-lat"
              type="number"
              step="any"
              value={originLat}
              onChange={(e) => setOriginLat(e.target.value)}
              placeholder="e.g., 37.7749"
              required
              disabled={loading}
            />
          </div>
          <div className="form-group">
            <label htmlFor="origin-lng">Longitude *</label>
            <input
              id="origin-lng"
              type="number"
              step="any"
              value={originLng}
              onChange={(e) => setOriginLng(e.target.value)}
              placeholder="e.g., -122.4194"
              required
              disabled={loading}
            />
          </div>
        </div>
      </div>

      <div className="form-section">
        <h3>Destination</h3>
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="dest-name">Location Name (Optional)</label>
            <input
              id="dest-name"
              type="text"
              value={destName}
              onChange={(e) => setDestName(e.target.value)}
              placeholder="e.g., Park, Restaurant"
              disabled={loading}
            />
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="dest-lat">Latitude *</label>
            <input
              id="dest-lat"
              type="number"
              step="any"
              value={destLat}
              onChange={(e) => setDestLat(e.target.value)}
              placeholder="e.g., 37.8044"
              required
              disabled={loading}
            />
          </div>
          <div className="form-group">
            <label htmlFor="dest-lng">Longitude *</label>
            <input
              id="dest-lng"
              type="number"
              step="any"
              value={destLng}
              onChange={(e) => setDestLng(e.target.value)}
              placeholder="e.g., -122.2712"
              required
              disabled={loading}
            />
          </div>
        </div>
      </div>

      <div className="form-section">
        <h3>Transportation Modes</h3>
        <p className="form-hint">Select one or more modes to compare</p>
        <div className="mode-selector">
          {transportModes.map(mode => (
            <button
              key={mode.value}
              type="button"
              className={`mode-button ${selectedModes.includes(mode.value) ? 'selected' : ''}`}
              onClick={() => handleModeToggle(mode.value)}
              disabled={loading}
            >
              <span className="mode-icon">{mode.icon}</span>
              <span className="mode-label">{mode.label}</span>
            </button>
          ))}
        </div>
      </div>

      <button 
        type="submit" 
        className="btn btn-primary btn-large"
        disabled={!isFormValid() || loading}
      >
        {loading ? 'Calculating Routes...' : 'Calculate Routes'}
      </button>
    </form>
  );
};
