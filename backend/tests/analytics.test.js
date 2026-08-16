import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import * as rateLimiterService from '../src/services/rateLimiter/rateLimiterService.js';
import * as analyticsService from '../src/services/analyticsService.js';

describe('Phase 9 Analytics & MongoDB Aggregation Pipelines', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(rateLimiterService, 'checkLimit').mockResolvedValue({
      allowed: true,
      current: 1,
      limit: 60,
      remaining: 59,
      resetSeconds: 60,
      retryAfter: 0,
      algorithm: 'fixed_window',
    });
  });

  describe('Analytics Endpoints Integration', () => {
    it('GET /api/analytics/overview returns KPI overview', async () => {
      vi.spyOn(analyticsService, 'getOverviewAnalytics').mockResolvedValue({
        totalRequests: 1250,
        successfulRequests: 1180,
        blockedRequests: 70,
        averageResponseTime: 14.2,
        topEndpoints: [
          { endpoint: '/api/products', count: 800, blocked: 20, avgResponseTime: 12.1 },
        ],
      });

      const res = await request(app).get('/api/analytics/overview');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.totalRequests).toBe(1250);
      expect(res.body.data.successfulRequests).toBe(1180);
      expect(res.body.data.blockedRequests).toBe(70);
      expect(res.body.data.averageResponseTime).toBe(14.2);
      expect(Array.isArray(res.body.data.topEndpoints)).toBe(true);
    });

    it('GET /api/analytics/hourly returns time-series array', async () => {
      vi.spyOn(analyticsService, 'getHourlyAnalytics').mockResolvedValue([
        { hour: '2026-08-16 10:00', total: 150, successful: 140, blocked: 10, avgResponseTime: 15.3 },
        { hour: '2026-08-16 11:00', total: 220, successful: 210, blocked: 10, avgResponseTime: 12.8 },
      ]);

      const res = await request(app).get('/api/analytics/hourly?hours=24');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data.data)).toBe(true);
      expect(res.body.data.data.length).toBe(2);
    });

    it('GET /api/analytics/endpoints returns breakdown by endpoint', async () => {
      vi.spyOn(analyticsService, 'getEndpointAnalytics').mockResolvedValue([
        { endpoint: '/api/products', method: 'GET', total: 500, successful: 480, blocked: 20, avgResponseTime: 11.2 },
        { endpoint: '/api/auth/login', method: 'POST', total: 100, successful: 95, blocked: 5, avgResponseTime: 85.4 },
      ]);

      const res = await request(app).get('/api/analytics/endpoints');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.endpoints.length).toBe(2);
    });

    it('GET /api/analytics/status-codes returns status code distribution', async () => {
      vi.spyOn(analyticsService, 'getStatusCodeAnalytics').mockResolvedValue([
        { statusCode: 200, count: 850 },
        { statusCode: 429, count: 50 },
        { statusCode: 401, count: 20 },
      ]);

      const res = await request(app).get('/api/analytics/status-codes');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.statusCodes.length).toBe(3);
    });
  });
});
