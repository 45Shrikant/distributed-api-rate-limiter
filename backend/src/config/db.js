import mongoose from 'mongoose';
import { env } from './env.js';

// Establishes connection to MongoDB for persistent data storage.
// System Design Note: MongoDB is intentionally chosen for persistent domain data
// (users, subscription plans, rate-limit configs) and historical request audit trails.
// It is NOT used for real-time rate limit counters because disk-based document updates
// introduce unacceptable latency and concurrency bottlenecks compared to Redis.
export const connectDB = async () => {
  try {
    const conn = await mongoose.connect(env.MONGO_URI, {
      serverSelectionTimeoutMS: 5000, // Timeout fast if MongoDB is not reachable
    });

    console.log(`[MongoDB] Connected successfully: ${conn.connection.host}/${conn.connection.name}`);

    mongoose.connection.on('error', (err) => {
      console.error('[MongoDB] Connection error:', err.message);
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('[MongoDB] Connection lost. Attempting to reconnect...');
    });

    return conn;
  } catch (error) {
    console.error(`[MongoDB] Failed to connect to ${env.MONGO_URI}:`, error.message);
    // In production, database connectivity failure might be fatal.
    // In dev / test, we allow graceful degraded mode so tests or containerized instances can start.
    if (env.NODE_ENV === 'production') {
      process.exit(1);
    }
  }
};

// Graceful disconnection helper for tests and shutdown hooks
export const disconnectDB = async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
    console.log('[MongoDB] Disconnected successfully.');
  }
};
