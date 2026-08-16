import { Router } from 'express';
import { register, login, getMe } from '../controllers/authController.js';
import { authenticate } from '../middleware/authMiddleware.js';

const router = Router();

// Public authentication routes
router.post('/register', register);
router.post('/login', login);

// Authenticated user profile route
router.get('/me', authenticate, getMe);

export default router;
