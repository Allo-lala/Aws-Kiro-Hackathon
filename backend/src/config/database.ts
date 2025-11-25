import { DataSource, DataSourceOptions } from 'typeorm';
import * as path from 'path';

// Use DATABASE_URL if available (for cloud deployments), otherwise use individual params
const useConnectionUrl = process.env.DATABASE_URL && process.env.DATABASE_URL.includes('neon.tech');

export const databaseConfig: DataSourceOptions = useConnectionUrl
  ? {
      type: 'postgres',
      url: process.env.DATABASE_URL,
      synchronize: false,
      logging: process.env.DB_LOGGING === 'true',
      entities: [path.join(__dirname, '../models/entities/**/*.{ts,js}')],
      migrations: [path.join(__dirname, '../database/migrations/[0-9]*-*.{ts,js}')],
      subscribers: [],
      ssl: {
        rejectUnauthorized: false,
      },
      extra: {
        max: parseInt(process.env.DB_POOL_MAX || '20', 10),
        min: parseInt(process.env.DB_POOL_MIN || '5', 10),
        idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || '30000', 10),
        connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT || '10000', 10),
      },
    }
  : {
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432', 10),
      username: process.env.DB_USERNAME || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      database: process.env.DB_NAME || 'rutty_dev',
      synchronize: false,
      logging: process.env.DB_LOGGING === 'true',
      entities: [path.join(__dirname, '../models/entities/**/*.{ts,js}')],
      migrations: [path.join(__dirname, '../database/migrations/[0-9]*-*.{ts,js}')],
      subscribers: [],
      ssl: false,
      extra: {
        max: parseInt(process.env.DB_POOL_MAX || '20', 10),
        min: parseInt(process.env.DB_POOL_MIN || '5', 10),
        idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || '30000', 10),
        connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT || '2000', 10),
      },
    };

// Create and export the data source
export const AppDataSource = new DataSource(databaseConfig);
