import { Router } from 'express';
import {
  getUsers,
  updateUserPlan,
  getRateLimits,
  updateRateLimit,
  deleteRateLimit,
  getAdminAnalytics,
} from '../controllers/adminController.js';
import { authenticate, authorize } from '../middleware/authMiddleware.js';
import { USER_ROLES } from '../utils/constants.js';

const router = Router();

// Protect all admin endpoints with strict authentication and role authorization
router.use(authenticate, authorize(USER_ROLES.ADMIN));

router.get('/users', getUsers);
router.patch('/users/:id/plan', updateUserPlan);
router.get('/rate-limits', getRateLimits);
router.put('/rate-limits/:id', updateRateLimit);
router.delete('/rate-limits/:id', deleteRateLimit);
router.get('/analytics', getAdminAnalytics);

export default router;
