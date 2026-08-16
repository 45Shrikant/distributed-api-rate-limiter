import app from '../src/app.js';
import { connectDB } from '../src/config/db.js';
import { connectRedis } from '../src/config/redis.js';

// Serverless Function Handler for Vercel / Netlify
let isInitialized = false;

export default async function handler(req, res) {
  if (!isInitialized) {
    try {
      await Promise.all([connectDB(), connectRedis()]);
      isInitialized = true;
    } catch (err) {
      console.error('[Serverless Init Error]', err);
    }
  }

  return app(req, res);
}
