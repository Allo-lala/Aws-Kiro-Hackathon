import axios, { AxiosInstance, AxiosError } from 'axios';
import { Location } from '../models/Location';
import { TransportationType } from '../models/common';

export interface ExternalRouteConfig {
  provider: 'google_maps' | 'geoapify';
  apiKey: string;
  timeout?: number;
  maxRetries?: number;
}

export interface ExternalRouteRequest {
  origin: Location;
  destination: Location;
  mode: TransportationType;
}

export interface ExternalRouteResponse {
  distance: number; // in miles
  duration: number; // in minutes
  segments: RouteSegmentData[];
  polyline?: string;
  provider: 'google_maps' | 'geoapify';
}

export interface RouteSegmentData {
  startLat: number;
  startLng: number;
  endLat: number;
  endLng: number;
  distance: number; // in miles
  duration: number; // in minutes
  instructions?: string;
}

export class ExternalRouteAPIClient {
  private client: AxiosInstance;
  private config: ExternalRouteConfig;
  private retryCount: number = 0;

  constructor(config: ExternalRouteConfig) {
    this.config = {
      timeout: 5000,
      maxRetries: 3,
      ...config
    };

    this.client = axios.create({
      timeout: this.config.timeout,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }

  async calculateRoute(request: ExternalRouteRequest): Promise<ExternalRouteResponse> {
    try {
      if (this.config.provider === 'google_maps') {
        return await this.calculateGoogleMapsRoute(request);
      } else if (this.config.provider === 'geoapify') {
        return await this.calculateGeoapifyRoute(request);
      } else {
        throw new Error(`Unsupported provider: ${this.config.provider}`);
      }
    } catch (error) {
      if (this.shouldRetry(error) && this.retryCount < (this.config.maxRetries || 3)) {
        this.retryCount++;
        await this.delay(Math.pow(2, this.retryCount) * 1000); // Exponential backoff
        return this.calculateRoute(request);
      }
      
      this.retryCount = 0; // Reset retry count
      throw this.handleError(error);
    }
  }

  private async calculateGoogleMapsRoute(request: ExternalRouteRequest): Promise<ExternalRouteResponse> {
    const travelMode = this.mapToGoogleMapsMode(request.mode);
    const url = 'https://maps.googleapis.com/maps/api/directions/json';
    
    const params = {
      origin: `${request.origin.latitude},${request.origin.longitude}`,
      destination: `${request.destination.latitude},${request.destination.longitude}`,
      mode: travelMode,
      key: this.config.apiKey,
      units: 'imperial' // Use miles
    };

    const response = await this.client.get(url, { params });

    if (response.data.status !== 'OK') {
      throw new Error(`Google Maps API error: ${response.data.status} - ${response.data.error_message || 'Unknown error'}`);
    }

    return this.parseGoogleMapsResponse(response.data);
  }

  private async calculateGeoapifyRoute(request: ExternalRouteRequest): Promise<ExternalRouteResponse> {
    const mode = this.mapToGeoapifyMode(request.mode);
    const url = 'https://api.geoapify.com/v1/routing';
    
    const params = {
      waypoints: `${request.origin.latitude},${request.origin.longitude}|${request.destination.latitude},${request.destination.longitude}`,
      mode: mode,
      apiKey: this.config.apiKey,
      units: 'imperial', // Use miles
      details: 'instruction_details' // Request detailed step-by-step instructions
    };

    const response = await this.client.get(url, { params });

    if (!response.data.features || response.data.features.length === 0) {
      throw new Error('Geoapify API returned no routes');
    }

    // Debug logging to understand the response structure
    const feature = response.data.features[0];
    console.log('Geoapify feature properties:', JSON.stringify({
      mode: feature.properties.mode,
      distance: feature.properties.distance,
      time: feature.properties.time,
      hasLegs: !!feature.properties.legs,
      legsCount: feature.properties.legs?.length,
      hasSteps: !!feature.properties.legs?.[0]?.steps,
      stepsCount: feature.properties.legs?.[0]?.steps?.length,
      firstStep: feature.properties.legs?.[0]?.steps?.[0]
    }, null, 2));

    return this.parseGeoapifyResponse(response.data);
  }

  private parseGoogleMapsResponse(data: any): ExternalRouteResponse {
    const route = data.routes[0];
    const leg = route.legs[0];

    const segments: RouteSegmentData[] = leg.steps.map((step: any) => ({
      startLat: step.start_location.lat,
      startLng: step.start_location.lng,
      endLat: step.end_location.lat,
      endLng: step.end_location.lng,
      distance: step.distance.value * 0.000621371, // Convert meters to miles
      duration: step.duration.value / 60, // Convert seconds to minutes
      instructions: step.html_instructions?.replace(/<[^>]*>/g, '') // Strip HTML tags
    }));

    return {
      distance: leg.distance.value * 0.000621371, // Convert meters to miles
      duration: leg.duration.value / 60, // Convert seconds to minutes
      segments,
      polyline: route.overview_polyline?.points,
      provider: 'google_maps'
    };
  }

  private parseGeoapifyResponse(data: any): ExternalRouteResponse {
    const feature = data.features[0];
    const properties = feature.properties;

    // Parse segments with better error handling
    const segments: RouteSegmentData[] = [];
    
    if (properties.legs && properties.legs[0] && properties.legs[0].steps) {
      for (const step of properties.legs[0].steps) {
        // Geoapify uses different coordinate formats depending on the response
        // Try to extract coordinates safely
        let startLat, startLng, endLat, endLng;
        
        if (Array.isArray(step.from) && step.from.length >= 2) {
          startLng = step.from[0];
          startLat = step.from[1];
        } else if (step.from_location) {
          startLat = step.from_location.lat || step.from_location[1];
          startLng = step.from_location.lng || step.from_location[0];
        }
        
        if (Array.isArray(step.to) && step.to.length >= 2) {
          endLng = step.to[0];
          endLat = step.to[1];
        } else if (step.to_location) {
          endLat = step.to_location.lat || step.to_location[1];
          endLng = step.to_location.lng || step.to_location[0];
        }
        
        // Only add segment if we have valid coordinates
        if (startLat && startLng && endLat && endLng) {
          segments.push({
            startLat,
            startLng,
            endLat,
            endLng,
            distance: (step.distance || 0) * 0.000621371, // Convert meters to miles
            duration: (step.time || 0) / 60, // Convert seconds to minutes
            instructions: step.instruction?.text || step.instruction || ''
          });
        }
      }
    }
    
    // If no segments were parsed, create a basic segment from waypoints
    if (segments.length === 0 && properties.waypoints && properties.waypoints.length >= 2) {
      const origin = properties.waypoints[0].location;
      const destination = properties.waypoints[properties.waypoints.length - 1].location;
      
      segments.push({
        startLat: origin[0],
        startLng: origin[1],
        endLat: destination[0],
        endLng: destination[1],
        distance: properties.distance || 0,
        duration: (properties.time || 0) / 60,
        instructions: `Travel from origin to destination via ${properties.mode}`
      });
    }

    return {
      distance: properties.distance || 0,
      duration: (properties.time || 0) / 60,
      segments,
      polyline: feature.geometry?.coordinates,
      provider: 'geoapify'
    };
  }

  private mapToGoogleMapsMode(mode: TransportationType): string {
    switch (mode) {
      case 'walking':
        return 'walking';
      case 'cycling':
        return 'bicycling';
      case 'public_transit':
        return 'transit';
      case 'electric_vehicle':
      case 'conventional_vehicle':
      case 'rideshare':
        return 'driving';
      default:
        return 'driving';
    }
  }

  private mapToGeoapifyMode(mode: TransportationType): string {
    switch (mode) {
      case 'walking':
        return 'walk';
      case 'cycling':
        return 'bicycle';
      case 'public_transit':
        return 'transit';
      case 'electric_vehicle':
      case 'conventional_vehicle':
      case 'rideshare':
        return 'drive';
      default:
        return 'drive';
    }
  }

  private shouldRetry(error: any): boolean {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;
      // Retry on network errors or 5xx server errors
      return !axiosError.response || (axiosError.response.status >= 500 && axiosError.response.status < 600);
    }
    return false;
  }

  private handleError(error: any): Error {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;
      
      if (axiosError.code === 'ECONNABORTED') {
        return new Error('Route API request timed out. Please try again.');
      }
      
      if (!axiosError.response) {
        return new Error('Route API is unavailable. Please check your network connection.');
      }

      const status = axiosError.response.status;
      
      if (status === 429) {
        return new Error('Route API rate limit exceeded. Please try again later.');
      }
      
      if (status === 401 || status === 403) {
        return new Error('Route API authentication failed. Please check your API key.');
      }
      
      if (status >= 400 && status < 500) {
        const errorData = axiosError.response.data as any;
        return new Error(`Invalid route request: ${errorData?.error_message || 'Bad request'}`);
      }
      
      return new Error(`Route API error: ${status}`);
    }

    if (error instanceof Error) {
      return error;
    }

    return new Error('Unknown error occurred while calculating route');
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
