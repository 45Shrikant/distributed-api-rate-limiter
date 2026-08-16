import mongoose from 'mongoose';
import ApiRequest from '../models/ApiRequest.js';

// MongoDB Aggregation Pipelines Service
//
// System Design Explanation:
// MongoDB Aggregation Framework processes streams of documents through multi-stage pipelines:
// 1. $match: Filters documents by time boundary or user identifier using database indexes.
// 2. $group: Accumulates metrics ($sum, $avg, conditional counters with $cond) over groups.
// 3. $sort: Orders output results (e.g. descending by highest traffic).
// 4. $project: Reshapes documents into clean, frontend-ready schema structures.
export const getOverviewAnalytics = async (filter = {}) => {
  if (mongoose.connection.readyState !== 1) {
    return {
      totalRequests: 0,
      successfulRequests: 0,
      blockedRequests: 0,
      averageResponseTime: 0,
      topEndpoints: [],
    };
  }

  const matchStage = { $match: filter };

  // Pipeline 1: High-level KPI totals and average response times
  const kpiPipeline = [
    matchStage,
    {
      $group: {
        _id: null,
        totalRequests: { $sum: 1 },
        successfulRequests: {
          $sum: { $cond: [{ $eq: ['$rateLimited', false] }, 1, 0] },
        },
        blockedRequests: {
          $sum: { $cond: [{ $eq: ['$rateLimited', true] }, 1, 0] },
        },
        avgResponseTime: { $avg: '$responseTime' },
      },
    },
    {
      $project: {
        _id: 0,
        totalRequests: 1,
        successfulRequests: 1,
        blockedRequests: 1,
        averageResponseTime: { $round: ['$avgResponseTime', 2] },
      },
    },
  ];

  // Pipeline 2: Top endpoints by traffic volume
  const topEndpointsPipeline = [
    matchStage,
    {
      $group: {
        _id: '$endpoint',
        count: { $sum: 1 },
        blocked: {
          $sum: { $cond: [{ $eq: ['$rateLimited', true] }, 1, 0] },
        },
        avgResponseTime: { $avg: '$responseTime' },
      },
    },
    { $sort: { count: -1 } },
    { $limit: 5 },
    {
      $project: {
        _id: 0,
        endpoint: '$_id',
        count: 1,
        blocked: 1,
        avgResponseTime: { $round: ['$avgResponseTime', 2] },
      },
    },
  ];

  const [kpiResults, topEndpoints] = await Promise.all([
    ApiRequest.aggregate(kpiPipeline),
    ApiRequest.aggregate(topEndpointsPipeline),
  ]);

  const kpis = kpiResults[0] || {
    totalRequests: 0,
    successfulRequests: 0,
    blockedRequests: 0,
    averageResponseTime: 0,
  };

  return {
    ...kpis,
    topEndpoints,
  };
};

// Returns hourly traffic breakdown for charts ($match -> $group by hour -> $sort by time)
export const getHourlyAnalytics = async (hours = 24, filter = {}) => {
  if (mongoose.connection.readyState !== 1) return [];

  const timeLimit = new Date(Date.now() - hours * 60 * 60 * 1000);
  const matchFilter = { ...filter, createdAt: { $gte: timeLimit } };

  const pipeline = [
    { $match: matchFilter },
    {
      $group: {
        // Group by year-month-day-hour timestamp
        _id: {
          $dateToString: { format: '%Y-%m-%d %H:00', date: '$createdAt' },
        },
        total: { $sum: 1 },
        successful: {
          $sum: { $cond: [{ $eq: ['$rateLimited', false] }, 1, 0] },
        },
        blocked: {
          $sum: { $cond: [{ $eq: ['$rateLimited', true] }, 1, 0] },
        },
        avgResponseTime: { $avg: '$responseTime' },
      },
    },
    { $sort: { _id: 1 } }, // Chronological sort
    {
      $project: {
        _id: 0,
        hour: '$_id',
        total: 1,
        successful: 1,
        blocked: 1,
        avgResponseTime: { $round: ['$avgResponseTime', 2] },
      },
    },
  ];

  return await ApiRequest.aggregate(pipeline);
};

// Returns request metrics broken down across all API endpoints
export const getEndpointAnalytics = async (filter = {}) => {
  if (mongoose.connection.readyState !== 1) return [];

  const pipeline = [
    { $match: filter },
    {
      $group: {
        _id: { endpoint: '$endpoint', method: '$method' },
        total: { $sum: 1 },
        successful: {
          $sum: { $cond: [{ $eq: ['$rateLimited', false] }, 1, 0] },
        },
        blocked: {
          $sum: { $cond: [{ $eq: ['$rateLimited', true] }, 1, 0] },
        },
        avgResponseTime: { $avg: '$responseTime' },
      },
    },
    { $sort: { total: -1 } },
    {
      $project: {
        _id: 0,
        endpoint: '$_id.endpoint',
        method: '$_id.method',
        total: 1,
        successful: 1,
        blocked: 1,
        avgResponseTime: { $round: ['$avgResponseTime', 2] },
      },
    },
  ];

  return await ApiRequest.aggregate(pipeline);
};

// Returns HTTP status code distribution (e.g. 200, 429, 401, 500)
export const getStatusCodeAnalytics = async (filter = {}) => {
  if (mongoose.connection.readyState !== 1) return [];

  const pipeline = [
    { $match: filter },
    {
      $group: {
        _id: '$statusCode',
        count: { $sum: 1 },
      },
    },
    { $sort: { count: -1 } },
    {
      $project: {
        _id: 0,
        statusCode: '$_id',
        count: 1,
      },
    },
  ];

  return await ApiRequest.aggregate(pipeline);
};
