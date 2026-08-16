import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import { getClientIdentifier } from '../src/utils/getClientIdentifier.js';
import { rateLimiter } from '../src/middleware/rateLimiter.js';
import * as rateLimiterService from '../src/services/rateLimiter/rateLimiterService.js';
import { HTTP_STATUS } from '../src/utils/constants.js';

describe('Phase 6 Rate Limiter System & Algorithms', () => {
  describe('getClientIdentifier Utility', () => {
    it('generates IP-based key for unauthenticated requests', () => {
      const req = {
        headers: { 'x-forwarded-for': '192.168.1.100' },
        path: '/api/products',
      };

      const result = getClientIdentifier(req, { endpointSpecific: false });
      expect(result.key).toBe('rate_limit:ip:192.168.1.100');
      expect(result.subjectType).toBe('ip');
      expect(result.subjectId).toBe('192.168.1.100');
    });

    it('generates User-based key when user is authenticated', () => {
      const req = {
        user: { userId: 'user123', plan: 'premium' },
        headers: {},
        path: '/api/products',
      };

      const result = getClientIdentifier(req, { endpointSpecific: false });
      expect(result.key).toBe('rate_limit:user:user123');
      expect(result.subjectType).toBe('user');
    });

    it('appends endpoint to key when endpointSpecific is true', () => {
      const req = {
        user: { userId: 'user123' },
        originalUrl: '/api/products?category=db',
        path: '/api/products',
      };

      const result = getClientIdentifier(req, { endpointSpecific: true });
      expect(result.key).toBe('rate_limit:user:user123:/api/products');
    });
  });

  describe('Rate Limiter Middleware Execution & Headers', () => {
    let app;
    let mockCounter = 0;

    beforeEach(() => {
      mockCounter = 0;
      app = express();
      app.use(express.json());
    });

    it('allows requests below limit and injects X-RateLimit-* headers', async () => {
      // Mock checkLimit to simulate 3rd request out of limit 5
      vi.spyOn(rateLimiterService, 'checkLimit').mockResolvedValue({
        allowed: true,
        current: 3,
        limit: 5,
        remaining: 2,
        resetSeconds: 45,
        retryAfter: 0,
        algorithm: 'fixed_window',
      });

      app.get('/test', rateLimiter({ limit: 5, windowSeconds: 60 }), (req, res) => {
        res.json({ success: true, message: 'Resource accessed' });
      });

      const res = await request(app).get('/test');

      expect(res.status).toBe(200);
      expect(res.headers['x-ratelimit-limit']).toBe('5');
      expect(res.headers['x-ratelimit-remaining']).toBe('2');
      expect(res.headers['x-ratelimit-reset']).toBe('45');
      expect(res.body.success).toBe(true);
    });

    it('blocks requests above limit with HTTP 429 and Retry-After header', async () => {
      // Mock checkLimit to simulate 6th request exceeding limit 5
      vi.spyOn(rateLimiterService, 'checkLimit').mockResolvedValue({
        allowed: false,
        current: 6,
        limit: 5,
        remaining: 0,
        resetSeconds: 30,
        retryAfter: 30,
        algorithm: 'fixed_window',
      });

      app.get('/test-blocked', rateLimiter({ limit: 5, windowSeconds: 60 }), (req, res) => {
        res.json({ success: true });
      });

      const res = await request(app).get('/test-blocked');

      expect(res.status).toBe(HTTP_STATUS.TOO_MANY_REQUESTS);
      expect(res.headers['x-ratelimit-limit']).toBe('5');
      expect(res.headers['x-ratelimit-remaining']).toBe('0');
      expect(res.headers['retry-after']).toBe('30');
      expect(res.body).toEqual({
        success: false,
        message: 'Too many requests',
        retryAfter: 30,
      });
    });

    it('simulates 1 to 5 allowed requests, then 6th request blocked with 429', async () => {
      const limit = 5;
      vi.spyOn(rateLimiterService, 'checkLimit').mockImplementation(async () => {
        mockCounter += 1;
        const allowed = mockCounter <= limit;
        return {
          allowed,
          current: mockCounter,
          limit,
          remaining: Math.max(0, limit - mockCounter),
          resetSeconds: 60,
          retryAfter: allowed ? 0 : 60,
          algorithm: 'fixed_window',
        };
      });

      app.get('/counter-test', rateLimiter({ limit: 5, windowSeconds: 60 }), (req, res) => {
        res.json({ success: true, count: mockCounter });
      });

      // Send 5 requests below and up to limit -> All 200 OK
      for (let i = 1; i <= 5; i++) {
        const res = await request(app).get('/counter-test');
        expect(res.status).toBe(200);
        expect(res.headers['x-ratelimit-remaining']).toBe(String(5 - i));
      }

      // 6th request -> 429 Too Many Requests
      const res6 = await request(app).get('/counter-test');
      expect(res6.status).toBe(429);
      expect(res6.body.success).toBe(false);
      expect(res6.body.retryAfter).toBe(60);
    });
  });
});
