import { Location } from '../models/Location';
import { UserPreferences } from '../models/UserPreferences';
import { LocationValidation, AccessibilityRequirement, SustainabilityPriority } from '../models/common';
import { TransportationMode } from '../models/TransportationMode';

/**
 * Validates location input ensuring coordinates are within valid ranges
 * and required fields are present
 */
export function validateLocation(location: Location): LocationValidation {
  // Check if location object exists
  if (!location) {
    return {
      isValid: false,
      errorMessage: 'Location is required'
    };
  }

  // Validate latitude range (-90 to 90)
  if (typeof location.latitude !== 'number' || 
      location.latitude < -90 || 
      location.latitude > 90) {
    return {
      isValid: false,
      errorMessage: 'Latitude must be a number between -90 and 90'
    };
  }

  // Validate longitude range (-180 to 180)
  if (typeof location.longitude !== 'number' || 
      location.longitude < -180 || 
      location.longitude > 180) {
    return {
      isValid: false,
      errorMessage: 'Longitude must be a number between -180 and 180'
    };
  }

  // Normalize the location by ensuring proper precision
  const normalizedLocation: Location = {
    latitude: Math.round(location.latitude * 1000000) / 1000000, // 6 decimal places
    longitude: Math.round(location.longitude * 1000000) / 1000000,
    address: location.address?.trim(),
    city: location.city?.trim(),
    country: location.country?.trim()
  };

  return {
    isValid: true,
    normalizedLocation
  };
}

/**
 * Validates user preferences ensuring all required fields are present
 * and values are within acceptable ranges
 */
export function validateUserPreferences(preferences: UserPreferences): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Validate userId
  if (!preferences.userId || typeof preferences.userId !== 'string' || preferences.userId.trim() === '') {
    errors.push('User ID is required and must be a non-empty string');
  }

  // Validate maxWalkingDistance
  if (typeof preferences.maxWalkingDistance !== 'number' || preferences.maxWalkingDistance < 0) {
    errors.push('Maximum walking distance must be a non-negative number');
  }

  // Validate preferredTransportationModes
  if (!Array.isArray(preferences.preferredTransportationModes)) {
    errors.push('Preferred transportation modes must be an array');
  }

  // Validate accessibilityNeeds
  if (!Array.isArray(preferences.accessibilityNeeds)) {
    errors.push('Accessibility needs must be an array');
  } else {
    preferences.accessibilityNeeds.forEach((need, index) => {
      if (!isValidAccessibilityRequirement(need)) {
        errors.push(`Invalid accessibility requirement at index ${index}`);
      }
    });
  }

  // Validate sustainabilityPriority
  const validPriorities: SustainabilityPriority[] = ['high', 'medium', 'low'];
  if (!validPriorities.includes(preferences.sustainabilityPriority)) {
    errors.push('Sustainability priority must be one of: high, medium, low');
  }

  // Validate timeVsEnvironmentWeight
  if (typeof preferences.timeVsEnvironmentWeight !== 'number' || 
      preferences.timeVsEnvironmentWeight < 0 || 
      preferences.timeVsEnvironmentWeight > 1) {
    errors.push('Time vs environment weight must be a number between 0 and 1');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validates accessibility requirement structure
 */
function isValidAccessibilityRequirement(requirement: AccessibilityRequirement): boolean {
  return (
    typeof requirement.type === 'string' &&
    requirement.type.trim() !== '' &&
    typeof requirement.required === 'boolean'
  );
}

/**
 * Validates transportation mode structure
 */
export function validateTransportationMode(mode: TransportationMode): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Validate type
  const validTypes = ['walking', 'cycling', 'public_transit', 'electric_vehicle', 'conventional_vehicle', 'rideshare'];
  if (!validTypes.includes(mode.type)) {
    errors.push(`Transportation type must be one of: ${validTypes.join(', ')}`);
  }

  // Validate emissionFactor
  if (typeof mode.emissionFactor !== 'number' || mode.emissionFactor < 0) {
    errors.push('Emission factor must be a non-negative number');
  }

  // Validate accessibilityFeatures
  if (!Array.isArray(mode.accessibilityFeatures)) {
    errors.push('Accessibility features must be an array');
  }

  // Validate availability
  if (!mode.availability || typeof mode.availability !== 'object') {
    errors.push('Availability must be an object with available property');
  } else if (typeof mode.availability.available !== 'boolean') {
    errors.push('Availability.available must be a boolean');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}