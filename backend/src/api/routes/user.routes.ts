import { Router, Request, Response } from 'express';
import { body, query, param } from 'express-validator';
import { DatabaseService } from '../../services/DatabaseService';
import { authenticateJWT } from '../../middleware/auth';
import { validateRequest } from '../../middleware/validation';
import { userService, UserPreferencesInput, TripInput, TripFilters } from '../../services/UserService';

/**
 * Create user router
 * Handles user profile, preferences, trips, and statistics
 */
export function createUserRouter(databaseService: DatabaseService): Router {
  const router = Router();

  // All user routes require authentication
  router.use(authenticateJWT(databaseService));

  /**
   * GET /api/users/me
   * Get current user profile
   */
  router.get('/me', async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;

      const user = await userService.getUserById(userId);

      if (!user) {
        res.status(404).json({
          success: false,
          error: 'User not found',
        });
        return;
      }

      // Remove sensitive data
      const { passwordHash, emailVerificationToken, passwordResetToken, ...safeUser } = user;

      res.json({
        success: true,
        data: safeUser,
      });
    } catch (error) {
      console.error('Error fetching user profile:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch user profile',
      });
    }
  });

  /**
   * GET /api/users/me/preferences
   * Get user preferences
   */
  router.get('/me/preferences', async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;

      const preferences = await userService.getUserPreferences(userId);

      if (!preferences) {
        res.status(404).json({
          success: false,
          error: 'Preferences not found',
        });
        return;
      }

      res.json({
        success: true,
        data: preferences,
      });
    } catch (error) {
      console.error('Error fetching user preferences:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch user preferences',
      });
    }
  });

  /**
   * PUT /api/users/me/preferences
   * Create or update user preferences
   */
  router.put(
    '/me/preferences',
    [
      body('maxWalkingDistance')
        .optional()
        .isFloat({ min: 0 })
        .withMessage('Max walking distance must be a positive number'),
      body('preferredModes')
        .optional()
        .isArray()
        .withMessage('Preferred modes must be an array'),
      body('accessibilityNeeds')
        .optional()
        .isObject()
        .withMessage('Accessibility needs must be an object'),
      body('sustainabilityPriority')
        .optional()
        .isString()
        .withMessage('Sustainability priority must be a string'),
      body('timeVsEnvironmentWeight')
        .optional()
        .isFloat({ min: 0, max: 1 })
        .withMessage('Time vs environment weight must be between 0 and 1'),
      validateRequest,
    ],
    async (req: Request, res: Response) => {
      try {
        const userId = req.user!.id;

        const preferencesInput: UserPreferencesInput = {
          maxWalkingDistance: req.body.maxWalkingDistance,
          preferredModes: req.body.preferredModes,
          accessibilityNeeds: req.body.accessibilityNeeds,
          sustainabilityPriority: req.body.sustainabilityPriority,
          timeVsEnvironmentWeight: req.body.timeVsEnvironmentWeight,
        };

        const preferences = await userService.updateUserPreferences(userId, preferencesInput);

        res.json({
          success: true,
          data: preferences,
        });
      } catch (error) {
        console.error('Error updating user preferences:', error);
        res.status(500).json({
          success: false,
          error: 'Failed to update user preferences',
        });
      }
    }
  );

  /**
   * GET /api/users/me/trips
   * Get trip history with optional filters
   */
  router.get(
    '/me/trips',
    [
      query('startDate')
        .optional()
        .isISO8601()
        .withMessage('Start date must be a valid ISO 8601 date'),
      query('endDate')
        .optional()
        .isISO8601()
        .withMessage('End date must be a valid ISO 8601 date'),
      query('transportationMode')
        .optional()
        .isString()
        .withMessage('Transportation mode must be a string'),
      query('limit')
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage('Limit must be between 1 and 100'),
      query('offset')
        .optional()
        .isInt({ min: 0 })
        .withMessage('Offset must be a non-negative integer'),
      validateRequest,
    ],
    async (req: Request, res: Response) => {
      try {
        const userId = req.user!.id;

        const filters: TripFilters = {
          startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
          endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
          transportationMode: req.query.transportationMode as string | undefined,
          limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined,
          offset: req.query.offset ? parseInt(req.query.offset as string, 10) : undefined,
        };

        const trips = await userService.getTripHistory(userId, filters);

        res.json({
          success: true,
          data: trips,
        });
      } catch (error) {
        console.error('Error fetching trip history:', error);
        res.status(500).json({
          success: false,
          error: 'Failed to fetch trip history',
        });
      }
    }
  );

  /**
   * POST /api/users/me/trips
   * Create a new trip
   */
  router.post(
    '/me/trips',
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

        const tripInput: TripInput = {
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
          data: trip,
        });
      } catch (error) {
        console.error('Error creating trip:', error);
        res.status(500).json({
          success: false,
          error: 'Failed to create trip',
        });
      }
    }
  );

  /**
   * GET /api/users/me/trips/:tripId
   * Get a specific trip
   */
  router.get(
    '/me/trips/:tripId',
    [
      param('tripId')
        .isUUID()
        .withMessage('Trip ID must be a valid UUID'),
      validateRequest,
    ],
    async (req: Request, res: Response) => {
      try {
        const userId = req.user!.id;
        const { tripId } = req.params;

        const trip = await userService.getTripById(tripId, userId);

        if (!trip) {
          res.status(404).json({
            success: false,
            error: 'Trip not found',
          });
          return;
        }

        res.json({
          success: true,
          data: trip,
        });
      } catch (error) {
        console.error('Error fetching trip:', error);
        res.status(500).json({
          success: false,
          error: 'Failed to fetch trip',
        });
      }
    }
  );

  /**
   * GET /api/users/me/stats
   * Get user statistics
   */
  router.get('/me/stats', async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;

      const stats = await userService.getUserStats(userId);

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      console.error('Error fetching user stats:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch user statistics',
      });
    }
  });

  /**
   * DELETE /api/users/me
   * Delete user data
   */
  router.delete('/me', async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;

      await userService.deleteUserData(userId);

      res.status(204).send();
    } catch (error) {
      console.error('Error deleting user data:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete user data',
      });
    }
  });

  return router;
}
