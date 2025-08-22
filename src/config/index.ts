import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

export interface AppConfig {
  port: number;
  nodeEnv: string;
  jwtSecret: string;
  jwtRefreshSecret: string;
  database: {
    host: string;
    port: number;
    name: string;
    user: string;
    password: string;
  };
  redis: {
    host: string;
    port: number;
    password?: string;
  };
  webhook: {
    baseUrl: string;
  };
  execution: {
    maxExecutionTime: number;
    executionTimeout: number;
  };
  storage: {
    path: string;
  };
  logging: {
    level: string;
    file: string;
  };
}

const config: AppConfig = {
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  jwtSecret: process.env.JWT_SECRET || 'your-secret-key-here-change-in-production',
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key-change-in-production',
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    name: process.env.DB_NAME || 'workflow_automation',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
  },
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined,
  },
  webhook: {
    baseUrl: process.env.WEBHOOK_BASE_URL || 'http://localhost:3000',
  },
  execution: {
    maxExecutionTime: parseInt(process.env.MAX_EXECUTION_TIME || '300000', 10),
    executionTimeout: parseInt(process.env.EXECUTION_TIMEOUT || '60000', 10),
  },
  storage: {
    path: process.env.STORAGE_PATH || path.join(__dirname, '../../storage'),
  },
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    file: process.env.LOG_FILE || path.join(__dirname, '../../logs/app.log'),
  },
};

export default config;