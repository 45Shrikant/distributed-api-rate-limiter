import mongoose from 'mongoose';
import User from '../models/User.js';
import ApiRequest from '../models/ApiRequest.js';
import RateLimitConfig from '../models/RateLimitConfig.js';
import { HTTP_STATUS, PLAN_RATE_LIMITS, ENDPOINT_RATE_LIMITS } from '../utils/constants.js';

// Returns paginated list of registered users and their current subscription tiers
export const getUsers = async (req, res, next) => {
  try {
    const page = Math.max(parseInt(req.query.page || '1', 10), 1);
    const limit = Math.min(parseInt(req.query.limit || '20', 10), 100);
    const skip = (page - 1) * limit;

    const isConnected = mongoose.connection.readyState === 1;
    const [users, total] = isConnected
      ? await Promise.all([
          User.find().sort({ createdAt: -1 }).skip(skip).limit(limit),
          User.countDocuments(),
        ])
      : [[], 0];

    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: {
        total,
        page,
        pages: Math.ceil(total / limit) || 1,
        users,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Returns current rate-limit configurations (database dynamic overrides + hardcoded fallback defaults)
export const getRateLimits = async (req, res, next) => {
  try {
    const isConnected = mongoose.connection.readyState === 1;
    const customConfigs = isConnected
      ? await RateLimitConfig.find().sort({ type: 1, key: 1 })
      : [];

    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: {
        defaults: {
          plans: PLAN_RATE_LIMITS,
          endpoints: ENDPOINT_RATE_LIMITS,
        },
        customOverrides: customConfigs,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Creates or updates a dynamic rate-limit override in MongoDB
export const updateRateLimit = async (req, res, next) => {
  try {
    const { id } = req.params; // Can be MongoDB _id or key name
    const { limit, windowSeconds, type, description } = req.body;

    if (!limit || limit < 1) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: 'Limit must be a positive integer greater than 0',
      });
    }

    // Upsert either by ID or key
    const filter = id.match(/^[0-9a-fA-F]{24}$/) ? { _id: id } : { key: id };
    const update = {
      limit: Number(limit),
      windowSeconds: Number(windowSeconds || 60),
      ...(type && { type }),
      ...(description !== undefined && { description }),
      ...(filter.key && { key: filter.key }),
    };

    const config = await RateLimitConfig.findOneAndUpdate(filter, update, {
      new: true,
      upsert: true,
      runValidators: true,
    });

    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: { config },
    });
  } catch (error) {
    next(error);
  }
};

// Aggregates high-level admin metrics
export const getAdminAnalytics = async (req, res, next) => {
  try {
    const [totalUsers, freeUsers, premiumUsers, totalRequests, blockedRequests] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ plan: 'free' }),
      User.countDocuments({ plan: 'premium' }),
      ApiRequest.countDocuments(),
      ApiRequest.countDocuments({ rateLimited: true }),
    ]);

    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: {
        users: {
          total: totalUsers,
          free: freeUsers,
          premium: premiumUsers,
        },
        traffic: {
          totalRequests,
          blockedRequests,
          blockRate: totalRequests > 0 ? `${((blockedRequests / totalRequests) * 100).toFixed(2)}%` : '0%',
        },
      },
    });
  } catch (error) {
    next(error);
  }
};
