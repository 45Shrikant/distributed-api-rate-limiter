import { getRedisClient } from '../../config/redis.js';

// Sliding Window Log Rate Limiting Algorithm
//
// System Design Explanation:
// - Concept: Maintains a timestamp log of every request inside a Redis Sorted Set (ZSET).
// - Redis Operations:
//   1. ZREMRANGEBYSCORE key -inf (now - windowMs): Evicts old requests outside the rolling window.
//   2. ZCARD key: Counts remaining active requests within the window.
//   3. If count < limit: ZADD key now uniqueRequestId to record the request.
//   4. EXPIRE key windowSeconds: Refreshes TTL to prevent memory leaks.
// - Advantages:
//   - 100% accurate; eliminates the fixed-window boundary burst problem.
// - Tradeoffs:
//   - Higher memory footprint (stores a timestamp per request rather than a single integer counter).
//   - Higher computational overhead than simple INCR.
export const checkSlidingWindow = async ({ key, limit, windowSeconds = 60 }) => {
  const redis = getRedisClient();

  if (!redis || !redis.isOpen) {
    throw new Error('Redis client not connected');
  }

  const now = Date.now();
  const windowMs = windowSeconds * 1000;
  const windowStart = now - windowMs;
  const zsetKey = `${key}:sliding`;

  // 1. Remove expired timestamps outside the current sliding window
  await redis.zRemRangeByScore(zsetKey, '-inf', windowStart);

  // 2. Count requests currently in the window
  const currentCount = await redis.zCard(zsetKey);

  const allowed = currentCount < limit;
  let resetSeconds = windowSeconds;

  if (allowed) {
    // Record current request with unique member ID
    const member = `${now}:${Math.random().toString(36).slice(2, 9)}`;
    await redis.zAdd(zsetKey, [{ score: now, value: member }]);
    await redis.expire(zsetKey, windowSeconds + 1);
  }

  // Determine oldest record to calculate exact reset countdown
  const oldest = await redis.zRangeWithScores(zsetKey, 0, 0);
  if (oldest && oldest.length > 0) {
    const oldestTimestamp = oldest[0].score;
    const expiresAt = oldestTimestamp + windowMs;
    resetSeconds = Math.max(1, Math.ceil((expiresAt - now) / 1000));
  }

  const current = allowed ? currentCount + 1 : currentCount;
  const remaining = Math.max(0, limit - current);
  const retryAfter = allowed ? 0 : resetSeconds;

  return {
    allowed,
    current,
    limit,
    remaining,
    resetSeconds,
    retryAfter,
    algorithm: 'sliding_window',
  };
};
