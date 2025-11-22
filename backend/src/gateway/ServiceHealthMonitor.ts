import { ApiGateway, ServiceHealth } from './ApiGateway';

export interface HealthCheckConfig {
  interval: number; // milliseconds
  timeout: number; // milliseconds
  retries: number;
}

export interface SystemHealth {
  overall: 'healthy' | 'degraded' | 'unhealthy';
  services: ServiceHealth[];
  timestamp: Date;
  uptime: number;
}

export class ServiceHealthMonitor {
  private gateway: ApiGateway;
  private healthCheckInterval?: NodeJS.Timeout;
  private systemStartTime: Date;
  private logger: (level: string, message: string, meta?: any) => void;

  private readonly DEFAULT_CONFIG: HealthCheckConfig = {
    interval: 30000, // 30 seconds
    timeout: 5000, // 5 seconds
    retries: 2,
  };

  constructor(
    gateway: ApiGateway,
    logger?: (level: string, message: string, meta?: any) => void
  ) {
    this.gateway = gateway;
    this.systemStartTime = new Date();
    this.logger = logger || this.defaultLogger;
  }

  private defaultLogger(level: string, message: string, meta?: any): void {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] HEALTH-${level.toUpperCase()}: ${message}`, meta ? JSON.stringify(meta) : '');
  }

  /**
   * Start continuous health monitoring
   */
  startMonitoring(config: Partial<HealthCheckConfig> = {}): void {
    const finalConfig = { ...this.DEFAULT_CONFIG, ...config };

    if (this.healthCheckInterval) {
      this.stopMonitoring();
    }

    this.logger('info', 'Starting health monitoring', finalConfig);

    this.healthCheckInterval = setInterval(async () => {
      try {
        await this.performHealthChecks(finalConfig);
      } catch (error) {
        this.logger('error', 'Health check failed', {
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }, finalConfig.interval);

    // Perform initial health check
    this.performHealthChecks(finalConfig).catch(error => {
      this.logger('error', 'Initial health check failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    });
  }

  /**
   * Stop health monitoring
   */
  stopMonitoring(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = undefined;
      this.logger('info', 'Health monitoring stopped');
    }
  }

  /**
   * Get current system health status
   */
  getSystemHealth(): SystemHealth {
    const services = this.gateway.getServiceHealth() as ServiceHealth[];
    const overall = this.calculateOverallHealth(services);
    const uptime = this.calculateUptime();

    return {
      overall,
      services,
      timestamp: new Date(),
      uptime,
    };
  }

  /**
   * Perform health checks on all registered services
   */
  private async performHealthChecks(config: HealthCheckConfig): Promise<void> {
    const services = this.gateway.getServiceHealth() as ServiceHealth[];

    const healthCheckPromises = services.map(service =>
      this.checkServiceHealth(service.serviceName, config)
    );

    await Promise.allSettled(healthCheckPromises);

    const updatedHealth = this.getSystemHealth();
    this.logger('info', 'Health check completed', {
      overall: updatedHealth.overall,
      serviceCount: updatedHealth.services.length,
      healthyServices: updatedHealth.services.filter(s => s.status === 'healthy').length,
    });

    // Log warnings for unhealthy services
    const unhealthyServices = updatedHealth.services.filter(s => s.status === 'unhealthy');
    if (unhealthyServices.length > 0) {
      this.logger('warn', 'Unhealthy services detected', {
        services: unhealthyServices.map(s => s.serviceName),
      });
    }
  }

  /**
   * Check health of a specific service
   */
  private async checkServiceHealth(serviceName: string, config: HealthCheckConfig): Promise<void> {
    let attempts = 0;
    let lastError: Error | null = null;

    while (attempts <= config.retries) {
      try {
        const startTime = Date.now();

        // Perform a lightweight health check request
        await this.gateway.request(
          serviceName,
          {
            url: '/health',
            method: 'GET',
            timeout: config.timeout,
          }
        );

        const responseTime = Date.now() - startTime;
        this.logger('debug', `Health check passed for ${serviceName}`, {
          responseTime,
          attempt: attempts + 1,
        });

        return; // Success, exit retry loop
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        attempts++;

        if (attempts <= config.retries) {
          this.logger('warn', `Health check failed for ${serviceName}, retrying`, {
            attempt: attempts,
            error: lastError.message,
          });
          
          // Wait before retry (exponential backoff)
          await this.sleep(Math.pow(2, attempts - 1) * 1000);
        }
      }
    }

    // All retries failed
    this.logger('error', `Health check failed for ${serviceName} after ${config.retries + 1} attempts`, {
      error: lastError?.message,
    });
  }

  /**
   * Calculate overall system health based on individual service health
   */
  private calculateOverallHealth(services: ServiceHealth[]): 'healthy' | 'degraded' | 'unhealthy' {
    if (services.length === 0) {
      return 'unhealthy';
    }

    const healthyCount = services.filter(s => s.status === 'healthy').length;
    const degradedCount = services.filter(s => s.status === 'degraded').length;
    const unhealthyCount = services.filter(s => s.status === 'unhealthy').length;

    const healthyPercentage = healthyCount / services.length;

    if (healthyPercentage >= 0.8) {
      return 'healthy';
    } else if (healthyPercentage >= 0.5 || (degradedCount > 0 && unhealthyCount === 0)) {
      return 'degraded';
    } else {
      return 'unhealthy';
    }
  }

  /**
   * Calculate system uptime percentage
   */
  private calculateUptime(): number {
    const now = new Date();
    const uptimeMs = now.getTime() - this.systemStartTime.getTime();
    const uptimeHours = uptimeMs / (1000 * 60 * 60);
    
    // For simplicity, assume 99.9% uptime if running for more than 1 hour
    // In a real system, this would track actual downtime
    return uptimeHours > 1 ? 99.9 : 100;
  }

  /**
   * Sleep utility for retry delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get health check statistics
   */
  getHealthStats(): {
    monitoringActive: boolean;
    systemUptime: number;
    lastCheckTime?: Date;
    serviceCount: number;
  } {
    const health = this.getSystemHealth();
    
    return {
      monitoringActive: this.healthCheckInterval !== undefined,
      systemUptime: this.calculateUptime(),
      lastCheckTime: health.timestamp,
      serviceCount: health.services.length,
    };
  }
}