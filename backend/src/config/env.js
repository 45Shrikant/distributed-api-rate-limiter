import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Resolve directory name in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Explicitly load .env from the backend root folder to avoid path ambiguity across working directories
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// Centralized environment configuration ensures all components read validated,
// consistent settings and provides sensible defaults for local development.
export const env = {
  PORT: parseInt(process.env.PORT || '5000', 10),
  NODE_ENV: process.env.NODE_ENV || 'development',
  // Identifies the specific backend container/instance in horizontally scaled architectures
  SERVER_INSTANCE_ID: process.env.SERVER_INSTANCE_ID || 'server-1',
  MONGO_URI: process.env.MONGO_URI || 'mongodb://localhost:27017/rate_limiter',
  REDIS_URL: process.env.REDIS_URL || 'redis://localhost:6379',
  JWT_SECRET: process.env.JWT_SECRET || 'fallback_development_secret_key_change_in_prod',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  // Dictates rate limiter behavior if Redis crashes:
  // 'closed' = block traffic to prevent service overload; 'open' = allow traffic to preserve user experience.
  RATE_LIMIT_FAIL_MODE: process.env.RATE_LIMIT_FAIL_MODE || 'closed',
};
