import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import { generateToken } from '../src/utils/generateToken.js';
import { USER_ROLES, USER_PLANS } from '../src/utils/constants.js';
import * as rateLimiterService from '../src/services/rateLimiter/rateLimiterService.js';

describe('Phase 5 Basic APIs & Role Protected Routes', () => {
  beforeEach(() => {
    vi.spyOn(rateLimiterService, 'checkLimit').mockResolvedValue({
      allowed: true,
      current: 1,
      limit: 100,
      remaining: 99,
      resetSeconds: 60,
      retryAfter: 0,
      algorithm: 'fixed_window',
    });
  });
  const userToken = generateToken({
    userId: '64b8f0f4e13e4b001a2b3c4d',
    role: USER_ROLES.USER,
    plan: USER_PLANS.FREE,
  });

  const premiumToken = generateToken({
    userId: '64b8f0f4e13e4b001a2b3c4e',
    role: USER_ROLES.USER,
    plan: USER_PLANS.PREMIUM,
  });

  const adminToken = generateToken({
    userId: '64b8f0f4e13e4b001a2b3c4f',
    role: USER_ROLES.ADMIN,
    plan: USER_PLANS.PREMIUM,
  });

  describe('Products Catalog (Public API)', () => {
    it('GET /api/products returns 200 and catalog list', async () => {
      const res = await request(app).get('/api/products');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data.products)).toBe(true);
      expect(res.body.data.products.length).toBeGreaterThan(0);
    });

    it('GET /api/products/:id returns specific product details', async () => {
      const res = await request(app).get('/api/products/1');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.product.id).toBe('1');
    });

    it('GET /api/products/:id returns 404 for invalid ID', async () => {
      const res = await request(app).get('/api/products/99999');

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });

  describe('User APIs (Authenticated)', () => {
    it('GET /api/user/rate-limit returns quota for free plan', async () => {
      const res = await request(app)
        .get('/api/user/rate-limit')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.plan).toBe('free');
      expect(res.body.data.limit).toBe(100);
    });

    it('GET /api/user/rate-limit returns quota for premium plan', async () => {
      const res = await request(app)
        .get('/api/user/rate-limit')
        .set('Authorization', `Bearer ${premiumToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.plan).toBe('premium');
      expect(res.body.data.limit).toBe(1000);
    });
  });

  describe('Admin APIs (Role Protected)', () => {
    it('GET /api/admin/rate-limits rejects regular user with 403 Forbidden', async () => {
      const res = await request(app)
        .get('/api/admin/rate-limits')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Forbidden');
    });

    it('GET /api/admin/rate-limits grants admin access and returns rate-limit defaults', async () => {
      const res = await request(app)
        .get('/api/admin/rate-limits')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.defaults.plans.free.limit).toBe(100);
    });
  });
});
