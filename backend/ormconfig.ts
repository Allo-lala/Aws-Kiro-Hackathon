import { DataSource } from 'typeorm';
import { databaseConfig } from './src/config/database';

// This file is used by TypeORM CLI for running migrations
export default new DataSource(databaseConfig);
