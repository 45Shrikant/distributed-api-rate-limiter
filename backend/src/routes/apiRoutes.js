import { Router } from 'express';
import { getProducts, getProductById } from '../controllers/apiController.js';
import { optionalAuth } from '../middleware/authMiddleware.js';

const router = Router();

// Products catalog routes: Supports both unauthenticated visitors (IP-based limit)
// and authenticated users (plan-based limit) via optionalAuth middleware.
router.get('/', optionalAuth, getProducts);
router.get('/:id', optionalAuth, getProductById);

export default router;
