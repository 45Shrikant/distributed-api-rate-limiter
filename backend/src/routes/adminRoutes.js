import { Router } from 'express';
import { getUsers, getRateLimits, updateRateLimit, getAdminAnalytics } from '../controllers/adminController.js';
import { authenticate, authorize } from '../middleware/authMiddleware.js';
import { USER_ROLES } from '../utils/constants.js';

const router = Router();

// Protect all admin endpoints with strict authentication and role authorization
router.use(authenticate, authorize(USER_ROLES.ADMIN));

router.get('/users', getUsers);
router.get('/rate-limits', getRateLimits);
router.put('/rate-limits/:id', updateRateLimit);
router.get('/analytics', getAdminAnalytics);

export default router;
