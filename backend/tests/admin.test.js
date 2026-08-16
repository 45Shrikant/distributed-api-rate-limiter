import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import { generateToken } from '../src/utils/generateToken.js';
import { USER_ROLES, USER_PLANS } from '../src/utils/constants.js';
import * as configService from '../src/services/configService.js';
import RateLimitConfig from '../src/models/RateLimitConfig.js';
import * as rateLimiterService from '../src/services/rateLimiter/rateLimiterService.js';

describe('Phase 11 Dynamic Rate Limits & Admin Governance', () => {
  const adminToken = generateToken({
    userId: '64b8f0f4e13e4b001a2b3c4f',
    role: USER_ROLES.ADMIN,
    plan: USER_PLANS.PREMIUM,
  });

  const userToken = generateToken({
    userId: '64b8f0f4e13e4b001a2b3c4d',
    role: USER_ROLES.USER,
    plan: USER_PLANS.FREE,
  });

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(rateLimiterService, 'checkLimit').mockResolvedValue({
      allowed: true,
      current: 1,
      limit: 5000,
      remaining: 4999,
      resetSeconds: 60,
      retryAfter: 0,
      algorithm: 'fixed_window',
    });
  });

  describe('Config Service Cache-Aside & Invalidation', () => {
    it('getEffectiveRateLimit returns fallback defaults when no override exists', async () => {
      const result = await configService.getEffectiveRateLimit('nonexistent_key', 100, 60);
      expect(result.limit).toBe(100);
      expect(result.windowSeconds).toBe(60);
    });
  });

  describe('Admin Endpoints', () => {
    it('PUT /api/admin/rate-limits/:id updates limit and invalidates cache', async () => {
      vi.spyOn(RateLimitConfig, 'findOneAndUpdate').mockResolvedValue({
        _id: '64b8f0f4e13e4b001a2b3c99',
        key: 'free',
        limit: 150,
        windowSeconds: 60,
        type: 'plan',
      });
      const invalidateSpy = vi.spyOn(configService, 'invalidateRateLimitCache').mockResolvedValue();

      const res = await request(app)
        .put('/api/admin/rate-limits/free')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ limit: 150, windowSeconds: 60, type: 'plan' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.config.limit).toBe(150);
      expect(invalidateSpy).toHaveBeenCalledWith('free');
    });

    it('DELETE /api/admin/rate-limits/:id removes custom override', async () => {
      vi.spyOn(RateLimitConfig, 'findOneAndDelete').mockResolvedValue({
        key: 'free',
      });
      const invalidateSpy = vi.spyOn(configService, 'invalidateRateLimitCache').mockResolvedValue();

      const res = await request(app)
        .delete('/api/admin/rate-limits/free')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(invalidateSpy).toHaveBeenCalledWith('free');
    });

    it('blocks non-admin from modifying rate limits with 403 Forbidden', async () => {
      const res = await request(app)
        .put('/api/admin/rate-limits/free')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ limit: 500 });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });
  });
});
