# Design Document

## Overview

This design document outlines the implementation of a location autocomplete feature for the route planner. The feature will replace the current manual latitude/longitude input with an intelligent search interface that queries the Geoapify Autocomplete API. Users will be able to search for any location worldwide by typing place names, addresses, or landmarks, and select from real-time suggestions.

The implementation will include a reusable autocomplete component, API integration with proper error handling and rate limiting, keyboard navigation, mobile responsiveness, and optional features like current location detection and recent searches.

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    RouteInputForm Component                  │
│  ┌────────────────────┐      ┌────────────────────┐        │
│  │ LocationAutocomplete│      │ LocationAutocomplete│        │
│  │    (Origin)         │      │   (Destination)     │        │
│  └─────────┬───────────┘      └─────────┬───────────┘        │
│            │                            │                     │
│            └────────────┬───────────────┘                     │
│                         │                                     │
└─────────────────────────┼─────────────────────────────────────┘
                          │
                          ▼
              ┌───────────────────────┐
              │  GeoapifyService      │
              │  - autocomplete()     │
              │  - reverseGeocode()   │
              └───────────┬───────────┘
                          │
                          ▼
              ┌───────────────────────┐
              │  Geoapify API         │
              │  (External Service)   │
              └───────────────────────┘
```

### Component Hierarchy

1. **RouteInputForm** (existing component, modified)
   - Replaces manual lat/lng inputs with LocationAutocomplete components
   - Receives selected locations from autocomplete components
   - Maintains form state and submission logic

2. **LocationAutocomplete** (new component)
   - Manages search input and suggestions dropdown
   - Handles user interactions (typing, selection, keyboard navigation)
   - Integrates with GeoapifyService for location search
   - Manages recent locations from local storage

3. **GeoapifyService** (new service)
   - Encapsulates all Geoapify API interactions
   - Provides autocomplete search functionality
   - Provides reverse geocoding for current location
   - Handles API errors and rate limiting

## Components and Interfaces

### LocationAutocomplete Component

**Props Interface:**
```typescript
interface LocationAutocompleteProps {
  label: string;                    // "Origin" or "Destination"
  placeholder?: string;              // Input placeholder text
  value: Location | null;            // Currently selected location
  onChange: (location: Location | null) => void;  // Callback when location changes
  disabled?: boolean;                // Disable input during loading
  showCurrentLocation?: boolean;     // Show "Use Current Location" option
  error?: string;                    // Error message to display
}
```

**State:**
```typescript
interface LocationAutocompleteState {
  inputValue: string;                // Current text in input field
  suggestions: PlaceSuggestion[];    // API results
  recentLocations: Location[];       // From local storage
  isLoading: boolean;                // API request in progress
  isOpen: boolean;                   // Dropdown visibility
  highlightedIndex: number;          // For keyboard navigation
  error: string | null;              // Error message
}
```

**Key Methods:**
- `handleInputChange(value: string)`: Debounced search trigger
- `handleSuggestionSelect(suggestion: PlaceSuggestion)`: Process selection
- `handleKeyDown(event: KeyboardEvent)`: Keyboard navigation
- `handleCurrentLocation()`: Geolocation API integration
- `loadRecentLocations()`: Load from local storage
- `saveRecentLocation(location: Location)`: Save to local storage

### GeoapifyService

**Interface:**
```typescript
interface GeoapifyService {
  autocomplete(query: string, options?: AutocompleteOptions): Promise<PlaceSuggestion[]>;
  reverseGeocode(lat: number, lon: number): Promise<Location>;
}

interface AutocompleteOptions {
  limit?: number;           // Max results (default: 5)
  lang?: string;            // Language code (default: 'en')
  filter?: {
    countrycode?: string[]; // Restrict to countries
    circle?: {              // Restrict to radius
      lat: number;
      lon: number;
      radius: number;
    };
  };
}

interface PlaceSuggestion {
  placeId: string;
  name: string;
  address: string;
  city?: string;
  state?: string;
  country: string;
  latitude: number;
  longitude: number;
  resultType: string;       // 'amenity', 'street', 'city', etc.
}
```

**Implementation Details:**
- Base URL: `https://api.geoapify.com/v1/geocode/autocomplete`
- API Key: Stored in environment variable `REACT_APP_GEOAPIFY_API_KEY`
- Request debouncing: 300ms delay
- Error handling: Network errors, rate limits, invalid responses
- Response transformation: Convert Geoapify format to PlaceSuggestion format

## Data Models

### Location (existing, no changes needed)
```typescript
interface Location {
  latitude: number;
  longitude: number;
  name?: string;
  address?: string;
}
```

### PlaceSuggestion (new)
```typescript
interface PlaceSuggestion {
  placeId: string;          // Unique identifier from Geoapify
  name: string;             // Primary place name
  address: string;          // Full formatted address
  city?: string;            // City name
  state?: string;           // State/province
  country: string;          // Country name
  latitude: number;         // Coordinate
  longitude: number;        // Coordinate
  resultType: string;       // Type of place (amenity, street, city, etc.)
}
```

### RecentLocation (new)
```typescript
interface RecentLocation extends Location {
  timestamp: number;        // When it was last used
  searchCount: number;      // How many times used
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Search query triggers API call
*For any* search query with 3 or more characters, typing in the location input should trigger an API call to Geoapify autocomplete endpoint after the debounce delay
**Validates: Requirements 1.1**

### Property 2: Suggestions contain required fields
*For any* location suggestion returned from the API, the suggestion should contain name, address, country, latitude, and longitude fields
**Validates: Requirements 1.2**

### Property 3: Selection populates location data
*For any* location suggestion, when selected by the user, the location field should be populated with the place name and the coordinates should be stored in the component state
**Validates: Requirements 1.3**

### Property 4: Clear input clears location
*For any* location autocomplete component with a selected location, clearing the input field should clear the stored coordinates and hide the suggestions dropdown
**Validates: Requirements 1.4**

### Property 5: Global search returns worldwide results
*For any* valid location query, the API request should not include geographic restrictions, allowing results from any country
**Validates: Requirements 2.1**

### Property 6: Debouncing prevents excessive API calls
*For any* sequence of rapid keystrokes in the search field, only one API call should be made after the user stops typing for 300ms
**Validates: Requirements 3.1, 3.2**

### Property 7: Keyboard navigation cycles through suggestions
*For any* list of suggestions, pressing the down arrow key should move the highlight to the next suggestion, wrapping to the first when reaching the end
**Validates: Requirements 4.2**

### Property 8: Enter key selects highlighted suggestion
*For any* highlighted suggestion in the dropdown, pressing the Enter key should select that location and close the dropdown
**Validates: Requirements 4.4**

### Property 9: Escape key closes dropdown
*For any* open suggestions dropdown, pressing the Escape key should close the dropdown without selecting a location
**Validates: Requirements 4.5**

### Property 10: Recent locations are stored and retrieved
*For any* location selected from autocomplete, that location should be stored in local storage and appear in the recent locations list on subsequent searches
**Validates: Requirements 8.1, 8.2**

### Property 11: Recent locations appear before API results
*For any* location input with recent locations available, when the input receives focus, recent locations should be displayed above any API search results
**Validates: Requirements 8.4**

### Property 12: API errors display user-friendly messages
*For any* failed API request (network error, rate limit, invalid response), an appropriate error message should be displayed to the user
**Validates: Requirements 3.4, 6.4**

## Error Handling

### API Errors

1. **Network Errors**
   - Catch fetch errors and display: "Unable to connect to location service. Please check your internet connection."
   - Allow user to retry by typing again

2. **Rate Limiting (HTTP 429)**
   - Display: "Too many searches. Please wait a moment and try again."
   - Implement exponential backoff for retries

3. **Invalid API Key (HTTP 401/403)**
   - Display: "Location search is temporarily unavailable. Please try again later."
   - Log error to console for developers

4. **Invalid Response Format**
   - Catch JSON parsing errors
   - Display: "Unable to process location results. Please try a different search."

5. **No Results**
   - Display: "No locations found. Try a different search term."
   - Suggest checking spelling or being more specific

### Geolocation Errors

1. **Permission Denied**
   - Display: "Location access denied. Please enable location permissions in your browser settings."

2. **Position Unavailable**
   - Display: "Unable to determine your location. Please enter a location manually."

3. **Timeout**
   - Display: "Location request timed out. Please try again or enter a location manually."

### Local Storage Errors

1. **Storage Full**
   - Silently fail to save recent locations
   - Continue normal operation without recent locations feature

2. **Storage Unavailable (Private Browsing)**
   - Detect and disable recent locations feature
   - Continue normal operation

## Testing Strategy

### Unit Tests

We will write focused unit tests for specific behaviors and edge cases:

1. **GeoapifyService Tests**
   - Test API URL construction with various query parameters
   - Test response transformation from Geoapify format to PlaceSuggestion format
   - Test error handling for different HTTP status codes
   - Test that API key is included in requests

2. **LocationAutocomplete Component Tests**
   - Test that component renders with correct initial state
   - Test that selecting a suggestion calls onChange callback with correct location
   - Test that clearing input resets component state
   - Test that "Use Current Location" button appears when showCurrentLocation prop is true
   - Test error message display when error prop is provided

3. **Local Storage Integration Tests**
   - Test saving a location to recent locations
   - Test loading recent locations on component mount
   - Test that recent locations list is limited to 5 items
   - Test graceful degradation when local storage is unavailable

### Property-Based Tests

We will use **fast-check** (a property-based testing library for TypeScript/JavaScript) to verify universal properties across many randomly generated inputs.

**Configuration:**
- Minimum 100 iterations per property test
- Each test will be tagged with the format: `**Feature: location-autocomplete, Property {number}: {property_text}**`

**Property Tests to Implement:**

1. **Property 1: Search query triggers API call**
   - Generate random strings of length >= 3
   - Verify that typing triggers debounced API call
   - Verify strings < 3 characters don't trigger API call

2. **Property 2: Suggestions contain required fields**
   - Generate random valid API responses
   - Verify all suggestions have name, address, country, latitude, longitude

3. **Property 3: Selection populates location data**
   - Generate random place suggestions
   - Verify selecting any suggestion populates location with correct data

4. **Property 4: Clear input clears location**
   - Generate random location states
   - Verify clearing input always resets to null location

5. **Property 6: Debouncing prevents excessive API calls**
   - Generate random sequences of keystrokes with varying timing
   - Verify only one API call is made after typing stops

6. **Property 7: Keyboard navigation cycles through suggestions**
   - Generate random suggestion lists of varying lengths
   - Verify arrow key navigation wraps correctly

7. **Property 10: Recent locations are stored and retrieved**
   - Generate random locations
   - Verify each selected location is stored and retrievable

8. **Property 11: Recent locations appear before API results**
   - Generate random combinations of recent locations and API results
   - Verify recent locations always appear first in the list

**Test Execution:**
- Tests will run with `npm test` or `npm run test:watch`
- Property tests will run alongside unit tests
- CI/CD pipeline will run all tests before deployment

## Implementation Notes

### Geoapify API Integration

**Autocomplete Endpoint:**
```
GET https://api.geoapify.com/v1/geocode/autocomplete
  ?text={query}
  &apiKey={API_KEY}
  &limit=5
  &lang=en
```

**Response Format:**
```json
{
  "features": [
    {
      "properties": {
        "place_id": "...",
        "name": "Central Park",
        "formatted": "Central Park, New York, NY, USA",
        "city": "New York",
        "state": "New York",
        "country": "United States",
        "lat": 40.785091,
        "lon": -73.968285,
        "result_type": "amenity"
      }
    }
  ]
}
```

### Debouncing Implementation

Use a custom `useDebounce` hook or lodash's `debounce` function:

```typescript
const debouncedSearch = useMemo(
  () => debounce((query: string) => {
    geoapifyService.autocomplete(query).then(setSuggestions);
  }, 300),
  []
);
```

### Keyboard Navigation

Track highlighted index in state and handle keyboard events:

```typescript
const handleKeyDown = (e: KeyboardEvent) => {
  switch (e.key) {
    case 'ArrowDown':
      setHighlightedIndex(prev => 
        prev < suggestions.length - 1 ? prev + 1 : 0
      );
      break;
    case 'ArrowUp':
      setHighlightedIndex(prev => 
        prev > 0 ? prev - 1 : suggestions.length - 1
      );
      break;
    case 'Enter':
      if (highlightedIndex >= 0) {
        handleSelect(suggestions[highlightedIndex]);
      }
      break;
    case 'Escape':
      setIsOpen(false);
      break;
  }
};
```

### Mobile Considerations

1. Use `position: fixed` for dropdown on mobile to prevent scrolling issues
2. Add touch event handlers in addition to click handlers
3. Increase touch target sizes to minimum 44x44 pixels
4. Use `preventDefault()` on touch events to prevent double-tap zoom
5. Close dropdown when user taps outside (use click-outside detection)

### Environment Variables

Add to `.env` and `.env.example`:
```
REACT_APP_GEOAPIFY_API_KEY=your_api_key_here
```

Webpack will automatically inject this at build time via `process.env.REACT_APP_GEOAPIFY_API_KEY`.

### Styling Considerations

1. Dropdown should have z-index high enough to appear above other elements
2. Use CSS transitions for smooth dropdown open/close
3. Highlight selected/hovered suggestions with distinct background color
4. Show loading spinner inside input field during API requests
5. Use icons for "Use Current Location" and recent locations
6. Ensure sufficient color contrast for accessibility (WCAG AA)

## Performance Considerations

1. **Debouncing**: 300ms delay prevents excessive API calls
2. **Request Cancellation**: Cancel in-flight requests when new search is triggered
3. **Memoization**: Memoize debounced function to prevent recreation on re-renders
4. **Lazy Loading**: Only load geolocation API when "Use Current Location" is clicked
5. **Local Storage**: Limit recent locations to 5 items to prevent storage bloat
6. **Virtual Scrolling**: Not needed for small suggestion lists (5-10 items)

## Security Considerations

1. **API Key Protection**: Store in environment variables, never commit to source control
2. **Input Sanitization**: Sanitize user input before sending to API (prevent injection)
3. **HTTPS Only**: Ensure all API requests use HTTPS
4. **Rate Limiting**: Respect Geoapify's rate limits (client-side throttling)
5. **Error Messages**: Don't expose sensitive information in error messages
6. **CORS**: Geoapify supports CORS, no proxy needed

## Accessibility

1. **ARIA Labels**: Add `aria-label` to input fields and buttons
2. **ARIA Live Regions**: Announce suggestion count to screen readers
3. **Keyboard Navigation**: Full keyboard support (arrows, enter, escape)
4. **Focus Management**: Maintain focus on input when navigating suggestions
5. **Color Contrast**: Ensure WCAG AA compliance for all text
6. **Screen Reader Announcements**: Announce loading state and errors

## Browser Compatibility

- **Modern Browsers**: Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
- **Geolocation API**: Supported in all modern browsers
- **Local Storage**: Supported in all modern browsers
- **Fetch API**: Supported in all modern browsers (polyfill not needed)

## Future Enhancements

1. **Favorites**: Allow users to save favorite locations (home, work)
2. **Map Preview**: Show selected location on a small map preview
3. **Category Filtering**: Filter suggestions by type (restaurants, parks, etc.)
4. **Multi-Language**: Support multiple languages based on user preference
5. **Offline Support**: Cache recent searches for offline access
6. **Voice Input**: Add voice search capability
7. **Smart Suggestions**: Learn from user behavior to improve suggestions
