import { Router } from 'express';
import { getProfile, getUserRequests, getUserRateLimit } from '../controllers/userController.js';
import { authenticate } from '../middleware/authMiddleware.js';

const router = Router();

// All user routes require a valid JWT
router.use(authenticate);

router.get('/profile', getProfile);
router.get('/requests', getUserRequests);
router.get('/rate-limit', getUserRateLimit);

export default router;
