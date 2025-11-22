# Route Planner Frontend

This document describes the frontend route planning interface implementation.

## Overview

The route planner allows users to:
- Enter origin and destination coordinates
- Select multiple transportation modes to compare
- View route alternatives with emissions data
- Compare routes side-by-side
- Save completed trips

## Components

### RouteInputForm
Location: `src/components/RouteInputForm.tsx`

A form component for entering route parameters:
- Origin location (latitude, longitude, optional name)
- Destination location (latitude, longitude, optional name)
- Transportation mode selection (walking, cycling, public transit, electric vehicle, car, rideshare)

**Props:**
- `onSubmit: (origin: Location, destination: Location, modes: string[]) => void` - Callback when form is submitted
- `loading?: boolean` - Whether the form should be in loading state

### RouteResults
Location: `src/components/RouteResults.tsx`

Displays calculated route alternatives as cards:
- Transportation mode icons and labels
- Distance, duration, and emissions
- Eco score badge
- Savings compared to baseline
- Save trip button for selected route

**Props:**
- `routes: RouteAlternative[]` - Array of route alternatives to display
- `onSelectRoute: (route: RouteAlternative) => void` - Callback when a route is selected
- `selectedRouteId?: string` - ID of currently selected route
- `onSaveTrip?: (route: RouteAlternative) => void` - Callback to save a trip
- `savingTripId?: string` - ID of route currently being saved

### RouteComparison
Location: `src/components/RouteComparison.tsx`

Visualizes route comparison:
- Summary cards showing best eco option and potential savings
- Bar chart comparing emissions across routes
- Detailed comparison table

**Props:**
- `routes: RouteAlternative[]` - Array of routes to compare

### RoutePlanner (Page)
Location: `src/pages/RoutePlanner.tsx`

Main route planner page that orchestrates all components:
- Manages state for routes, loading, errors, and selected route
- Calls backend API to calculate routes
- Handles trip saving
- Displays loading, error, and success states

## Services

### routeService
Location: `src/services/routeService.ts`

API service for route-related operations:
- `calculateRoutes(request)` - Calculate routes using backend API
- `saveTrip(request)` - Save a completed trip
- `getCachedRoute(routeId)` - Get a cached route by ID

## Integration

The route planner is integrated into the Dashboard component with a tabbed interface:
- Route Planner tab (default)
- Trip History tab (placeholder)
- Profile tab (placeholder)

## API Endpoints

The frontend expects the following backend endpoints:

### POST /api/routes/calculate
Calculate routes for given origin, destination, and modes.

**Request:**
```json
{
  "origin": {
    "latitude": 37.7749,
    "longitude": -122.4194,
    "name": "San Francisco"
  },
  "destination": {
    "latitude": 37.8044,
    "longitude": -122.2712,
    "name": "Oakland"
  },
  "modes": ["walking", "cycling", "public_transit"],
  "preferences": {}
}
```

**Response:**
```json
{
  "routes": [
    {
      "id": "route-1",
      "origin": {...},
      "destination": {...},
      "transportationModes": [...],
      "distance": 10.5,
      "duration": 120,
      "carbonFootprint": {
        "totalEmissions": 0.5
      },
      "ecoScore": 95
    }
  ]
}
```

### POST /api/routes/save-trip
Save a completed trip.

**Request:**
```json
{
  "origin": {...},
  "destination": {...},
  "selectedRoute": {...},
  "actualTransportationMode": "walking"
}
```

**Response:**
```json
{
  "tripId": "trip-123",
  "message": "Trip saved successfully"
}
```

### GET /api/routes/:id
Get a cached route by ID.

**Response:**
```json
{
  "id": "route-1",
  "origin": {...},
  "destination": {...},
  ...
}
```

## Styling

All styles are in `src/styles.css` with the following key classes:
- `.route-planner` - Main container
- `.planner-content` - Grid layout for sidebar and main content
- `.route-input-form` - Form styling
- `.mode-selector` - Transportation mode buttons
- `.route-results` - Results container
- `.route-card` - Individual route card
- `.route-comparison` - Comparison visualization

The design is fully responsive with breakpoints at:
- 1024px - Switches to single column layout
- 768px - Mobile-optimized forms and tables
- 480px - Compact mobile view

## Error Handling

The route planner handles the following error scenarios:
- Network errors when calling the API
- No routes found for given criteria
- Failed trip saving
- Invalid form inputs

All errors are displayed in a user-friendly error message banner.

## Loading States

Loading indicators are shown during:
- Route calculation (spinner with message)
- Trip saving (button disabled with "Saving..." text)

## Accessibility

The interface includes:
- Semantic HTML elements
- ARIA labels and roles
- Keyboard navigation support
- Focus indicators
- Screen reader friendly content

## Future Enhancements

Potential improvements:
- Map visualization of routes
- Address autocomplete instead of manual coordinates
- Real-time traffic updates
- Route preferences (avoid highways, prefer bike lanes, etc.)
- Multi-stop route planning
- Route sharing functionality
