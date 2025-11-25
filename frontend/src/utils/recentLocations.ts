/**
 * Utility functions for managing recent locations in local storage
 */

import { Location, RecentLocation } from '../types/models';

const STORAGE_KEY = 'eco-route-planner-recent-locations';
const MAX_RECENT_LOCATIONS = 5;

/**
 * Load recent locations from local storage
 * @returns Array of recent locations, sorted by most recent first
 */
export function loadRecentLocations(): RecentLocation[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return [];
    }

    const locations: RecentLocation[] = JSON.parse(stored);
    
    // Sort by timestamp (most recent first)
    return locations.sort((a, b) => b.timestamp - a.timestamp);
  } catch (error) {
    // Handle JSON parse errors or localStorage unavailable (e.g., private browsing)
    console.warn('Failed to load recent locations from local storage:', error);
    return [];
  }
}

/**
 * Save a location to recent locations in local storage
 * If the location already exists, update its timestamp and increment search count
 * Limit the list to MAX_RECENT_LOCATIONS items
 * 
 * @param location - The location to save
 */
export function saveRecentLocation(location: Location): void {
  try {
    // Load existing recent locations
    const recentLocations = loadRecentLocations();

    // Check if this location already exists (by coordinates)
    const existingIndex = recentLocations.findIndex(
      (recent) =>
        Math.abs(recent.latitude - location.latitude) < 0.0001 &&
        Math.abs(recent.longitude - location.longitude) < 0.0001
    );

    if (existingIndex >= 0) {
      // Update existing location
      const existing = recentLocations[existingIndex];
      recentLocations[existingIndex] = {
        ...existing,
        timestamp: Date.now(),
        searchCount: existing.searchCount + 1,
        // Update name and address in case they've changed
        name: location.name,
        address: location.address,
      };
    } else {
      // Add new location
      const newRecentLocation: RecentLocation = {
        ...location,
        timestamp: Date.now(),
        searchCount: 1,
      };
      recentLocations.unshift(newRecentLocation);
    }

    // Limit to MAX_RECENT_LOCATIONS
    const limitedLocations = recentLocations.slice(0, MAX_RECENT_LOCATIONS);

    // Save to local storage
    localStorage.setItem(STORAGE_KEY, JSON.stringify(limitedLocations));
  } catch (error) {
    // Handle storage full or localStorage unavailable
    // Fail silently - recent locations is a nice-to-have feature
    console.warn('Failed to save recent location to local storage:', error);
  }
}

/**
 * Clear all recent locations from local storage
 */
export function clearRecentLocations(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.warn('Failed to clear recent locations from local storage:', error);
  }
}

/**
 * Check if local storage is available
 * @returns true if local storage is available, false otherwise
 */
export function isLocalStorageAvailable(): boolean {
  try {
    const testKey = '__test__';
    localStorage.setItem(testKey, 'test');
    localStorage.removeItem(testKey);
    return true;
  } catch (error) {
    return false;
  }
}
