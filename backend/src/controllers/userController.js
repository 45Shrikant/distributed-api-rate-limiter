import User from '../models/User.js';
import ApiRequest from '../models/ApiRequest.js';
import { HTTP_STATUS, PLAN_RATE_LIMITS, USER_PLANS } from '../utils/constants.js';

// Retrieves user profile from the database
export const getProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        message: 'User account not found',
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

// Retrieves the authenticated user's recent request audit history
export const getUserRequests = async (req, res, next) => {
  try {
    const limit = Math.min(parseInt(req.query.limit || '20', 10), 100);
    const requests = await ApiRequest.find({ userId: req.user.userId })
      .sort({ createdAt: -1 })
      .limit(limit);

    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: {
        total: requests.length,
        requests,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Retrieves the rate-limit policy and capacity assigned to the user's plan tier
export const getUserRateLimit = (req, res) => {
  const plan = req.user?.plan || USER_PLANS.FREE;
  const planConfig = PLAN_RATE_LIMITS[plan] || PLAN_RATE_LIMITS[USER_PLANS.FREE];

  res.status(HTTP_STATUS.OK).json({
    success: true,
    data: {
      userId: req.user?.userId,
      plan,
      role: req.user?.role,
      limit: planConfig.limit,
      windowSeconds: planConfig.windowSeconds,
      unit: `${planConfig.limit} requests per ${planConfig.windowSeconds} seconds`,
    },
  });
};
