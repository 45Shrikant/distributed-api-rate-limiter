import { getRedisClient } from '../../config/redis.js';

// Fixed Window Counter Rate Limiting Algorithm
//
// System Design Explanation:
// - Concept: Divides time into fixed buckets (e.g., 60-second windows).
// - Redis Operations:
//   1. INCR key: Atomically increments counter. Returns new value immediately.
//   2. EXPIRE key windowSeconds: Sets TTL only when counter is initialized (current === 1).
//   3. TTL key: Obtains remaining seconds until current window reset.
// - Advantages:
//   - Extremely fast (O(1) time complexity, minimal memory overhead).
//   - Zero race conditions due to atomic INCR.
// - Limitations (The "Boundary Burst" Problem):
//   - A client could send 100 requests at 00:59 and 100 requests at 01:00,
//     resulting in 200 requests within a 2-second window across the window boundary.
export const checkFixedWindow = async ({ key, limit, windowSeconds = 60 }) => {
  const redis = getRedisClient();

  if (!redis || !redis.isOpen) {
    throw new Error('Redis client not connected');
  }

  // Atomically increment counter
  const current = await redis.incr(key);

  // Set TTL on key creation (first request in this window)
  if (current === 1) {
    await redis.expire(key, windowSeconds);
  }

  // Get remaining TTL for reset calculation and client response headers
  let ttl = await redis.ttl(key);

  // Guard against edge cases where key exists without TTL (e.g. server crash between INCR and EXPIRE)
  if (ttl < 0) {
    await redis.expire(key, windowSeconds);
    ttl = windowSeconds;
  }

  const allowed = current <= limit;
  const remaining = Math.max(0, limit - current);
  const resetSeconds = ttl;
  const retryAfter = allowed ? 0 : resetSeconds;

  return {
    allowed,
    current,
    limit,
    remaining,
    resetSeconds,
    retryAfter,
    algorithm: 'fixed_window',
  };
};
