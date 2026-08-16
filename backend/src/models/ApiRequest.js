import mongoose from 'mongoose';

// ApiRequest Schema stores persistent audit logs of incoming API traffic.
// This data fuels MongoDB aggregation pipelines ($match, $group, $sort)
// for historical dashboards, throughput metrics, and rate-limit breach analytics.
const apiRequestSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    ip: {
      type: String,
      required: true,
      index: true,
    },
    method: {
      type: String,
      required: true,
      uppercase: true,
      enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD'],
    },
    endpoint: {
      type: String,
      required: true,
      index: true,
    },
    statusCode: {
      type: Number,
      required: true,
      index: true,
    },
    responseTime: {
      type: Number, // Measured in milliseconds
      required: true,
    },
    rateLimited: {
      type: Boolean,
      default: false,
      index: true,
    },
    userAgent: {
      type: String,
      default: 'Unknown',
    },
    serverInstance: {
      type: String,
      default: 'server-1',
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false }, // Only log timestamp of request arrival
  }
);

// Indexes optimized for analytical queries:
// 1. Time-series filtering and hourly aggregation
apiRequestSchema.index({ createdAt: -1 });
// 2. Endpoint breakdown combined with time filters
apiRequestSchema.index({ endpoint: 1, createdAt: -1 });
// 3. User request history
apiRequestSchema.index({ userId: 1, createdAt: -1 });

const ApiRequest = mongoose.model('ApiRequest', apiRequestSchema);

export default ApiRequest;
