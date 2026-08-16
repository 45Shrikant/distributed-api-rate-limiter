import { Router } from 'express';
import { rateLimiter } from '../middleware/rateLimiter.js';
import { optionalAuth } from '../middleware/authMiddleware.js';
import { HTTP_STATUS } from '../utils/constants.js';

const router = Router();

// Dedicated test route allowing frontend developers and automated testers
// to dynamically test rate limits with custom quotas, window durations, and algorithms.
// Example: GET /api/test/rate-limit?limit=5&window=30&algorithm=fixed_window
router.get(
  '/rate-limit',
  optionalAuth,
  (req, res, next) => {
    const limit = req.query.limit ? parseInt(req.query.limit, 10) : 5;
    const windowSeconds = req.query.window ? parseInt(req.query.window, 10) : 60;
    const algorithm = req.query.algorithm || 'fixed_window';

    const middleware = rateLimiter({
      limit,
      windowSeconds,
      endpointSpecific: true,
      algorithm,
    });

    return middleware(req, res, next);
  },
  (req, res) => {
    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Request within rate limit',
      data: {
        rateLimit: req.rateLimit,
        headers: {
          'X-RateLimit-Limit': res.getHeader('X-RateLimit-Limit'),
          'X-RateLimit-Remaining': res.getHeader('X-RateLimit-Remaining'),
          'X-RateLimit-Reset': res.getHeader('X-RateLimit-Reset'),
          'X-Server-Instance': res.getHeader('X-Server-Instance'),
        },
      },
    });
  }
);

export default router;
