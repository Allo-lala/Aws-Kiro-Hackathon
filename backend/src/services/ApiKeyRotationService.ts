import { DatabaseService } from './DatabaseService';
import * as crypto from 'crypto';

/**
 * API Key entity for external service integrations
 */
export interface ApiKey {
  id: string;
  serviceName: string; // e.g., 'google_maps', 'geoapify'
  keyValue: string;
  isActive: boolean;
  createdAt: Date;
  expiresAt: Date | null;
  rotatedAt: Date | null;
  lastUsedAt: Date | null;
}

/**
 * API Key Rotation Service
 * Manages API key lifecycle including rotation, expiration, and usage tracking
 */
export class ApiKeyRotationService {
  constructor(private databaseService: DatabaseService) {}

  /**
   * Generate a new API key
   */
  private generateApiKey(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Create a new API key for a service
   */
  async createApiKey(
    serviceName: string,
    expiresInDays?: number
  ): Promise<ApiKey> {
    const keyValue = this.generateApiKey();
    const expiresAt = expiresInDays
      ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)
      : null;

    const query = `
      INSERT INTO api_keys (service_name, key_value, is_active, expires_at)
      VALUES ($1, $2, $3, $4)
      RETURNING id, service_name as "serviceName", key_value as "keyValue", 
                is_active as "isActive", created_at as "createdAt", 
                expires_at as "expiresAt", rotated_at as "rotatedAt",
                last_used_at as "lastUsedAt"
    `;

    const result = await this.databaseService.query(query, [
      serviceName,
      keyValue,
      true,
      expiresAt,
    ]);

    return result.rows[0];
  }

  /**
   * Rotate an API key for a service
   * Deactivates old key and creates a new one
   */
  async rotateApiKey(serviceName: string, expiresInDays?: number): Promise<ApiKey> {
    // Deactivate current active key
    const deactivateQuery = `
      UPDATE api_keys
      SET is_active = false, rotated_at = NOW()
      WHERE service_name = $1 AND is_active = true
    `;
    await this.databaseService.query(deactivateQuery, [serviceName]);

    // Create new key
    return this.createApiKey(serviceName, expiresInDays);
  }

  /**
   * Get active API key for a service
   */
  async getActiveApiKey(serviceName: string): Promise<ApiKey | null> {
    const query = `
      SELECT id, service_name as "serviceName", key_value as "keyValue",
             is_active as "isActive", created_at as "createdAt",
             expires_at as "expiresAt", rotated_at as "rotatedAt",
             last_used_at as "lastUsedAt"
      FROM api_keys
      WHERE service_name = $1 AND is_active = true
        AND (expires_at IS NULL OR expires_at > NOW())
      ORDER BY created_at DESC
      LIMIT 1
    `;

    const result = await this.databaseService.query(query, [serviceName]);
    return result.rows[0] || null;
  }

  /**
   * Update last used timestamp for an API key
   */
  async recordApiKeyUsage(keyId: string): Promise<void> {
    const query = `
      UPDATE api_keys
      SET last_used_at = NOW()
      WHERE id = $1
    `;
    await this.databaseService.query(query, [keyId]);
  }

  /**
   * List all API keys for a service (including inactive)
   */
  async listApiKeys(serviceName: string): Promise<ApiKey[]> {
    const query = `
      SELECT id, service_name as "serviceName", key_value as "keyValue",
             is_active as "isActive", created_at as "createdAt",
             expires_at as "expiresAt", rotated_at as "rotatedAt",
             last_used_at as "lastUsedAt"
      FROM api_keys
      WHERE service_name = $1
      ORDER BY created_at DESC
    `;

    const result = await this.databaseService.query(query, [serviceName]);
    return result.rows;
  }

  /**
   * Deactivate an API key
   */
  async deactivateApiKey(keyId: string): Promise<void> {
    const query = `
      UPDATE api_keys
      SET is_active = false
      WHERE id = $1
    `;
    await this.databaseService.query(query, [keyId]);
  }

  /**
   * Check for expired keys and deactivate them
   */
  async deactivateExpiredKeys(): Promise<number> {
    const query = `
      UPDATE api_keys
      SET is_active = false
      WHERE is_active = true AND expires_at IS NOT NULL AND expires_at <= NOW()
      RETURNING id
    `;

    const result = await this.databaseService.query(query, []);
    return result.rows.length;
  }

  /**
   * Get API key rotation schedule
   * Returns keys that should be rotated soon
   */
  async getKeysNeedingRotation(daysBeforeExpiry: number = 7): Promise<ApiKey[]> {
    const query = `
      SELECT id, service_name as "serviceName", key_value as "keyValue",
             is_active as "isActive", created_at as "createdAt",
             expires_at as "expiresAt", rotated_at as "rotatedAt",
             last_used_at as "lastUsedAt"
      FROM api_keys
      WHERE is_active = true 
        AND expires_at IS NOT NULL 
        AND expires_at <= NOW() + INTERVAL '${daysBeforeExpiry} days'
      ORDER BY expires_at ASC
    `;

    const result = await this.databaseService.query(query, []);
    return result.rows;
  }
}
