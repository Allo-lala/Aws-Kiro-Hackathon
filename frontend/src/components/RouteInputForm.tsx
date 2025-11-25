import React, { useState } from 'react';
import { Location } from '../types/models';
import { LocationAutocomplete } from './LocationAutocomplete';

export interface RouteInputFormProps {
  onSubmit: (origin: Location, destination: Location, modes: string[]) => void;
  loading?: boolean;
}

export const RouteInputForm: React.FC<RouteInputFormProps> = ({ onSubmit, loading = false }) => {
  const [origin, setOrigin] = useState<Location | null>(null);
  const [destination, setDestination] = useState<Location | null>(null);
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
    
    // Ensure both locations are selected
    if (!origin || !destination) {
      return;
    }

    onSubmit(origin, destination, selectedModes);
  };

  const isFormValid = () => {
    return origin !== null && destination !== null && selectedModes.length > 0;
  };

  return (
    <form onSubmit={handleSubmit} className="route-input-form">
      <div className="form-section">
        <LocationAutocomplete
          label="Origin"
          placeholder="Search for your starting location..."
          value={origin}
          onChange={setOrigin}
          disabled={loading}
          showCurrentLocation={true}
        />
      </div>

      <div className="form-section">
        <LocationAutocomplete
          label="Destination"
          placeholder="Search for your destination..."
          value={destination}
          onChange={setDestination}
          disabled={loading}
          showCurrentLocation={false}
        />
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
