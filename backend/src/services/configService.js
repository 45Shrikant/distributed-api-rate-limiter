import mongoose from 'mongoose';
import RateLimitConfig from '../models/RateLimitConfig.js';
import { getRedisClient, isRedisConnected } from '../config/redis.js';

// Configuration Cache Service
//
// System Design Pattern: Distributed Cache-Aside (Lazy-Loading) with Immediate Invalidation
// - Reading: First checks Redis cache for rate-limit rules. On cache miss, queries MongoDB and populates Redis.
// - Writing/Updating: Updates MongoDB persistent store AND evicts/updates the Redis cache key so that
//   all distributed Express nodes immediately enforce the updated rate limits without server restarts.
const CACHE_PREFIX = 'config:ratelimit:';
const CACHE_TTL_SECONDS = 300; // 5 minutes cache TTL

export const getEffectiveRateLimit = async (key, fallbackLimit = 100, fallbackWindow = 60) => {
  const redis = getRedisClient();

  // 1. Try reading from Redis cache if available
  if (isRedisConnected()) {
    try {
      const cached = await redis.get(`${CACHE_PREFIX}${key}`);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (err) {
      console.warn(`[ConfigService] Redis cache lookup failed for "${key}":`, err.message);
    }
  }

  // 2. Query MongoDB for dynamic overrides
  let config = null;
  if (mongoose.connection.readyState === 1) {
    try {
      config = await RateLimitConfig.findOne({ key }).lean();
    } catch (err) {
      console.warn(`[ConfigService] MongoDB lookup failed for "${key}":`, err.message);
    }
  }

  const effective = config
    ? { limit: config.limit, windowSeconds: config.windowSeconds, source: 'database' }
    : { limit: fallbackLimit, windowSeconds: fallbackWindow, source: 'default' };

  // 3. Populate Redis cache
  if (isRedisConnected()) {
    try {
      await redis.set(`${CACHE_PREFIX}${key}`, JSON.stringify(effective), {
        EX: CACHE_TTL_SECONDS,
      });
    } catch (err) {
      console.warn(`[ConfigService] Failed to cache rate limit for "${key}":`, err.message);
    }
  }

  return effective;
};

// Evicts the cached configuration across the Redis cluster upon administrative updates
export const invalidateRateLimitCache = async (key) => {
  if (isRedisConnected()) {
    const redis = getRedisClient();
    try {
      await redis.del(`${CACHE_PREFIX}${key}`);
      console.log(`[ConfigService] Invalidated Redis cache for key: ${key}`);
    } catch (err) {
      console.error(`[ConfigService] Failed to invalidate cache for key "${key}":`, err.message);
    }
  }
};
