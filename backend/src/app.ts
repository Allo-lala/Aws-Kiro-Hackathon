import express, { Application, Request, Response } from 'express';
import { DatabaseService } from './services/DatabaseService';
import { RealRouteCalculationService } from './services/RealRouteCalculationService';
import { createAuthRouter, createUserRouter, createRouteRouter, createAdminRouter } from './api/routes';
import {
  configureCORS,
  errorHandler,
  notFoundHandler,
  securityHeaders,
  sanitizeInput,
  apiLimiter,
} from './middleware';

/**
 * Create and configure Express application
 */
export function createApp(
  databaseService: DatabaseService,
  routeService?: RealRouteCalculationService
): Application {
  const app = express();

  // Security headers (helmet)
  app.use(securityHeaders);

  // Body parsing middleware
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Input sanitization
  app.use(sanitizeInput);

  // CORS configuration
  app.use(configureCORS);

  // Rate limiting for all API routes
  app.use('/api', apiLimiter);

  // Health check endpoint - basic liveness probe
  app.get('/health', async (req: Request, res: Response) => {
    try {
      const dbHealthy = await databaseService.healthCheck();
      const status = dbHealthy ? 'healthy' : 'unhealthy';
      const statusCode = dbHealthy ? 200 : 503;
      
      res.status(statusCode).json({
        status,
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        database: dbHealthy ? 'connected' : 'disconnected',
      });
    } catch (error) {
      res.status(503).json({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        database: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // Readiness check endpoint - detailed readiness probe
  app.get('/ready', async (req: Request, res: Response) => {
    try {
      const dbHealthy = await databaseService.healthCheck();
      const memoryUsage = process.memoryUsage();
      
      const checks = {
        database: dbHealthy,
        memory: memoryUsage.heapUsed < memoryUsage.heapTotal * 0.9, // Less than 90% heap used
      };
      
      const allHealthy = Object.values(checks).every(check => check === true);
      const statusCode = allHealthy ? 200 : 503;
      
      res.status(statusCode).json({
        status: allHealthy ? 'ready' : 'not ready',
        timestamp: new Date().toISOString(),
        checks: {
          database: checks.database ? 'ok' : 'failed',
          memory: checks.memory ? 'ok' : 'high',
        },
        details: {
          uptime: process.uptime(),
          memoryUsage: {
            heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024) + 'MB',
            heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024) + 'MB',
            rss: Math.round(memoryUsage.rss / 1024 / 1024) + 'MB',
          },
          nodeVersion: process.version,
          environment: process.env.NODE_ENV || 'development',
        },
      });
    } catch (error) {
      res.status(503).json({
        status: 'not ready',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // API Routes
  app.use('/api/auth', createAuthRouter(databaseService));
  app.use('/api/users', createUserRouter(databaseService));
  app.use('/api/routes', createRouteRouter(databaseService, routeService));
  app.use('/api/admin', createAdminRouter(databaseService));

  // 404 handler for API routes
  app.use('/api/*', notFoundHandler);

  // Global error handler
  app.use(errorHandler);

  return app;
}
