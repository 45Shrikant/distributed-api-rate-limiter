import { checkFixedWindow } from './fixedWindow.js';
import { checkSlidingWindow } from './slidingWindow.js';
import { checkTokenBucket } from './tokenBucket.js';
import { handleRedisFailure } from '../../config/redis.js';

// Unified Rate Limiter Service Facade
//
// System Design Strategy Pattern:
// Allows seamless switching between Fixed Window, Sliding Window, and Token Bucket
// algorithms behind a standard interface without modifying Express middleware routes.
export const checkLimit = async ({
  key,
  limit,
  windowSeconds = 60,
  algorithm = 'fixed_window',
}) => {
  try {
    switch (algorithm) {
      case 'sliding_window':
        return await checkSlidingWindow({ key, limit, windowSeconds });
      case 'token_bucket':
        return await checkTokenBucket({ key, limit, windowSeconds });
      case 'fixed_window':
      default:
        return await checkFixedWindow({ key, limit, windowSeconds });
    }
  } catch (error) {
    // Intercepts Redis exceptions and executes the configured failure strategy (fail-closed / fail-open)
    return handleRedisFailure(`rateLimit:${algorithm}`, error);
  }
};
