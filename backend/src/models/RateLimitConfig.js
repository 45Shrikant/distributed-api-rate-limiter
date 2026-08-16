import mongoose from 'mongoose';

// RateLimitConfig Schema allows administrators to dynamically adjust rate limits
// per subscription plan or specific API endpoints without requiring server restarts.
const rateLimitConfigSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      required: true,
      enum: ['plan', 'endpoint'],
    },
    // The identifier key: e.g. 'free', 'premium', 'admin' for plans, or '/api/products', '/api/auth/login' for endpoints
    key: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    limit: {
      type: Number,
      required: true,
      min: [1, 'Rate limit must be at least 1 request'],
    },
    windowSeconds: {
      type: Number,
      required: true,
      default: 60,
      min: [1, 'Window must be at least 1 second'],
    },
    description: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

const RateLimitConfig = mongoose.model('RateLimitConfig', rateLimitConfigSchema);

export default RateLimitConfig;
