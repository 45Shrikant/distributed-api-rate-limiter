import * as analyticsService from '../services/analyticsService.js';
import { HTTP_STATUS } from '../utils/constants.js';

// Builds filter criteria based on query scope and authentication
const buildFilter = (req) => {
  const filter = {};
  if (req.query.scope === 'user' && req.user?.userId) {
    filter.userId = req.user.userId;
  }
  if (req.query.endpoint) {
    filter.endpoint = req.query.endpoint;
  }
  return filter;
};

// Returns overall KPI overview
export const getOverview = async (req, res, next) => {
  try {
    const filter = buildFilter(req);
    const data = await analyticsService.getOverviewAnalytics(filter);

    res.status(HTTP_STATUS.OK).json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
};

// Returns hourly time series data for analytics charts
export const getHourly = async (req, res, next) => {
  try {
    const hours = Math.min(parseInt(req.query.hours || '24', 10), 168);
    const filter = buildFilter(req);
    const data = await analyticsService.getHourlyAnalytics(hours, filter);

    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: {
        hours,
        data,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Returns per-endpoint traffic breakdown
export const getEndpoints = async (req, res, next) => {
  try {
    const filter = buildFilter(req);
    const data = await analyticsService.getEndpointAnalytics(filter);

    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: {
        total: data.length,
        endpoints: data,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Returns HTTP status code distribution for pie charts
export const getStatusCodes = async (req, res, next) => {
  try {
    const filter = buildFilter(req);
    const data = await analyticsService.getStatusCodeAnalytics(filter);

    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: {
        statusCodes: data,
      },
    });
  } catch (error) {
    next(error);
  }
};
