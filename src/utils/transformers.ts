import { Location } from '../models/Location';
import { RouteAlternative, RouteSegment } from '../models/RouteAlternative';
import { TransportationMode } from '../models/TransportationMode';
import { CarbonFootprint } from '../models/CarbonFootprint';
import { TransportationType, AccessibilityFeature, AvailabilityStatus } from '../models/common';

/**
 * External API response interfaces for transformation
 */
export interface ExternalLocationResponse {
  lat?: number;
  lng?: number;
  latitude?: number;
  longitude?: number;
  formatted_address?: string;
  address?: string;
  city?: string;
  locality?: string;
  country?: string;
  country_name?: string;
}

export interface ExternalRouteResponse {
  route_id?: string;
  id?: string;
  origin?: ExternalLocationResponse;
  destination?: ExternalLocationResponse;
  legs?: ExternalRouteLeg[];
  segments?: ExternalRouteLeg[];
  total_distance?: number;
  distance?: number;
  total_time?: number;
  duration?: number;
  travel_mode?: string;
  transportation_mode?: string;
}

export interface ExternalRouteLeg {
  start_location?: ExternalLocationResponse;
  end_location?: ExternalLocationResponse;
  distance?: { value?: number; text?: string };
  duration?: { value?: number; text?: string };
  travel_mode?: string;
  instructions?: string;
}

/**
 * Transforms external location response to internal Location model
 */
export function transformLocation(external: ExternalLocationResponse): Location {
  // Handle different coordinate field names
  const latitude = external.lat ?? external.latitude;
  const longitude = external.lng ?? external.longitude;

  if (latitude === undefined || longitude === undefined) {
    throw new Error('Invalid location data: missing coordinates');
  }

  return {
    latitude,
    longitude,
    address: external.formatted_address ?? external.address,
    city: external.city ?? external.locality,
    country: external.country ?? external.country_name
  };
}

/**
 * Transforms external route response to internal RouteAlternative model
 */
export function transformRouteAlternative(
  external: ExternalRouteResponse,
  carbonFootprint: CarbonFootprint,
  ecoScore: number
): RouteAlternative {
  if (!external.origin || !external.destination) {
    throw new Error('Invalid route data: missing origin or destination');
  }

  const origin = transformLocation(external.origin);
  const destination = transformLocation(external.destination);
  
  // Transform route segments
  const segments: RouteSegment[] = (external.legs ?? external.segments ?? []).map((leg, index) => {
    if (!leg.start_location || !leg.end_location) {
      throw new Error(`Invalid route segment ${index}: missing location data`);
    }

    return {
      id: `segment_${index}`,
      startLocation: transformLocation(leg.start_location),
      endLocation: transformLocation(leg.end_location),
      transportationMode: transformTransportationMode(leg.travel_mode ?? 'walking'),
      distance: extractDistance(leg.distance),
      estimatedTime: extractDuration(leg.duration),
      instructions: leg.instructions
    };
  });

  // Extract transportation modes from segments
  const transportationModes = segments.map(segment => segment.transportationMode);
  
  return {
    id: external.route_id ?? external.id ?? `route_${Date.now()}`,
    origin,
    destination,
    transportationModes,
    segments,
    totalDistance: external.total_distance ?? external.distance ?? segments.reduce((sum, seg) => sum + seg.distance, 0),
    estimatedTime: external.total_time ?? external.duration ?? segments.reduce((sum, seg) => sum + seg.estimatedTime, 0),
    carbonFootprint,
    ecoScore,
    accessibilityCompliant: false, // Will be determined by accessibility analysis
    cost: undefined // Will be calculated separately if needed
  };
}

/**
 * Transforms external transportation mode string to internal TransportationMode
 */
export function transformTransportationMode(externalMode: string): TransportationMode {
  const normalizedMode = externalMode.toLowerCase().replace(/[_-]/g, '');
  
  let type: TransportationType;
  let subtype: string | undefined;
  let emissionFactor: number;

  // Map external mode strings to internal types
  switch (normalizedMode) {
    case 'walking':
    case 'walk':
      type = 'walking';
      emissionFactor = 0;
      break;
    case 'cycling':
    case 'bicycle':
    case 'bike':
      type = 'cycling';
      emissionFactor = 0;
      break;
    case 'transit':
    case 'publictransit':
    case 'bus':
    case 'train':
    case 'subway':
    case 'metro':
      type = 'public_transit';
      subtype = normalizedMode === 'transit' || normalizedMode === 'publictransit' ? undefined : normalizedMode;
      emissionFactor = getPublicTransitEmissionFactor(subtype);
      break;
    case 'driving':
    case 'car':
    case 'automobile':
      type = 'conventional_vehicle';
      emissionFactor = 0.404; // kg CO2 per mile (EPA average)
      break;
    case 'electricvehicle':
    case 'ev':
      type = 'electric_vehicle';
      emissionFactor = 0.1; // kg CO2 per mile (varies by grid)
      break;
    case 'rideshare':
    case 'uber':
    case 'lyft':
      type = 'rideshare';
      emissionFactor = 0.5; // kg CO2 per mile (higher due to deadheading)
      break;
    default:
      type = 'conventional_vehicle';
      emissionFactor = 0.404;
  }

  return {
    type,
    subtype,
    emissionFactor,
    accessibilityFeatures: getDefaultAccessibilityFeatures(type),
    availability: 'available' as AvailabilityStatus
  };
}

/**
 * Extracts distance value from external API distance object
 */
function extractDistance(distance: { value?: number; text?: string } | number | undefined): number {
  if (typeof distance === 'number') {
    return distance;
  }
  
  if (distance?.value !== undefined) {
    return distance.value;
  }
  
  // Try to parse from text if available
  if (distance?.text) {
    const match = distance.text.match(/(\d+(?:\.\d+)?)/);
    if (match) {
      return parseFloat(match[1]);
    }
  }
  
  return 0;
}

/**
 * Extracts duration value from external API duration object
 */
function extractDuration(duration: { value?: number; text?: string } | number | undefined): number {
  if (typeof duration === 'number') {
    return duration;
  }
  
  if (duration?.value !== undefined) {
    return duration.value;
  }
  
  // Try to parse from text if available
  if (duration?.text) {
    const match = duration.text.match(/(\d+)/);
    if (match) {
      return parseInt(match[1]) * 60; // Assume minutes, convert to seconds
    }
  }
  
  return 0;
}

/**
 * Gets emission factor for public transit subtypes
 */
function getPublicTransitEmissionFactor(subtype?: string): number {
  switch (subtype) {
    case 'bus':
      return 0.15; // kg CO2 per mile
    case 'train':
      return 0.08; // kg CO2 per mile
    case 'subway':
    case 'metro':
      return 0.06; // kg CO2 per mile
    default:
      return 0.1; // kg CO2 per mile (average)
  }
}

/**
 * Gets default accessibility features for transportation type
 */
function getDefaultAccessibilityFeatures(type: TransportationType): AccessibilityFeature[] {
  const features: AccessibilityFeature[] = [];
  
  switch (type) {
    case 'walking':
      features.push(
        { type: 'wheelchair_accessible', description: 'Sidewalk accessibility', supported: false },
        { type: 'visual_impairment_support', description: 'Audio signals and tactile surfaces', supported: false }
      );
      break;
    case 'cycling':
      features.push(
        { type: 'adaptive_bike_support', description: 'Support for adaptive bicycles', supported: false }
      );
      break;
    case 'public_transit':
      features.push(
        { type: 'wheelchair_accessible', description: 'Wheelchair boarding and seating', supported: true },
        { type: 'audio_announcements', description: 'Audio stop announcements', supported: true },
        { type: 'visual_displays', description: 'Visual route information', supported: true }
      );
      break;
    case 'electric_vehicle':
    case 'conventional_vehicle':
    case 'rideshare':
      features.push(
        { type: 'wheelchair_accessible', description: 'Wheelchair accessible vehicle', supported: false },
        { type: 'mobility_aid_storage', description: 'Storage for mobility aids', supported: true }
      );
      break;
  }
  
  return features;
}

/**
 * Transforms multiple external route responses to RouteAlternative array
 */
export function transformRouteAlternatives(
  externalRoutes: ExternalRouteResponse[],
  carbonFootprints: CarbonFootprint[],
  ecoScores: number[]
): RouteAlternative[] {
  if (externalRoutes.length !== carbonFootprints.length || externalRoutes.length !== ecoScores.length) {
    throw new Error('Mismatched array lengths for route transformation');
  }

  return externalRoutes.map((route, index) => 
    transformRouteAlternative(route, carbonFootprints[index], ecoScores[index])
  );
}