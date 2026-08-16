import mongoose from 'mongoose';
import User from '../models/User.js';
import ApiRequest from '../models/ApiRequest.js';
import RateLimitConfig from '../models/RateLimitConfig.js';
import { invalidateRateLimitCache } from '../services/configService.js';
import { HTTP_STATUS, PLAN_RATE_LIMITS, ENDPOINT_RATE_LIMITS, USER_PLANS } from '../utils/constants.js';

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

// Updates a user's subscription plan tier (free <-> premium)
export const updateUserPlan = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { plan } = req.body;

    if (!Object.values(USER_PLANS).includes(plan)) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: `Invalid plan. Must be one of: [${Object.values(USER_PLANS).join(', ')}]`,
      });
    }

    const user = await User.findByIdAndUpdate(id, { plan }, { new: true });
    if (!user) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        message: 'User not found',
      });
    }

    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: { user: user.toJSON() },
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

// Creates or updates a dynamic rate-limit override in MongoDB and invalidates Redis cache
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

    // Invalidate Redis cache so all cluster nodes immediately pick up the new quota
    await invalidateRateLimitCache(config.key);

    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: { config },
    });
  } catch (error) {
    next(error);
  }
};

// Deletes a dynamic rate-limit override (falling back to hardcoded defaults)
export const deleteRateLimit = async (req, res, next) => {
  try {
    const { id } = req.params;
    const filter = id.match(/^[0-9a-fA-F]{24}$/) ? { _id: id } : { key: id };

    const config = await RateLimitConfig.findOneAndDelete(filter);
    if (config) {
      await invalidateRateLimitCache(config.key);
    }

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Rate limit override removed. Reverted to default threshold.',
    });
  } catch (error) {
    next(error);
  }
};

// Aggregates high-level admin metrics
export const getAdminAnalytics = async (req, res, next) => {
  try {
    const isConnected = mongoose.connection.readyState === 1;
    const [totalUsers, freeUsers, premiumUsers, totalRequests, blockedRequests] = isConnected
      ? await Promise.all([
          User.countDocuments(),
          User.countDocuments({ plan: 'free' }),
          User.countDocuments({ plan: 'premium' }),
          ApiRequest.countDocuments(),
          ApiRequest.countDocuments({ rateLimited: true }),
        ])
      : [0, 0, 0, 0, 0];

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
