import { DataSource, DataSourceOptions } from 'typeorm';
import * as path from 'path';

export const databaseConfig: DataSourceOptions = {
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'rutty_dev',
  synchronize: false, // Never use synchronize in production
  logging: process.env.DB_LOGGING === 'true',
  entities: [path.join(__dirname, '../models/entities/**/*.{ts,js}')],
  migrations: [path.join(__dirname, '../database/migrations/[0-9]*-*.{ts,js}')],
  subscribers: [],
  // Connection pool settings
  extra: {
    max: parseInt(process.env.DB_POOL_MAX || '20', 10),
    min: parseInt(process.env.DB_POOL_MIN || '5', 10),
    idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || '30000', 10),
    connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT || '2000', 10),
  },
};

// Create and export the data source
export const AppDataSource = new DataSource(databaseConfig);
