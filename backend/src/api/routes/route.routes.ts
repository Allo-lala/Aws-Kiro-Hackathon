import { Router, Request, Response } from 'express';
import { body, param } from 'express-validator';
import { DatabaseService } from '../../services/DatabaseService';
import { authenticateJWT, optionalAuth } from '../../middleware/auth';
import { validateRequest } from '../../middleware/validation';
import { routeLimiter } from '../../middleware/rateLimiter';
import { RealRouteCalculationService } from '../../services/RealRouteCalculationService';
import { Location } from '../../models/Location';
import { TransportationType } from '../../models/common';
import { userService } from '../../services/UserService';

/**
 * Create route router
 * Handles route calculation and trip saving
 */
export function createRouteRouter(
  databaseService: DatabaseService,
  routeService?: RealRouteCalculationService
): Router {
  const router = Router();

  // Apply route-specific rate limiting
  router.use(routeLimiter);

  /**
   * POST /api/routes/calculate
   * Calculate routes with real API (optional authentication)
   */
  router.post(
    '/calculate',
    optionalAuth(databaseService),
    [
      body('origin')
        .isObject()
        .withMessage('Origin must be an object'),
      body('origin.latitude')
        .isFloat({ min: -90, max: 90 })
        .withMessage('Origin latitude must be between -90 and 90'),
      body('origin.longitude')
        .isFloat({ min: -180, max: 180 })
        .withMessage('Origin longitude must be between -180 and 180'),
      body('destination')
        .isObject()
        .withMessage('Destination must be an object'),
      body('destination.latitude')
        .isFloat({ min: -90, max: 90 })
        .withMessage('Destination latitude must be between -90 and 90'),
      body('destination.longitude')
        .isFloat({ min: -180, max: 180 })
        .withMessage('Destination longitude must be between -180 and 180'),
      body('modes')
        .optional()
        .isArray()
        .withMessage('Modes must be an array'),
      body('preferences')
        .optional()
        .isObject()
        .withMessage('Preferences must be an object'),
      validateRequest,
    ],
    async (req: Request, res: Response) => {
      try {
        const { origin, destination, modes, preferences } = req.body;

        // Validate that route service is configured
        if (!routeService) {
          res.status(503).json({
            success: false,
            error: 'Route calculation service is not configured',
            code: 'SERVICE_NOT_CONFIGURED',
          });
          return;
        }

        // Create Location objects
        const originLocation: Location = {
          latitude: origin.latitude,
          longitude: origin.longitude,
          name: origin.name,
        };

        const destinationLocation: Location = {
          latitude: destination.latitude,
          longitude: destination.longitude,
          name: destination.name,
        };

        // Default modes if not provided
        const transportModes: TransportationType[] = modes || [
          'walking',
          'cycling',
          'public_transit',
          'driving',
        ];

        // Calculate routes for all modes
        const routeResults = await routeService.calculateMultiModeRoutes(
          originLocation,
          destinationLocation,
          transportModes
        );

        // Transform results to response format
        const routes = Array.from(routeResults.entries()).map(([mode, response]) => ({
          mode,
          distance: response.distance,
          duration: response.duration,
          segments: response.segments,
          polyline: response.polyline,
          provider: response.provider,
        }));

        res.json({
          success: true,
          data: {
            routes,
            origin: originLocation,
            destination: destinationLocation,
            calculatedAt: new Date().toISOString(),
          },
        });
      } catch (error) {
        console.error('Route calculation error:', error);

        if (error instanceof Error) {
          // Handle specific error types
          if (error.message.includes('API key') || error.message.includes('authentication')) {
            res.status(401).json({
              success: false,
              error: 'External API authentication failed',
              code: 'API_AUTH_FAILED',
            });
            return;
          }

          if (error.message.includes('rate limit') || error.message.includes('quota')) {
            res.status(429).json({
              success: false,
              error: 'API rate limit exceeded. Please try again later.',
              code: 'RATE_LIMIT_EXCEEDED',
            });
            return;
          }

          if (error.message.includes('timeout')) {
            res.status(504).json({
              success: false,
              error: 'Route calculation timed out. Please try again.',
              code: 'TIMEOUT',
            });
            return;
          }

          if (error.message.includes('not found') || error.message.includes('no route')) {
            res.status(404).json({
              success: false,
              error: 'No route found for the given locations',
              code: 'NO_ROUTE_FOUND',
            });
            return;
          }
        }

        res.status(500).json({
          success: false,
          error: 'Failed to calculate routes',
          code: 'CALCULATION_FAILED',
        });
      }
    }
  );

  /**
   * POST /api/routes/save-trip
   * Save a completed trip (requires authentication)
   */
  router.post(
    '/save-trip',
    authenticateJWT(databaseService),
    [
      body('originLat')
        .isFloat({ min: -90, max: 90 })
        .withMessage('Origin latitude must be between -90 and 90'),
      body('originLng')
        .isFloat({ min: -180, max: 180 })
        .withMessage('Origin longitude must be between -180 and 180'),
      body('originName')
        .optional()
        .isString()
        .withMessage('Origin name must be a string'),
      body('destinationLat')
        .isFloat({ min: -90, max: 90 })
        .withMessage('Destination latitude must be between -90 and 90'),
      body('destinationLng')
        .isFloat({ min: -180, max: 180 })
        .withMessage('Destination longitude must be between -180 and 180'),
      body('destinationName')
        .optional()
        .isString()
        .withMessage('Destination name must be a string'),
      body('selectedRoute')
        .isObject()
        .withMessage('Selected route must be an object'),
      body('actualTransportationMode')
        .isString()
        .notEmpty()
        .withMessage('Actual transportation mode is required'),
      body('carbonSavings')
        .optional()
        .isFloat({ min: 0 })
        .withMessage('Carbon savings must be a positive number'),
      body('distance')
        .optional()
        .isFloat({ min: 0 })
        .withMessage('Distance must be a positive number'),
      body('duration')
        .optional()
        .isInt({ min: 0 })
        .withMessage('Duration must be a positive integer'),
      body('completedAt')
        .optional()
        .isISO8601()
        .withMessage('Completed at must be a valid ISO 8601 date'),
      validateRequest,
    ],
    async (req: Request, res: Response) => {
      try {
        const userId = req.user!.id;

        const tripInput = {
          originLat: req.body.originLat,
          originLng: req.body.originLng,
          originName: req.body.originName,
          destinationLat: req.body.destinationLat,
          destinationLng: req.body.destinationLng,
          destinationName: req.body.destinationName,
          selectedRoute: req.body.selectedRoute,
          actualTransportationMode: req.body.actualTransportationMode,
          carbonSavings: req.body.carbonSavings,
          distance: req.body.distance,
          duration: req.body.duration,
          completedAt: req.body.completedAt ? new Date(req.body.completedAt) : new Date(),
        };

        const trip = await userService.createTrip(userId, tripInput);

        res.status(201).json({
          success: true,
          message: 'Trip saved successfully',
          data: trip,
        });
      } catch (error) {
        console.error('Error saving trip:', error);
        res.status(500).json({
          success: false,
          error: 'Failed to save trip',
        });
      }
    }
  );

  /**
   * GET /api/routes/:routeId
   * Get cached route details (optional authentication)
   */
  router.get(
    '/:routeId',
    optionalAuth(databaseService),
    [
      param('routeId')
        .isUUID()
        .withMessage('Route ID must be a valid UUID'),
      validateRequest,
    ],
    async (req: Request, res: Response) => {
      try {
        const { routeId } = req.params;

        // This would typically fetch from a route cache or database
        // For now, return a placeholder response
        res.json({
          success: true,
          message: 'Route details endpoint - implementation pending',
          data: {
            routeId,
          },
        });
      } catch (error) {
        console.error('Error fetching route details:', error);
        res.status(500).json({
          success: false,
          error: 'Failed to fetch route details',
        });
      }
    }
  );

  return router;
}
