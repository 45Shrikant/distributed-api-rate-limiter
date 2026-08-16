import { getRedisClient } from '../../config/redis.js';

// Token Bucket Rate Limiting Algorithm
//
// System Design Explanation:
// - Concept: A bucket holds up to 'limit' tokens and continuously refills at a rate of
//   (limit / windowSeconds) tokens per second. Each request consumes 1 token.
// - Redis Operations:
//   - Stores state as a Hash: { tokens: float, lastRefill: timestampMs }
//   - On request: calculates delta time, replenishes tokens, deducts 1 if available.
// - Advantages:
//   - Supports controlled traffic bursts (up to max bucket capacity) while maintaining
//     a smooth, sustained average throughput over time.
export const checkTokenBucket = async ({ key, limit, windowSeconds = 60 }) => {
  const redis = getRedisClient();

  if (!redis || !redis.isOpen) {
    throw new Error('Redis client not connected');
  }

  const now = Date.now();
  const bucketKey = `${key}:bucket`;
  const refillRatePerMs = limit / (windowSeconds * 1000);

  // Fetch current bucket state from Redis
  const data = await redis.hGetAll(bucketKey);

  let tokens = limit;
  let lastRefill = now;

  if (data && data.tokens !== undefined) {
    const storedTokens = parseFloat(data.tokens);
    const storedLastRefill = parseInt(data.lastRefill, 10);
    const elapsedMs = Math.max(0, now - storedLastRefill);

    // Replenish tokens based on elapsed time, capped at bucket capacity
    tokens = Math.min(limit, storedTokens + elapsedMs * refillRatePerMs);
    lastRefill = now;
  }

  const allowed = tokens >= 1;

  if (allowed) {
    tokens -= 1;
  }

  // Update bucket state and maintain TTL
  await redis.hSet(bucketKey, {
    tokens: tokens.toString(),
    lastRefill: lastRefill.toString(),
  });
  await redis.expire(bucketKey, windowSeconds * 2);

  const remaining = Math.floor(tokens);
  // Estimate time needed to refill at least 1 token
  const tokensNeeded = 1 - tokens;
  const retryAfter = allowed ? 0 : Math.max(1, Math.ceil(tokensNeeded / (refillRatePerMs * 1000)));

  return {
    allowed,
    current: limit - remaining,
    limit,
    remaining,
    resetSeconds: Math.ceil((limit - tokens) / (refillRatePerMs * 1000)),
    retryAfter,
    algorithm: 'token_bucket',
  };
};
