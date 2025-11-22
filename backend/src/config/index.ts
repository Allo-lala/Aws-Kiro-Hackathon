// Configuration exports
// Database config, API keys, and environment settings will be added here

export const config = {
  port: process.env.PORT || 8080,
  nodeEnv: process.env.NODE_ENV || 'development',
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'rutty_dev',
    logging: process.env.DB_LOGGING === 'true',
    pool: {
      max: parseInt(process.env.DB_POOL_MAX || '20', 10),
      min: parseInt(process.env.DB_POOL_MIN || '5', 10),
      idleTimeout: parseInt(process.env.DB_IDLE_TIMEOUT || '30000', 10),
      connectionTimeout: parseInt(process.env.DB_CONNECTION_TIMEOUT || '2000', 10),
    },
  },
  routeApi: {
    provider: (process.env.ROUTE_API_PROVIDER || 'google_maps') as 'google_maps' | 'geoapify',
    apiKey: process.env.ROUTE_API_PROVIDER === 'geoapify' 
      ? process.env.GEOAPIFY_API_KEY || ''
      : process.env.GOOGLE_MAPS_API_KEY || '',
    timeout: parseInt(process.env.ROUTE_API_TIMEOUT || '5000', 10),
    maxRetries: parseInt(process.env.ROUTE_API_MAX_RETRIES || '3', 10),
    cacheEnabled: process.env.ROUTE_CACHE_ENABLED !== 'false',
    cacheTTLMinutes: parseInt(process.env.ROUTE_CACHE_TTL_MINUTES || '60', 10),
  },
};

export { AppDataSource } from './database';
export { databaseConfig } from './database';
export { default as logger } from './logger';
