/**
 * Geoapify API Service
 * Provides location autocomplete and reverse geocoding functionality
 */

import { Location } from '../types/models';

const GEOAPIFY_BASE_URL = 'https://api.geoapify.com/v1/geocode';
const API_KEY = process.env.REACT_APP_GEOAPIFY_API_KEY;

/**
 * Place suggestion returned from Geoapify autocomplete API
 */
export interface PlaceSuggestion {
  placeId: string;
  name: string;
  address: string;
  city?: string;
  state?: string;
  country: string;
  latitude: number;
  longitude: number;
  resultType: string;
}

/**
 * Options for autocomplete search
 */
export interface AutocompleteOptions {
  limit?: number;
  lang?: string;
  filter?: {
    countrycode?: string[];
    circle?: {
      lat: number;
      lon: number;
      radius: number;
    };
  };
}

/**
 * Geoapify API response structure
 */
interface GeoapifyFeature {
  properties: {
    place_id: string;
    name?: string;
    formatted: string;
    address_line1?: string;
    address_line2?: string;
    city?: string;
    state?: string;
    country?: string;
    lat: number;
    lon: number;
    result_type: string;
  };
}

interface GeoapifyResponse {
  features: GeoapifyFeature[];
}

/**
 * Custom error class for Geoapify API errors
 */
export class GeoapifyError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public isRateLimitError: boolean = false
  ) {
    super(message);
    this.name = 'GeoapifyError';
  }
}

/**
 * Transform Geoapify feature to PlaceSuggestion
 */
function transformFeatureToSuggestion(feature: GeoapifyFeature): PlaceSuggestion {
  const props = feature.properties;
  
  return {
    placeId: props.place_id,
    name: props.name || props.address_line1 || props.formatted,
    address: props.formatted,
    city: props.city,
    state: props.state,
    country: props.country || '',
    latitude: props.lat,
    longitude: props.lon,
    resultType: props.result_type,
  };
}

/**
 * GeoapifyService class
 * Handles all interactions with the Geoapify API
 */
class GeoapifyService {
  /**
   * Search for location suggestions based on user query
   * @param query - Search query string
   * @param options - Optional search parameters
   * @returns Promise resolving to array of place suggestions
   * @throws GeoapifyError on API failures
   */
  async autocomplete(
    query: string,
    options: AutocompleteOptions = {}
  ): Promise<PlaceSuggestion[]> {
    // Validate API key
    if (!API_KEY) {
      throw new GeoapifyError(
        'Geoapify API key is not configured. Please add REACT_APP_GEOAPIFY_API_KEY to your environment variables.',
        undefined,
        false
      );
    }

    // Validate query
    if (!query || query.trim().length === 0) {
      return [];
    }

    // Build URL with query parameters
    const url = new URL(`${GEOAPIFY_BASE_URL}/autocomplete`);
    url.searchParams.append('text', query.trim());
    url.searchParams.append('apiKey', API_KEY);
    
    // Add optional parameters
    if (options.limit) {
      url.searchParams.append('limit', options.limit.toString());
    }
    
    if (options.lang) {
      url.searchParams.append('lang', options.lang);
    }
    
    if (options.filter?.countrycode) {
      url.searchParams.append('filter', `countrycode:${options.filter.countrycode.join(',')}`);
    }
    
    if (options.filter?.circle) {
      const { lat, lon, radius } = options.filter.circle;
      url.searchParams.append('filter', `circle:${lon},${lat},${radius}`);
    }

    try {
      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });

      // Handle rate limiting
      if (response.status === 429) {
        throw new GeoapifyError(
          'Too many requests. Please wait a moment and try again.',
          429,
          true
        );
      }

      // Handle authentication errors
      if (response.status === 401 || response.status === 403) {
        throw new GeoapifyError(
          'Invalid API key. Location search is temporarily unavailable.',
          response.status,
          false
        );
      }

      // Handle other HTTP errors
      if (!response.ok) {
        throw new GeoapifyError(
          `API request failed with status ${response.status}`,
          response.status,
          false
        );
      }

      // Parse response
      let data: GeoapifyResponse;
      try {
        data = await response.json();
      } catch (parseError) {
        throw new GeoapifyError(
          'Unable to process location results. Please try a different search.',
          undefined,
          false
        );
      }

      // Validate response structure
      if (!data.features || !Array.isArray(data.features)) {
        throw new GeoapifyError(
          'Invalid response format from location service.',
          undefined,
          false
        );
      }

      // Transform features to suggestions
      return data.features.map(transformFeatureToSuggestion);
    } catch (error) {
      // Re-throw GeoapifyError as-is
      if (error instanceof GeoapifyError) {
        throw error;
      }

      // Handle network errors
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new GeoapifyError(
          'Unable to connect to location service. Please check your internet connection.',
          undefined,
          false
        );
      }

      // Handle unknown errors
      throw new GeoapifyError(
        'An unexpected error occurred while searching for locations.',
        undefined,
        false
      );
    }
  }

  /**
   * Convert coordinates to a human-readable location name
   * @param lat - Latitude
   * @param lon - Longitude
   * @returns Promise resolving to Location object with name and address
   * @throws GeoapifyError on API failures
   */
  async reverseGeocode(lat: number, lon: number): Promise<Location> {
    // Validate API key
    if (!API_KEY) {
      throw new GeoapifyError(
        'Geoapify API key is not configured. Please add REACT_APP_GEOAPIFY_API_KEY to your environment variables.',
        undefined,
        false
      );
    }

    // Validate coordinates
    if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
      throw new GeoapifyError(
        'Invalid coordinates provided.',
        undefined,
        false
      );
    }

    // Build URL
    const url = new URL(`${GEOAPIFY_BASE_URL}/reverse`);
    url.searchParams.append('lat', lat.toString());
    url.searchParams.append('lon', lon.toString());
    url.searchParams.append('apiKey', API_KEY);

    try {
      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });

      // Handle rate limiting
      if (response.status === 429) {
        throw new GeoapifyError(
          'Too many requests. Please wait a moment and try again.',
          429,
          true
        );
      }

      // Handle authentication errors
      if (response.status === 401 || response.status === 403) {
        throw new GeoapifyError(
          'Invalid API key. Location search is temporarily unavailable.',
          response.status,
          false
        );
      }

      // Handle other HTTP errors
      if (!response.ok) {
        throw new GeoapifyError(
          `API request failed with status ${response.status}`,
          response.status,
          false
        );
      }

      // Parse response
      let data: GeoapifyResponse;
      try {
        data = await response.json();
      } catch (parseError) {
        throw new GeoapifyError(
          'Unable to process location results. Please try a different search.',
          undefined,
          false
        );
      }

      // Validate response structure
      if (!data.features || !Array.isArray(data.features) || data.features.length === 0) {
        throw new GeoapifyError(
          'No location found for the provided coordinates.',
          undefined,
          false
        );
      }

      // Get the first (most relevant) result
      const feature = data.features[0];
      const props = feature.properties;

      return {
        latitude: lat,
        longitude: lon,
        name: props.name || props.address_line1 || props.city || 'Unknown Location',
        address: props.formatted,
      };
    } catch (error) {
      // Re-throw GeoapifyError as-is
      if (error instanceof GeoapifyError) {
        throw error;
      }

      // Handle network errors
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new GeoapifyError(
          'Unable to connect to location service. Please check your internet connection.',
          undefined,
          false
        );
      }

      // Handle unknown errors
      throw new GeoapifyError(
        'An unexpected error occurred while looking up the location.',
        undefined,
        false
      );
    }
  }
}

// Export singleton instance
export const geoapifyService = new GeoapifyService();
