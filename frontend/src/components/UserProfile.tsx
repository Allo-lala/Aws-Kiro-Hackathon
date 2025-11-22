import React, { useState, useEffect } from 'react';
import { apiClient } from '../services/apiClient';

interface UserPreferences {
  maxWalkingDistance: number | null;
  preferredModes: string[] | null;
  accessibilityNeeds: Record<string, any> | null;
  sustainabilityPriority: string | null;
  timeVsEnvironmentWeight: number | null;
}

export const UserProfile: React.FC = () => {
  const [preferences, setPreferences] = useState<UserPreferences>({
    maxWalkingDistance: 0.5,
    preferredModes: [],
    accessibilityNeeds: {},
    sustainabilityPriority: 'medium',
    timeVsEnvironmentWeight: 0.5,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/users/me/preferences');
      setPreferences(response.data);
    } catch (error: any) {
      if (error.response?.status === 404) {
        // No preferences yet, use defaults
        console.log('No preferences found, using defaults');
      } else {
        console.error('Error loading preferences:', error);
        setMessage({ type: 'error', text: 'Failed to load preferences' });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      setMessage(null);
      await apiClient.put('/users/me/preferences', preferences);
      setMessage({ type: 'success', text: 'Preferences saved successfully!' });
    } catch (error) {
      console.error('Error saving preferences:', error);
      setMessage({ type: 'error', text: 'Failed to save preferences' });
    } finally {
      setSaving(false);
    }
  };

  const handleModeToggle = (mode: string) => {
    const currentModes = preferences.preferredModes || [];
    const newModes = currentModes.includes(mode)
      ? currentModes.filter(m => m !== mode)
      : [...currentModes, mode];
    setPreferences({ ...preferences, preferredModes: newModes });
  };

  if (loading) {
    return <div className="loading">Loading preferences...</div>;
  }

  return (
    <div className="user-profile">
      <h2>Profile & Preferences</h2>
      
      {message && (
        <div className={`message ${message.type}`} role="alert">
          {message.text}
        </div>
      )}

      <form onSubmit={handleSave} className="preferences-form">
        <div className="form-section">
          <h3>Transportation Preferences</h3>
          
          <div className="form-group">
            <label htmlFor="maxWalkingDistance">
              Maximum Walking Distance (miles)
            </label>
            <input
              id="maxWalkingDistance"
              type="number"
              step="0.1"
              min="0"
              max="10"
              value={preferences.maxWalkingDistance || 0.5}
              onChange={(e) => setPreferences({
                ...preferences,
                maxWalkingDistance: parseFloat(e.target.value)
              })}
            />
          </div>

          <div className="form-group">
            <label>Preferred Transportation Modes</label>
            <div className="mode-checkboxes">
              {['walking', 'cycling', 'public_transit', 'driving', 'carpool'].map(mode => (
                <label key={mode} className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={(preferences.preferredModes || []).includes(mode)}
                    onChange={() => handleModeToggle(mode)}
                  />
                  <span>{mode.replace('_', ' ')}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="form-section">
          <h3>Sustainability Settings</h3>
          
          <div className="form-group">
            <label htmlFor="sustainabilityPriority">
              Sustainability Priority
            </label>
            <select
              id="sustainabilityPriority"
              value={preferences.sustainabilityPriority || 'medium'}
              onChange={(e) => setPreferences({
                ...preferences,
                sustainabilityPriority: e.target.value
              })}
            >
              <option value="low">Low - Prioritize speed and convenience</option>
              <option value="medium">Medium - Balance time and environment</option>
              <option value="high">High - Maximize environmental benefit</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="timeVsEnvironmentWeight">
              Time vs Environment Balance: {((preferences.timeVsEnvironmentWeight || 0.5) * 100).toFixed(0)}%
            </label>
            <input
              id="timeVsEnvironmentWeight"
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={preferences.timeVsEnvironmentWeight || 0.5}
              onChange={(e) => setPreferences({
                ...preferences,
                timeVsEnvironmentWeight: parseFloat(e.target.value)
              })}
            />
            <div className="range-labels">
              <span>Faster Routes</span>
              <span>Greener Routes</span>
            </div>
          </div>
        </div>

        <div className="form-actions">
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Saving...' : 'Save Preferences'}
          </button>
        </div>
      </form>
    </div>
  );
};
