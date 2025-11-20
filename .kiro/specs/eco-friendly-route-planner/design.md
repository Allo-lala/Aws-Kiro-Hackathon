# Design Document

## Overview

The Eco-Friendly Route Planner is designed as a modular, API-driven system that integrates multiple data sources to provide comprehensive environmental impact analysis for travel routes. The system employs a microservices architecture to handle route calculation, carbon footprint analysis, user tracking, and real-time updates independently while maintaining data consistency and performance.

## Architecture

The system follows a layered architecture with clear separation of concerns:

**Presentation Layer:**
- Web-based user interface for route input and results display
- Mobile-responsive design for on-the-go access
- Accessibility-compliant interface supporting screen readers and keyboard navigation

**Business Logic Layer:**
- Route calculation engine integrating multiple transportation APIs
- Carbon footprint calculation service using standardized emission factors
- User preference and accessibility filtering system
- Environmental impact tracking and analytics engine

**Data Layer:**
- Route and transportation data from external APIs (Google Maps, OpenStreetMap, GTFS)
- Environmental databases (EPA eGRID, IPCC emission factors)
- User profile and trip history storage
- Real-time transportation status feeds

**Integration Layer:**
- API gateway for external service coordination
- Data transformation and normalization services
- Caching layer for performance optimization
- Event-driven updates for real-time information

## Components and Interfaces

### Route Planning Service
**Interface:** `IRoutePlanner`
- `calculateRoutes(origin, destination, preferences): RouteAlternative[]`
- `getTransportationModes(location): TransportationMode[]`
- `validateLocation(location): LocationValidation`

### Carbon Footprint Calculator
**Interface:** `ICarbonCalculator`
- `calculateEmissions(route, transportationMode): CarbonFootprint`
- `getEmissionFactor(transportationMode, region): EmissionFactor`
- `compareAlternatives(routes): EcoScoreComparison`

### User Tracking Service
**Interface:** `IUserTracker`
- `recordTrip(userId, route, actualMode): TripRecord`
- `calculateSavings(userId, timeframe): SustainabilityMetrics`
- `getUserPreferences(userId): UserPreferences`
- `updateAccessibilityNeeds(userId, needs): void`

### Real-time Update Service
**Interface:** `IRealtimeUpdater`
- `subscribeToUpdates(routes): UpdateSubscription`
- `handleDisruption(disruption): RouteUpdate[]`
- `refreshRouteData(routeId): RouteAlternative`

## Data Models

### RouteAlternative
```typescript
interface RouteAlternative {
  id: string;
  origin: Location;
  destination: Location;
  transportationModes: TransportationMode[];
  segments: RouteSegment[];
  totalDistance: number;
  estimatedTime: number;
  carbonFootprint: CarbonFootprint;
  ecoScore: number;
  accessibilityCompliant: boolean;
  cost?: number;
}
```

### CarbonFootprint
```typescript
interface CarbonFootprint {
  totalEmissions: number; // kg CO2 equivalent
  emissionsBySegment: SegmentEmission[];
  methodology: string;
  dataSources: string[];
  calculationTimestamp: Date;
}
```

### TransportationMode
```typescript
interface TransportationMode {
  type: 'walking' | 'cycling' | 'public_transit' | 'electric_vehicle' | 'conventional_vehicle' | 'rideshare';
  subtype?: string; // e.g., 'bus', 'train', 'subway'
  emissionFactor: number; // kg CO2 per mile
  accessibilityFeatures: AccessibilityFeature[];
  availability: AvailabilityStatus;
}
```

### UserPreferences
```typescript
interface UserPreferences {
  userId: string;
  maxWalkingDistance: number;
  preferredTransportationModes: TransportationMode[];
  accessibilityNeeds: AccessibilityRequirement[];
  sustainabilityPriority: 'high' | 'medium' | 'low';
  timeVsEnvironmentWeight: number; // 0-1 scale
}
```
## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property Reflection

After analyzing all acceptance criteria, several properties can be consolidated to eliminate redundancy:
- Properties about carbon footprint display and calculation can be combined into comprehensive validation
- Route ranking and prioritization properties can be unified under consistent ordering behavior
- Accessibility filtering and eco-friendly prioritization can be merged into constraint-aware optimization

**Property 1: Route calculation completeness**
*For any* valid origin and destination pair, the route calculation should return multiple alternatives with different transportation modes, and each alternative should contain valid carbon footprint estimates
**Validates: Requirements 1.1, 1.2**

**Property 2: Eco-friendly route ranking**
*For any* set of route alternatives, they should be ranked by eco-score from most to least environmentally friendly, with public transit prioritized over private vehicles when available
**Validates: Requirements 1.3, 2.4**

**Property 3: Transportation mode carbon footprint consistency**
*For any* transportation mode comparison, each mode should display carbon footprint per mile alongside time estimates, with walking and cycling highlighted as zero-emission when feasible
**Validates: Requirements 2.1, 2.2, 2.5**

**Property 4: Route efficiency optimization**
*For any* set of routes using the same transportation mode, the most efficient path should be recommended
**Validates: Requirements 2.3**

**Property 5: Savings calculation accuracy**
*For any* completed eco-friendly trip, the carbon footprint savings should be correctly calculated compared to conventional alternatives and stored in user history
**Validates: Requirements 3.1**

**Property 6: Cumulative tracking consistency**
*For any* user's trip history, cumulative environmental impact reductions should be accurately aggregated and milestone notifications should trigger at appropriate thresholds
**Validates: Requirements 3.2, 3.3**

**Property 7: Data export completeness**
*For any* export request, generated reports should include all sustainability metrics and environmental impact trends
**Validates: Requirements 3.4**

**Property 8: Accessibility-aware eco-optimization**
*For any* accessibility preferences, route filtering should include only accessible transportation modes while maintaining focus on minimizing carbon footprint within those constraints
**Validates: Requirements 4.1, 4.2**

**Property 9: Disruption response consistency**
*For any* transportation disruption, affected routes should be automatically recalculated with eco-friendly alternatives prioritized and users notified of updates
**Validates: Requirements 5.1, 5.2, 5.4**

**Property 10: Real-time data integration**
*For any* real-time delay information, time estimates and carbon footprint calculations should be updated accordingly
**Validates: Requirements 5.3**

**Property 11: Calculation transparency**
*For any* carbon footprint estimate, methodology explanations and authoritative data source citations should be provided
**Validates: Requirements 6.1, 6.4**

**Property 12: Detailed breakdown availability**
*For any* calculation request, detailed emissions breakdown by transportation mode and distance should be available
**Validates: Requirements 6.2**

## Error Handling

**Input Validation:**
- Location validation with fuzzy matching for user-friendly error recovery
- Accessibility preference validation with clear constraint explanations
- Route parameter bounds checking with helpful correction suggestions

**External API Failures:**
- Graceful degradation when route APIs are unavailable
- Cached route data fallback for common origin-destination pairs
- Clear user communication about reduced functionality during outages

**Data Inconsistency:**
- Carbon footprint calculation validation against multiple data sources
- Real-time data staleness detection and user notification
- Automatic retry mechanisms for transient calculation failures

**Performance Constraints:**
- Route calculation timeout handling with partial results
- Memory management for large route datasets
- Rate limiting protection for external API calls

## Testing Strategy

**Dual Testing Approach:**
The system will employ both unit testing and property-based testing to ensure comprehensive coverage:

- **Unit tests** verify specific examples, edge cases, and error conditions
- **Property tests** verify universal properties that should hold across all inputs
- Together they provide comprehensive coverage: unit tests catch concrete bugs, property tests verify general correctness

**Unit Testing:**
- Specific route calculation examples with known expected results
- Edge cases like invalid locations, accessibility conflicts, and API failures
- Integration points between route planning and carbon footprint services
- User interface interactions and data display formatting

**Property-Based Testing:**
- **Framework:** QuickCheck for JavaScript/TypeScript will be used for property-based testing
- **Configuration:** Each property-based test will run a minimum of 100 iterations
- **Tagging:** Each property-based test will include a comment with format: '**Feature: eco-friendly-route-planner, Property {number}: {property_text}**'
- **Implementation:** Each correctness property will be implemented by a single property-based test
- **Coverage:** Property tests will validate universal behaviors across randomly generated inputs including locations, user preferences, and transportation scenarios

**Test Data Generation:**
- Smart generators for valid location pairs within supported regions
- Realistic transportation mode combinations based on geographic constraints
- User preference variations including accessibility needs and sustainability priorities
- Disruption scenarios covering common transportation issues

**Performance Testing:**
- Route calculation response time validation under various load conditions
- Carbon footprint calculation accuracy benchmarks against known emission factors
- Real-time update latency measurement and optimization