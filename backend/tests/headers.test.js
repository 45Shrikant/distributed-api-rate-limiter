import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import * as rateLimiterService from '../src/services/rateLimiter/rateLimiterService.js';
import { env } from '../src/config/env.js';

describe('Phase 7 Rate-Limit Headers & 429 Response Standardization', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('sets standard rate-limit headers on 200 OK responses', async () => {
    vi.spyOn(rateLimiterService, 'checkLimit').mockResolvedValue({
      allowed: true,
      current: 1,
      limit: 10,
      remaining: 9,
      resetSeconds: 58,
      retryAfter: 0,
      algorithm: 'fixed_window',
    });

    const res = await request(app).get('/api/test/rate-limit?limit=10&window=60');

    expect(res.status).toBe(200);
    expect(res.headers['x-server-instance']).toBe(env.SERVER_INSTANCE_ID);
    expect(res.headers['x-ratelimit-limit']).toBe('10');
    expect(res.headers['x-ratelimit-remaining']).toBe('9');
    expect(res.headers['x-ratelimit-reset']).toBe('58');
    expect(res.body.success).toBe(true);
    expect(res.body.data.headers['X-RateLimit-Limit']).toBe('10');
  });

  it('sets Retry-After and X-RateLimit headers on HTTP 429 response', async () => {
    vi.spyOn(rateLimiterService, 'checkLimit').mockResolvedValue({
      allowed: false,
      current: 11,
      limit: 10,
      remaining: 0,
      resetSeconds: 42,
      retryAfter: 42,
      algorithm: 'fixed_window',
    });

    const res = await request(app).get('/api/test/rate-limit?limit=10&window=60');

    expect(res.status).toBe(429);
    expect(res.headers['x-server-instance']).toBe(env.SERVER_INSTANCE_ID);
    expect(res.headers['x-ratelimit-limit']).toBe('10');
    expect(res.headers['x-ratelimit-remaining']).toBe('0');
    expect(res.headers['x-ratelimit-reset']).toBe('42');
    expect(res.headers['retry-after']).toBe('42');
    expect(res.body).toEqual({
      success: false,
      message: 'Too many requests',
      retryAfter: 42,
    });
  });
});
