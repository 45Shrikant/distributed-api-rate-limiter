import { checkLimit } from '../services/rateLimiterService.js';
import { getClientIdentifier } from '../utils/getClientIdentifier.js';
import { PLAN_RATE_LIMITS, USER_PLANS, HTTP_STATUS } from '../utils/constants.js';

// Express Rate Limiter Middleware Factory
//
// System Design Explanation:
// - Intercepts every incoming HTTP request BEFORE controller execution.
// - Resolves client identifier (user ID or IP) and applicable limit tier.
// - Atomically verifies capacity against shared Redis state.
// - Attaches standard rate-limit headers (X-RateLimit-Limit, Remaining, Reset).
// - Returns HTTP 429 Too Many Requests when limits are exceeded.
export const rateLimiter = (options = {}) => {
  const {
    limit: explicitLimit,
    windowSeconds: explicitWindowSeconds = 60,
    endpointSpecific = true,
    algorithm = 'fixed_window',
  } = options;

  return async (req, res, next) => {
    try {
      // 1. Determine effective rate limit based on explicit options or authenticated user plan
      let limit = explicitLimit;
      let windowSeconds = explicitWindowSeconds;

      if (!limit) {
        const plan = req.user?.plan || USER_PLANS.FREE;
        const planConfig = PLAN_RATE_LIMITS[plan] || PLAN_RATE_LIMITS[USER_PLANS.FREE];
        limit = planConfig.limit;
        windowSeconds = planConfig.windowSeconds;
      }

      // 2. Generate Redis subject key (e.g. rate_limit:user:123:/api/products or rate_limit:ip:127.0.0.1:/api/auth/login)
      const { key, subjectType, subjectId } = getClientIdentifier(req, { endpointSpecific });

      // 3. Evaluate limit atomically against Redis
      const result = await checkLimit({
        key,
        limit,
        windowSeconds,
        algorithm,
      });

      // 4. Attach rate-limiting metadata to request context for downstream logger (Phase 8)
      req.rateLimit = {
        ...result,
        key,
        subjectType,
        subjectId,
      };

      // 5. Inject standard IETF rate-limit response headers
      if (result.limit !== Infinity) {
        res.setHeader('X-RateLimit-Limit', result.limit);
        res.setHeader('X-RateLimit-Remaining', result.remaining);
        res.setHeader('X-RateLimit-Reset', result.resetSeconds);
      }

      // 6. Handle rate-limit violations
      if (!result.allowed) {
        res.setHeader('Retry-After', result.retryAfter);
        return res.status(HTTP_STATUS.TOO_MANY_REQUESTS).json({
          success: false,
          message: 'Too many requests',
          retryAfter: result.retryAfter,
        });
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

export default rateLimiter;
