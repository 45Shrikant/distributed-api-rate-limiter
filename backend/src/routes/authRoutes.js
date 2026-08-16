import { Router } from 'express';
import { register, login, getMe } from '../controllers/authController.js';
import { authenticate } from '../middleware/authMiddleware.js';
import { rateLimiter } from '../middleware/rateLimiter.js';
import { ENDPOINT_RATE_LIMITS } from '../utils/constants.js';

const router = Router();

// Public authentication routes protected by strict IP-based rate limits to guard against brute-force attacks
router.post('/register', rateLimiter(ENDPOINT_RATE_LIMITS.AUTH_REGISTER), register);
router.post('/login', rateLimiter(ENDPOINT_RATE_LIMITS.AUTH_LOGIN), login);

// Authenticated user profile route
router.get('/me', authenticate, rateLimiter(), getMe);

export default router;
