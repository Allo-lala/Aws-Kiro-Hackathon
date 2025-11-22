import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import { RuttyApplication } from './index';
import { RouteController } from './api/RouteController';
import UserController from './api/UserController';
import { CarbonController } from './api/CarbonController';
import { RealtimeController } from './api/RealtimeController';
import { DataExportController } from './api/DataExportController';

const app = express();
const port = process.env.PORT || 8080;

// Initialize Rutty application
const ruttyApp = new RuttyApplication();

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, '../dist/frontend')));

// CORS for development
app.use((req: Request, res: Response, next: NextFunction) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

// Initialize controllers
const routeController = new RouteController(ruttyApp.getRoutePlanner());
// const userController = new UserController(ruttyApp.getUserTracker());
const carbonController = new CarbonController(ruttyApp.getCarbonCalculator());
const realtimeController = new RealtimeController(ruttyApp.getRealtimeUpdater());
const dataExportController = new DataExportController();

// API Routes
app.get('/api/health', (req: Request, res: Response) => {
  try {
    const systemHealth = ruttyApp.getHealthMonitor().getSystemHealth();
    const healthStats = ruttyApp.getHealthMonitor().getHealthStats();
    
    res.json({
      status: systemHealth.overall,
      timestamp: new Date().toISOString(),
      uptime: systemHealth.uptime,
      services: systemHealth.services.map(service => ({
        name: service.serviceName,
        status: service.status,
        uptime: service.uptime,
        lastCheck: service.lastCheck,
        responseTime: service.responseTime
      })),
      monitoring: {
        active: healthStats.monitoringActive,
        serviceCount: healthStats.serviceCount,
        lastCheck: healthStats.lastCheckTime
      }
    });
  } catch (error) {
    console.error('Health check error:', error);
    res.status(500).json({ 
      status: 'unhealthy', 
      timestamp: new Date().toISOString(),
      error: 'Health monitoring unavailable'
    });
  }
});

// Service health endpoint
app.get('/api/health/services', (req: Request, res: Response) => {
  try {
    const servicesHealth = ruttyApp.getExternalServiceManager().getServicesHealth();
    res.json({ services: servicesHealth });
  } catch (error) {
    console.error('Services health error:', error);
    res.status(500).json({ error: 'Failed to get services health' });
  }
});

// Cache management endpoint
app.post('/api/cache/clear', (req: Request, res: Response) => {
  try {
    ruttyApp.getExternalServiceManager().clearCaches();
    res.json({ success: true, message: 'Cache cleared successfully' });
  } catch (error) {
    console.error('Cache clear error:', error);
    res.status(500).json({ error: 'Failed to clear cache' });
  }
});

// Route planning endpoints
app.post('/api/routes/calculate', async (req: Request, res: Response) => {
  try {
    const { origin, destination, preferences } = req.body;
    
    // Validate input
    if (!origin || !destination) {
      return res.status(400).json({ 
        error: 'Origin and destination are required',
        code: 'MISSING_REQUIRED_FIELDS'
      });
    }

    // Validate location format
    if (!origin.latitude || !origin.longitude || !destination.latitude || !destination.longitude) {
      return res.status(400).json({ 
        error: 'Origin and destination must include latitude and longitude',
        code: 'INVALID_LOCATION_FORMAT'
      });
    }

    // Calculate routes using the route planner service with enhanced error handling
    const routes = await ruttyApp.getRoutePlanner().calculateRoutes(origin, destination, preferences);
    
    res.json({ 
      routes,
      metadata: {
        calculatedAt: new Date().toISOString(),
        serviceHealth: ruttyApp.getHealthMonitor().getSystemHealth().overall
      }
    });
  } catch (error) {
    console.error('Route calculation error:', error);
    
    // Handle specific error types
    if (error instanceof Error) {
      if (error.message.includes('Route data is unavailable')) {
        return res.status(404).json({ 
          error: error.message,
          code: 'ROUTE_DATA_UNAVAILABLE',
          suggestions: error.message.includes('Nearby supported locations') ? 
            error.message.split('Nearby supported locations: ')[1] : undefined
        });
      } else if (error.message.includes('No eco-friendly options')) {
        return res.status(200).json({ 
          routes: [],
          warning: error.message,
          code: 'NO_ECO_FRIENDLY_OPTIONS'
        });
      } else if (error.message.includes('services are currently unavailable')) {
        return res.status(503).json({ 
          error: 'Route calculation services are temporarily unavailable. Please try again later.',
          code: 'SERVICE_UNAVAILABLE',
          retryAfter: 30
        });
      }
    }
    
    res.status(500).json({ 
      error: 'Failed to calculate routes',
      code: 'INTERNAL_ERROR'
    });
  }
});

app.get('/api/routes/:routeId', async (req: Request, res: Response) => {
  try {
    const { routeId } = req.params;
    // Implementation would fetch route details
    res.json({ message: 'Route details endpoint - to be implemented' });
  } catch (error) {
    console.error('Route details error:', error);
    res.status(500).json({ error: 'Failed to get route details' });
  }
});

// User preferences endpoints
app.get('/api/user/:userId/preferences', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const preferences = await ruttyApp.getUserTracker().getUserPreferences(userId);
    res.json({ preferences });
  } catch (error) {
    console.error('Get preferences error:', error);
    res.status(500).json({ error: 'Failed to get user preferences' });
  }
});

app.put('/api/user/:userId/preferences', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { preferences } = req.body;
    
    await ruttyApp.getUserTracker().updateAccessibilityNeeds(userId, preferences.accessibilityNeeds);
    
    res.json({ success: true });
  } catch (error) {
    console.error('Update preferences error:', error);
    res.status(500).json({ error: 'Failed to update user preferences' });
  }
});

// Trip recording endpoints
app.post('/api/user/:userId/trips', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { route, actualMode } = req.body;
    
    const tripRecord = await ruttyApp.getUserTracker().recordTrip(userId, route, actualMode);
    
    res.json({ tripRecord });
  } catch (error) {
    console.error('Record trip error:', error);
    res.status(500).json({ error: 'Failed to record trip' });
  }
});

// Sustainability metrics endpoints
app.get('/api/user/:userId/metrics', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { timeframe } = req.query;
    
    // Parse timeframe query parameter
    const timeframeObj = timeframe ? JSON.parse(timeframe as string) : undefined;
    const metrics = await ruttyApp.getUserTracker().calculateSavings(userId, timeframeObj);
    
    res.json({ metrics });
  } catch (error) {
    console.error('Get metrics error:', error);
    res.status(500).json({ error: 'Failed to get sustainability metrics' });
  }
});

// Carbon footprint endpoints
app.post('/api/carbon/calculate', async (req: Request, res: Response) => {
  try {
    const { route, transportationMode } = req.body;
    
    const carbonFootprint = await ruttyApp.getCarbonCalculator().calculateEmissions(route, transportationMode);
    
    res.json({ carbonFootprint });
  } catch (error) {
    console.error('Carbon calculation error:', error);
    res.status(500).json({ error: 'Failed to calculate carbon footprint' });
  }
});

// Real-time updates endpoints
app.get('/api/realtime/disruptions', async (req: Request, res: Response) => {
  try {
    const disruptions = await ruttyApp.getExternalServiceManager().getTransportationDisruptions();
    res.json({ 
      disruptions: disruptions.disruptions,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Get disruptions error:', error);
    res.status(500).json({ error: 'Failed to get disruptions' });
  }
});

// Handle disruption notifications
app.post('/api/realtime/disruptions/handle', async (req: Request, res: Response) => {
  try {
    const { disruption } = req.body;
    
    if (!disruption) {
      return res.status(400).json({ error: 'Disruption data is required' });
    }

    const updates = await ruttyApp.getRealtimeUpdater().handleDisruption(disruption);
    
    res.json({ 
      updates,
      message: `Processed disruption affecting ${updates.length} routes`
    });
  } catch (error) {
    console.error('Handle disruption error:', error);
    res.status(500).json({ error: 'Failed to handle disruption' });
  }
});

// Data export endpoints
app.get('/api/user/:userId/export', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { format } = req.query;
    
    // Implementation would export user data
    res.json({ message: 'Data export endpoint - to be implemented' });
  } catch (error) {
    console.error('Data export error:', error);
    res.status(500).json({ error: 'Failed to export data' });
  }
});

// Serve frontend for all other routes (SPA support)
app.get('*', (req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, '../dist/frontend/index.html'));
});

// Error handling middleware
app.use((error: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Server error:', error);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
async function startServer() {
  try {
    await ruttyApp.initialize();
    
    app.listen(port, () => {
      console.log(`🌱 Rutty server running on port ${port}`);
      console.log(`📱 Frontend available at http://localhost:${port}`);
      console.log(`🔌 API available at http://localhost:${port}/api`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  startServer();
}

export { app };