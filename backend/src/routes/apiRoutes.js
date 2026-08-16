import { Router } from 'express';
import { getProducts, getProductById } from '../controllers/apiController.js';
import { optionalAuth } from '../middleware/authMiddleware.js';
import { rateLimiter } from '../middleware/rateLimiter.js';

const router = Router();

// Products catalog routes: Supports both unauthenticated visitors (IP-based limit)
// and authenticated users (plan-based limit) via optionalAuth middleware.
router.get('/', optionalAuth, rateLimiter({ endpointSpecific: true }), getProducts);
router.get('/:id', optionalAuth, rateLimiter({ endpointSpecific: true }), getProductById);

export default router;
