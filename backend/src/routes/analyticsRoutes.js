import { Router } from 'express';
import { getOverview, getHourly, getEndpoints, getStatusCodes } from '../controllers/analyticsController.js';
import { optionalAuth } from '../middleware/authMiddleware.js';
import { rateLimiter } from '../middleware/rateLimiter.js';
import { ENDPOINT_RATE_LIMITS } from '../utils/constants.js';

const router = Router();

// Apply optional auth (for user scoping) and specialized rate limiter (60/min) to prevent dashboard polling overload
router.use(optionalAuth, rateLimiter(ENDPOINT_RATE_LIMITS.ANALYTICS));

router.get('/overview', getOverview);
router.get('/hourly', getHourly);
router.get('/endpoints', getEndpoints);
router.get('/status-codes', getStatusCodes);

export default router;
