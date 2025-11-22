import { Location } from '../models/Location';
import { TransportationType } from '../models/common';
import { ExternalRouteResponse } from './ExternalRouteAPIClient';

export interface CachedRoute {
  response: ExternalRouteResponse;
  timestamp: Date;
  expiresAt: Date;
}

export interface RouteCacheKey {
  origin: Location;
  destination: Location;
  mode: TransportationType;
}

export class RouteCacheService {
  private cache: Map<string, CachedRoute>;
  private readonly defaultTTL: number; // Time to live in milliseconds

  constructor(ttlMinutes: number = 60) {
    this.cache = new Map();
    this.defaultTTL = ttlMinutes * 60 * 1000;
    
    // Clean up expired entries every 5 minutes
    setInterval(() => this.cleanupExpired(), 5 * 60 * 1000);
  }

  /**
   * Get a cached route if available and not expired
   */
  get(key: RouteCacheKey): ExternalRouteResponse | null {
    const cacheKey = this.generateKey(key);
    const cached = this.cache.get(cacheKey);

    if (!cached) {
      return null;
    }

    // Check if expired
    if (new Date() > cached.expiresAt) {
      this.cache.delete(cacheKey);
      return null;
    }

    return cached.response;
  }

  /**
   * Store a route in the cache
   */
  set(key: RouteCacheKey, response: ExternalRouteResponse, ttlMinutes?: number): void {
    const cacheKey = this.generateKey(key);
    const ttl = ttlMinutes ? ttlMinutes * 60 * 1000 : this.defaultTTL;
    const now = new Date();

    const cached: CachedRoute = {
      response,
      timestamp: now,
      expiresAt: new Date(now.getTime() + ttl)
    };

    this.cache.set(cacheKey, cached);
  }

  /**
   * Check if a route is cached and not expired
   */
  has(key: RouteCacheKey): boolean {
    return this.get(key) !== null;
  }

  /**
   * Clear a specific cached route
   */
  delete(key: RouteCacheKey): boolean {
    const cacheKey = this.generateKey(key);
    return this.cache.delete(cacheKey);
  }

  /**
   * Clear all cached routes
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getStats(): { size: number; entries: number } {
    return {
      size: this.cache.size,
      entries: this.cache.size
    };
  }

  /**
   * Generate a unique cache key from route parameters
   * Uses rounded coordinates to allow for small variations
   */
  private generateKey(key: RouteCacheKey): string {
    const roundCoord = (coord: number) => Math.round(coord * 10000) / 10000;
    
    const originKey = `${roundCoord(key.origin.latitude)},${roundCoord(key.origin.longitude)}`;
    const destKey = `${roundCoord(key.destination.latitude)},${roundCoord(key.destination.longitude)}`;
    
    return `${originKey}|${destKey}|${key.mode}`;
  }

  /**
   * Remove expired entries from cache
   */
  private cleanupExpired(): void {
    const now = new Date();
    const keysToDelete: string[] = [];

    for (const [key, cached] of this.cache.entries()) {
      if (now > cached.expiresAt) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => this.cache.delete(key));

    if (keysToDelete.length > 0) {
      console.log(`Cleaned up ${keysToDelete.length} expired cache entries`);
    }
  }
}
