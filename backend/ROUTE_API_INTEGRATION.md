# Real Route Calculation API Integration

This document explains how to configure and use the real route calculation API integration with Google Maps or Geoapify.

## Overview

The system now supports real route calculation using external mapping APIs (Google Maps API or Geoapify). When configured with a valid API key, the system will use real route data instead of mock calculations. The integration includes:

- External API client with error handling and retry logic
- Route caching to reduce API calls and costs
- Automatic fallback to mock API when external service is unavailable
- Support for both Google Maps and Geoapify providers

## Configuration

### Environment Variables

Add the following variables to your `.env` file:

```bash
# Choose one provider: google_maps or geoapify
ROUTE_API_PROVIDER=google_maps

# API Keys (only one is needed based on provider)
GOOGLE_MAPS_API_KEY=your-actual-google-maps-api-key
# GEOAPIFY_API_KEY=your-actual-geoapify-api-key

# Route API Configuration
ROUTE_API_TIMEOUT=5000
ROUTE_API_MAX_RETRIES=3
ROUTE_CACHE_ENABLED=true
ROUTE_CACHE_TTL_MINUTES=60
```

### Getting API Keys

#### Google Maps API
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the "Directions API"
4. Create credentials (API Key)
5. Restrict the API key to only the Directions API for security

#### Geoapify
1. Go to [Geoapify](https://www.geoapify.com/)
2. Sign up for a free account
3. Get your API key from the dashboard
4. The free tier includes 3,000 requests per day

## Usage

### Automatic Integration

Once configured, the `RoutePlannerService` will automatically use the real API:

```typescript
import { RoutePlannerService } from './services';

const routePlanner = new RoutePlannerService();

const routes = await routePlanner.calculateRoutes(
  { latitude: 40.7128, longitude: -74.0060 }, // New York
  { latitude: 40.7589, longitude: -73.9851 }  // Times Square
);
```

### Direct API Usage

You can also use the real route calculation service directly:

```typescript
import { RealRouteCalculationService } from './services';

const realRouteService = new RealRouteCalculationService({
  provider: 'google_maps',
  apiKey: 'your-api-key',
  enableCache: true,
  cacheTTLMinutes: 60
});

const route = await realRouteService.calculateRoute(
  origin,
  destination,
  'walking'
);
```

## Features

### Caching

Routes are automatically cached to reduce API calls:
- Default TTL: 60 minutes
- Cache key based on origin, destination, and transportation mode
- Automatic cleanup of expired entries
- Configurable via `ROUTE_CACHE_TTL_MINUTES`

### Error Handling

The system handles various error scenarios:
- **Network errors**: Automatic retry with exponential backoff
- **Rate limiting**: Returns 429 error with retry-after information
- **Invalid API key**: Returns authentication error
- **Service unavailable**: Falls back to cached routes if available
- **Timeout**: Configurable timeout (default 5 seconds)

### Fallback Behavior

When the external API fails:
1. First, tries to use cached route data
2. If no cache available, falls back to mock API
3. Logs warnings for debugging

## API Response Transformation

The system automatically transforms external API responses to the internal `RouteAlternative` format:

- Distance converted to miles
- Duration converted to minutes
- Segments extracted with turn-by-turn instructions
- Carbon footprint calculated based on transportation mode
- Eco-score computed using the EcoRankingService

## Testing

### Mock Mode

For testing without API keys, the system automatically uses mock calculations:
- No API key required
- Instant responses
- Deterministic results based on Haversine distance formula

### With Real API

To test with real API:
1. Set a valid API key in `.env`
2. Run the application
3. Check logs for "Real route calculation service initialized"

## Cost Optimization

To minimize API costs:

1. **Enable caching**: Set `ROUTE_CACHE_ENABLED=true`
2. **Increase cache TTL**: Adjust `ROUTE_CACHE_TTL_MINUTES` based on your needs
3. **Use appropriate provider**: Compare pricing between Google Maps and Geoapify
4. **Monitor usage**: Check the cache statistics regularly

### Cache Statistics

```typescript
const stats = routePlanner.realRouteService?.getCacheStats();
console.log(`Cache entries: ${stats.entries}`);
```

## Troubleshooting

### "No valid route API key configured"

This warning appears when:
- No API key is set in environment variables
- API key contains placeholder text (e.g., "your-google-maps-key-here")

**Solution**: Set a valid API key in your `.env` file

### "Route API is unavailable"

This error occurs when:
- External API is down
- Network connectivity issues
- Invalid API endpoint

**Solution**: Check your network connection and API service status

### "REQUEST_DENIED - The provided API key is invalid"

This error means:
- API key is incorrect
- API key doesn't have required permissions
- API is not enabled in your cloud console

**Solution**: Verify your API key and enable the required APIs

## Architecture

```
RoutePlannerService
    ↓
RealRouteCalculationService
    ↓
ExternalRouteAPIClient ←→ RouteCacheService
    ↓
Google Maps API / Geoapify API
```

## Files

- `backend/src/services/ExternalRouteAPIClient.ts` - API client with error handling
- `backend/src/services/RouteCacheService.ts` - Route caching layer
- `backend/src/services/RealRouteCalculationService.ts` - Main service integrating API and cache
- `backend/src/services/RoutePlannerService.ts` - Updated to use real API when configured
- `backend/src/config/index.ts` - Configuration management

## Requirements Satisfied

This implementation satisfies the following requirements from the design document:

- **Requirement 4.1**: Real route calculation using external mapping APIs
- **Requirement 4.2**: API response parsing and transformation
- **Requirement 4.4**: Fallback behavior when API is unavailable
- Route caching to reduce API calls
- Error handling with retry logic
- Support for multiple transportation modes
