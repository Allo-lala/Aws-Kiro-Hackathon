import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';

// Extend AxiosRequestConfig to include metadata
interface ExtendedAxiosRequestConfig extends AxiosRequestConfig {
  metadata?: { startTime: number };
}

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

export interface ExternalServiceConfig {
  baseURL: string;
  timeout: number;
  retries: number;
  rateLimit: RateLimitConfig;
}

export interface ServiceHealth {
  serviceName: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  lastCheck: Date;
  responseTime?: number;
  errorCount: number;
  uptime: number;
}

export class ApiGateway {
  private cache = new Map<string, CacheEntry<any>>();
  private rateLimiters = new Map<string, { requests: number[]; }>();
  private serviceClients = new Map<string, AxiosInstance>();
  private serviceHealth = new Map<string, ServiceHealth>();
  private logger: (level: string, message: string, meta?: any) => void;

  constructor(logger?: (level: string, message: string, meta?: any) => void) {
    this.logger = logger || this.defaultLogger;
  }

  private defaultLogger(level: string, message: string, meta?: any): void {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${level.toUpperCase()}: ${message}`, meta ? JSON.stringify(meta) : '');
  }

  /**
   * Register an external service with the gateway
   */
  registerService(serviceName: string, config: ExternalServiceConfig): void {
    const client = axios.create({
      baseURL: config.baseURL,
      timeout: config.timeout,
    });

    // Add request interceptor for logging and rate limiting
    client.interceptors.request.use(
      (requestConfig) => {
        this.logger('info', `API Request to ${serviceName}`, {
          url: requestConfig.url,
          method: requestConfig.method,
        });
        return requestConfig;
      },
      (error) => {
        this.logger('error', `API Request error for ${serviceName}`, { error: error.message });
        return Promise.reject(error);
      }
    );

    // Add response interceptor for logging and health monitoring
    client.interceptors.response.use(
      (response) => {
        const config = response.config as ExtendedAxiosRequestConfig;
        this.updateServiceHealth(serviceName, true, config.metadata?.startTime);
        this.logger('info', `API Response from ${serviceName}`, {
          status: response.status,
          url: response.config.url,
        });
        return response;
      },
      (error) => {
        this.updateServiceHealth(serviceName, false);
        this.logger('error', `API Response error from ${serviceName}`, {
          status: error.response?.status,
          message: error.message,
        });
        return Promise.reject(error);
      }
    );

    this.serviceClients.set(serviceName, client);
    this.initializeServiceHealth(serviceName);
    this.initializeRateLimiter(serviceName, config.rateLimit);

    this.logger('info', `Registered service: ${serviceName}`, config);
  }

  /**
   * Make a request through the gateway with caching, rate limiting, and error handling
   */
  async request<T>(
    serviceName: string,
    config: ExtendedAxiosRequestConfig,
    cacheOptions?: { ttl: number; key?: string }
  ): Promise<T> {
    // Check rate limiting
    if (!this.checkRateLimit(serviceName)) {
      throw new Error(`Rate limit exceeded for service: ${serviceName}`);
    }

    // Check cache if enabled
    if (cacheOptions) {
      const cacheKey = cacheOptions.key || this.generateCacheKey(serviceName, config);
      const cached = this.getFromCache<T>(cacheKey);
      if (cached) {
        this.logger('info', `Cache hit for ${serviceName}`, { cacheKey });
        return cached;
      }
    }

    const client = this.serviceClients.get(serviceName);
    if (!client) {
      throw new Error(`Service not registered: ${serviceName}`);
    }

    try {
      // Add start time for response time tracking
      const startTime = Date.now();
      config.metadata = { startTime };

      const response: AxiosResponse<T> = await client.request(config);

      // Cache the response if caching is enabled
      if (cacheOptions) {
        const cacheKey = cacheOptions.key || this.generateCacheKey(serviceName, config);
        this.setCache(cacheKey, response.data, cacheOptions.ttl);
      }

      return response.data;
    } catch (error) {
      this.logger('error', `Request failed for ${serviceName}`, {
        error: error instanceof Error ? error.message : 'Unknown error',
        config: {
          url: config.url,
          method: config.method,
        },
      });
      throw error;
    }
  }

  /**
   * Get service health status
   */
  getServiceHealth(serviceName?: string): ServiceHealth | ServiceHealth[] {
    if (serviceName) {
      const health = this.serviceHealth.get(serviceName);
      if (!health) {
        throw new Error(`Service not found: ${serviceName}`);
      }
      return health;
    }
    return Array.from(this.serviceHealth.values());
  }

  /**
   * Clear cache entries (all or by pattern)
   */
  clearCache(pattern?: string): void {
    if (pattern) {
      const regex = new RegExp(pattern);
      for (const [key] of this.cache) {
        if (regex.test(key)) {
          this.cache.delete(key);
        }
      }
    } else {
      this.cache.clear();
    }
    this.logger('info', 'Cache cleared', { pattern });
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; entries: string[] } {
    return {
      size: this.cache.size,
      entries: Array.from(this.cache.keys()),
    };
  }

  private checkRateLimit(serviceName: string): boolean {
    const limiter = this.rateLimiters.get(serviceName);
    if (!limiter) return true;

    const now = Date.now();
    const windowStart = now - (this.getServiceRateLimit(serviceName)?.windowMs || 60000);
    
    // Remove old requests outside the window
    limiter.requests = limiter.requests.filter(time => time > windowStart);
    
    const maxRequests = this.getServiceRateLimit(serviceName)?.maxRequests || 100;
    if (limiter.requests.length >= maxRequests) {
      return false;
    }

    limiter.requests.push(now);
    return true;
  }

  private getServiceRateLimit(serviceName: string): RateLimitConfig | undefined {
    // This would typically be stored with service configuration
    // For now, return default values
    return { maxRequests: 100, windowMs: 60000 };
  }

  private generateCacheKey(serviceName: string, config: ExtendedAxiosRequestConfig): string {
    const url = config.url || '';
    const method = config.method || 'GET';
    const params = JSON.stringify(config.params || {});
    const data = JSON.stringify(config.data || {});
    return `${serviceName}:${method}:${url}:${params}:${data}`;
  }

  private getFromCache<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  private setCache<T>(key: string, data: T, ttl: number): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    });
  }

  private initializeServiceHealth(serviceName: string): void {
    this.serviceHealth.set(serviceName, {
      serviceName,
      status: 'healthy',
      lastCheck: new Date(),
      errorCount: 0,
      uptime: 100,
    });
  }

  private initializeRateLimiter(serviceName: string, config: RateLimitConfig): void {
    this.rateLimiters.set(serviceName, {
      requests: [],
    });
  }

  private updateServiceHealth(serviceName: string, success: boolean, startTime?: number): void {
    const health = this.serviceHealth.get(serviceName);
    if (!health) return;

    health.lastCheck = new Date();
    
    if (success) {
      if (startTime) {
        health.responseTime = Date.now() - startTime;
      }
      // Reset error count on successful request
      if (health.errorCount > 0) {
        health.errorCount = Math.max(0, health.errorCount - 1);
      }
    } else {
      health.errorCount++;
    }

    // Update status based on error count
    if (health.errorCount === 0) {
      health.status = 'healthy';
      health.uptime = 100;
    } else if (health.errorCount < 5) {
      health.status = 'degraded';
      health.uptime = Math.max(50, 100 - (health.errorCount * 10));
    } else {
      health.status = 'unhealthy';
      health.uptime = 0;
    }

    this.serviceHealth.set(serviceName, health);
  }
}