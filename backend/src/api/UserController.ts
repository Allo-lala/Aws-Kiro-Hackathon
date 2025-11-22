import { Router, Request, Response } from 'express';
import { userService, UserPreferencesInput, TripInput, TripFilters } from '../services/UserService';

const router = Router();

/**
 * Get current user profile
 * GET /api/users/me
 */
router.get('/me', async (req: Request, res: Response) => {
  try {
    // @ts-ignore - userId should be set by auth middleware
    const userId = req.userId;
    
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const user = await userService.getUserById(userId);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Remove sensitive data
    const { passwordHash, emailVerificationToken, passwordResetToken, ...safeUser } = user;
    
    res.json(safeUser);
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Get user preferences
 * GET /api/users/me/preferences
 */
router.get('/me/preferences', async (req: Request, res: Response) => {
  try {
    // @ts-ignore - userId should be set by auth middleware
    const userId = req.userId;
    
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const preferences = await userService.getUserPreferences(userId);
    
    if (!preferences) {
      return res.status(404).json({ error: 'Preferences not found' });
    }

    res.json(preferences);
  } catch (error) {
    console.error('Error fetching user preferences:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Create or update user preferences
 * PUT /api/users/me/preferences
 */
router.put('/me/preferences', async (req: Request, res: Response) => {
  try {
    // @ts-ignore - userId should be set by auth middleware
    const userId = req.userId;
    
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const preferencesInput: UserPreferencesInput = {
      maxWalkingDistance: req.body.maxWalkingDistance,
      preferredModes: req.body.preferredModes,
      accessibilityNeeds: req.body.accessibilityNeeds,
      sustainabilityPriority: req.body.sustainabilityPriority,
      timeVsEnvironmentWeight: req.body.timeVsEnvironmentWeight,
    };

    const preferences = await userService.updateUserPreferences(userId, preferencesInput);
    
    res.json(preferences);
  } catch (error) {
    console.error('Error updating user preferences:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Get trip history
 * GET /api/users/me/trips
 */
router.get('/me/trips', async (req: Request, res: Response) => {
  try {
    // @ts-ignore - userId should be set by auth middleware
    const userId = req.userId;
    
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const filters: TripFilters = {
      startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
      endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
      transportationMode: req.query.transportationMode as string | undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined,
      offset: req.query.offset ? parseInt(req.query.offset as string, 10) : undefined,
    };

    const trips = await userService.getTripHistory(userId, filters);
    
    res.json(trips);
  } catch (error) {
    console.error('Error fetching trip history:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Create a new trip
 * POST /api/users/me/trips
 */
router.post('/me/trips', async (req: Request, res: Response) => {
  try {
    // @ts-ignore - userId should be set by auth middleware
    const userId = req.userId;
    
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

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

    // Validate required fields
    if (!tripInput.originLat || !tripInput.originLng || !tripInput.destinationLat || 
        !tripInput.destinationLng || !tripInput.selectedRoute || !tripInput.actualTransportationMode) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const trip = await userService.createTrip(userId, tripInput);
    
    res.status(201).json(trip);
  } catch (error) {
    console.error('Error creating trip:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Get a specific trip
 * GET /api/users/me/trips/:tripId
 */
router.get('/me/trips/:tripId', async (req: Request, res: Response) => {
  try {
    // @ts-ignore - userId should be set by auth middleware
    const userId = req.userId;
    
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { tripId } = req.params;
    const trip = await userService.getTripById(tripId, userId);
    
    if (!trip) {
      return res.status(404).json({ error: 'Trip not found' });
    }

    res.json(trip);
  } catch (error) {
    console.error('Error fetching trip:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Get user statistics
 * GET /api/users/me/stats
 */
router.get('/me/stats', async (req: Request, res: Response) => {
  try {
    // @ts-ignore - userId should be set by auth middleware
    const userId = req.userId;
    
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const stats = await userService.getUserStats(userId);
    
    res.json(stats);
  } catch (error) {
    console.error('Error fetching user stats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Delete user data
 * DELETE /api/users/me
 */
router.delete('/me', async (req: Request, res: Response) => {
  try {
    // @ts-ignore - userId should be set by auth middleware
    const userId = req.userId;
    
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    await userService.deleteUserData(userId);
    
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting user data:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
