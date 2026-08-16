import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import { generateToken } from '../src/utils/generateToken.js';
import * as rateLimiterService from '../src/services/rateLimiter/rateLimiterService.js';
import { USER_ROLES, USER_PLANS } from '../src/utils/constants.js';

describe('Phase 15 Comprehensive System Design E2E Test Suite', () => {
  const userA_Token = generateToken({
    userId: 'user_A_64b8f0f4e13e4b001a2b3c01',
    role: USER_ROLES.USER,
    plan: USER_PLANS.FREE,
  });

  const userB_Token = generateToken({
    userId: 'user_B_64b8f0f4e13e4b001a2b3c02',
    role: USER_ROLES.USER,
    plan: USER_PLANS.FREE,
  });

  const premiumToken = generateToken({
    userId: 'user_Prem_64b8f0f4e13e4b001a2b3c03',
    role: USER_ROLES.USER,
    plan: USER_PLANS.PREMIUM,
  });

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  // Test Requirement 1: Sequential Counter Evaluation & TTL Reset
  // 1 -> 200, 2 -> 200, 3 -> 200, 4 -> 200, 5 -> 200, 6 -> 429, TTL expiry -> 7 -> 200
  it('enforces limit = 5: requests 1..5 succeed, 6 blocked (429), and recovers after TTL reset', async () => {
    let mockCounter = 0;
    let windowExpired = false;
    const limit = 5;
    const windowSeconds = 60;

    vi.spyOn(rateLimiterService, 'checkLimit').mockImplementation(async () => {
      if (windowExpired) {
        mockCounter = 0;
        windowExpired = false;
      }
      mockCounter += 1;
      const allowed = mockCounter <= limit;
      return {
        allowed,
        current: mockCounter,
        limit,
        remaining: Math.max(0, limit - mockCounter),
        resetSeconds: allowed ? 45 : 30,
        retryAfter: allowed ? 0 : 30,
        algorithm: 'fixed_window',
      };
    });

    // 1 to 5 -> All 200 OK with decreasing remaining quota
    for (let reqNum = 1; reqNum <= 5; reqNum++) {
      const res = await request(app).get('/api/test/rate-limit?limit=5&window=60');
      expect(res.status).toBe(200);
      expect(res.headers['x-ratelimit-remaining']).toBe(String(5 - reqNum));
    }

    // Request 6 -> Exceeds quota -> 429 Blocked
    const res6 = await request(app).get('/api/test/rate-limit?limit=5&window=60');
    expect(res6.status).toBe(429);
    expect(res6.headers['x-ratelimit-remaining']).toBe('0');
    expect(res6.headers['retry-after']).toBe('30');
    expect(res6.body.success).toBe(false);
    expect(res6.body.retryAfter).toBe(30);

    // Simulate TTL window expiry
    windowExpired = true;

    // Request 7 (New window) -> 200 OK recovered
    const res7 = await request(app).get('/api/test/rate-limit?limit=5&window=60');
    expect(res7.status).toBe(200);
    expect(res7.headers['x-ratelimit-remaining']).toBe('4');
  });

  // Test Requirement 2: Multi-User Isolation in Shared Redis Counter
  it('isolates rate limits between User A and User B', async () => {
    const userCounters = {
      'rate_limit:user:user_A_64b8f0f4e13e4b001a2b3c01:/api/test/rate-limit': 5, // Exhausted
      'rate_limit:user:user_B_64b8f0f4e13e4b001a2b3c02:/api/test/rate-limit': 0, // Fresh
    };

    vi.spyOn(rateLimiterService, 'checkLimit').mockImplementation(async ({ key }) => {
      const count = userCounters[key] || 0;
      const newCount = count + 1;
      userCounters[key] = newCount;
      const limit = 5;
      const allowed = newCount <= limit;

      return {
        allowed,
        current: newCount,
        limit,
        remaining: Math.max(0, limit - newCount),
        resetSeconds: 40,
        retryAfter: allowed ? 0 : 40,
        algorithm: 'fixed_window',
      };
    });

    // User A makes a request -> Blocked (count was already 5)
    const resUserA = await request(app)
      .get('/api/test/rate-limit?limit=5&window=60')
      .set('Authorization', `Bearer ${userA_Token}`);
    expect(resUserA.status).toBe(429);

    // User B makes a request -> Allowed 200 OK (User B has distinct counter key!)
    const resUserB = await request(app)
      .get('/api/test/rate-limit?limit=5&window=60')
      .set('Authorization', `Bearer ${userB_Token}`);
    expect(resUserB.status).toBe(200);
    expect(resUserB.headers['x-ratelimit-remaining']).toBe('4');
  });

  // Test Requirement 3: Plan Tier Differential Quotas
  it('applies 100 limit to Free plan and 1000 limit to Premium plan', async () => {
    vi.spyOn(rateLimiterService, 'checkLimit').mockImplementation(async ({ limit }) => ({
      allowed: true,
      current: 1,
      limit,
      remaining: limit - 1,
      resetSeconds: 60,
      retryAfter: 0,
      algorithm: 'fixed_window',
    }));

    const resFree = await request(app)
      .get('/api/products')
      .set('Authorization', `Bearer ${userA_Token}`);
    expect(resFree.status).toBe(200);
    expect(resFree.headers['x-ratelimit-limit']).toBe('100');

    const resPremium = await request(app)
      .get('/api/products')
      .set('Authorization', `Bearer ${premiumToken}`);
    expect(resPremium.status).toBe(200);
    expect(resPremium.headers['x-ratelimit-limit']).toBe('1000');
  });

  // Test Requirement 4: Anonymous IP-Based Limiting
  it('falls back to IP-based rate limiting for unauthenticated visitors', async () => {
    let capturedKey = null;

    vi.spyOn(rateLimiterService, 'checkLimit').mockImplementation(async ({ key }) => {
      capturedKey = key;
      return {
        allowed: true,
        current: 1,
        limit: 100,
        remaining: 99,
        resetSeconds: 60,
        retryAfter: 0,
        algorithm: 'fixed_window',
      };
    });

    const res = await request(app)
      .get('/api/products')
      .set('X-Forwarded-For', '203.0.113.42');

    expect(res.status).toBe(200);
    expect(capturedKey).toBe('rate_limit:ip:203.0.113.42:/api/products');
  });
});
