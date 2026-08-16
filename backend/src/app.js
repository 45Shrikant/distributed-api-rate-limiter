import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import mongoose from 'mongoose';
import { env } from './config/env.js';
import { isRedisConnected } from './config/redis.js';
import { notFoundHandler, errorHandler } from './middleware/errorMiddleware.js';
import { HTTP_STATUS } from './utils/constants.js';
import authRoutes from './routes/authRoutes.js';

const app = express();

// Security headers to guard against common web vulnerabilities
app.use(helmet());

// Enable cross-origin requests for the frontend SPA dashboard
app.use(cors());

// Parse incoming JSON payloads
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Tag every response with the backend server instance ID.
// In a distributed cluster, this header proves that requests are being distributed
// across multiple stateless servers while sharing a single Redis rate-limit counter.
app.use((req, res, next) => {
  res.setHeader('X-Server-Instance', env.SERVER_INSTANCE_ID);
  next();
});

// Health check endpoint for load balancers, orchestrators, and sanity checks
app.get('/api/health', (req, res) => {
  const mongoReady = mongoose.connection.readyState === 1;
  const redisReady = isRedisConnected();

  res.status(HTTP_STATUS.OK).json({
    success: true,
    data: {
      status: 'healthy',
      serverInstance: env.SERVER_INSTANCE_ID,
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
      services: {
        mongodb: mongoReady ? 'connected' : 'disconnected',
        redis: redisReady ? 'connected' : 'disconnected',
        rateLimitFailMode: env.RATE_LIMIT_FAIL_MODE,
      },
    },
  });
});

// API Routes
app.use('/api/auth', authRoutes);

// Centralized error handling
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
