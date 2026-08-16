import { createClient } from 'redis';
import { env } from './env.js';

let redisClient = null;
let isConnected = false;

// Initializes and establishes the connection to Redis.
// System Design Note: Redis serves as our distributed, shared in-memory state.
// Multiple Express backend instances share this single Redis instance so that
// regardless of which server a client request hits, the rate-limiting counter
// is incremented atomically across the entire cluster.
export const connectRedis = async () => {
  if (redisClient) return redisClient;

  redisClient = createClient({
    url: env.REDIS_URL,
    socket: {
      reconnectStrategy: (retries) => Math.min(retries * 200, 3000),
      keepAlive: 5000,
      connectTimeout: 10000,
    },
  });

  redisClient.on('connect', () => {
    console.log('[Redis] Connecting to server...');
  });

  redisClient.on('ready', () => {
    isConnected = true;
    console.log(`[Redis] Connected and ready at ${env.REDIS_URL}`);
  });

  redisClient.on('error', (err) => {
    isConnected = false;
    console.error('[Redis] Client error:', err.message);
  });

  redisClient.on('end', () => {
    isConnected = false;
    console.warn('[Redis] Connection closed.');
  });

  try {
    await redisClient.connect();
  } catch (error) {
    isConnected = false;
    console.error(`[Redis] Initial connection to ${env.REDIS_URL} failed:`, error.message);
    console.warn(`[Redis] Current failure mode: RATE_LIMIT_FAIL_MODE=${env.RATE_LIMIT_FAIL_MODE}`);
  }

  return redisClient;
};

// Returns the active Redis client instance
export const getRedisClient = () => {
  return redisClient;
};

// Helper to check if Redis is actively connected and accepting commands
export const isRedisConnected = () => {
  return isConnected && redisClient && redisClient.isOpen;
};

// Graceful disconnection for testing and process shutdown
export const disconnectRedis = async () => {
  if (redisClient && redisClient.isOpen) {
    try {
      await redisClient.quit();
      isConnected = false;
      console.log('[Redis] Disconnected gracefully.');
    } catch (err) {
      console.error('[Redis] Error during disconnect:', err.message);
    }
  }
};

// Centralized Redis failure strategy handler.
// Architectural Tradeoff:
// 1. 'closed' (Default): If Redis is down, reject requests with HTTP 500 / 429.
//    Advantage: Prevents downstream databases (MongoDB) from being overwhelmed by unexpected bursts.
//    Tradeoff: Degrades user availability if cache infrastructure fails.
// 2. 'open': If Redis is down, log error and allow requests through without rate limiting.
//    Advantage: Maximizes availability and avoids customer-facing downtime during cache blips.
//    Tradeoff: Vulnerable to DDoS or heavy load while Redis is offline.
export const handleRedisFailure = (operationName, error) => {
  console.error(`[Redis Failure Strategy] Operation "${operationName}" failed:`, error.message);

  if (env.RATE_LIMIT_FAIL_MODE === 'open') {
    console.warn(`[Redis Failure Strategy] Fail-Open active: Permitting request despite Redis outage.`);
    return {
      allowed: true,
      current: 0,
      limit: Infinity,
      remaining: Infinity,
      resetSeconds: 0,
      degraded: true,
    };
  }

  // Fail-closed throws an error so middleware can return HTTP 500
  const failError = new Error(`Rate limit service temporarily unavailable (Redis unreachable in fail-closed mode)`);
  failError.statusCode = 500;
  throw failError;
};
