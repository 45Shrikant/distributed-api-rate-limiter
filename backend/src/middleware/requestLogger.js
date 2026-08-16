import mongoose from 'mongoose';
import ApiRequest from '../models/ApiRequest.js';
import { env } from '../config/env.js';

// Non-Blocking API Request Logger Middleware
//
// System Design Principle:
// - Redis maintains low-latency, transient in-memory counters on the critical path.
// - MongoDB maintains long-term, persistent analytical logs.
// - To prevent database write latency from degrading API throughput, this middleware
//   listens for the 'finish' event on the response object and records the log asynchronously
//   AFTER the HTTP headers and payload have already been flushed to the client.
export const requestLogger = (req, res, next) => {
  const startTime = Date.now();

  // Hook into the response finish event (fires after client receives the response)
  res.on('finish', () => {
    // Avoid logging internal health checks or favicon requests to keep analytics clean
    if (req.originalUrl.startsWith('/api/health') || req.originalUrl === '/favicon.ico') {
      return;
    }

    const responseTime = Date.now() - startTime;
    const statusCode = res.statusCode;
    const rateLimited = statusCode === 429 || req.rateLimit?.allowed === false;

    // Extract sanitized path without query parameters for clean grouping in analytics
    const cleanEndpoint = req.originalUrl ? req.originalUrl.split('?')[0] : req.path;

    // Extract client IP
    const ip =
      req.headers?.['x-forwarded-for']?.split(',')[0].trim() ||
      req.socket?.remoteAddress ||
      req.ip ||
      '127.0.0.1';

    // Non-blocking background persistence to MongoDB
    // If MongoDB is offline, gracefully catch and log without interrupting application flow
    if (mongoose.connection.readyState === 1) {
      ApiRequest.create({
        userId: req.user?.userId || null,
        ip,
        method: req.method,
        endpoint: cleanEndpoint,
        statusCode,
        responseTime,
        rateLimited,
        userAgent: req.headers?.['user-agent'] || 'Unknown',
        serverInstance: env.SERVER_INSTANCE_ID,
      }).catch((err) => {
        console.error('[RequestLogger] Failed to write API request log:', err.message);
      });
    }
  });

  next();
};

export default requestLogger;
