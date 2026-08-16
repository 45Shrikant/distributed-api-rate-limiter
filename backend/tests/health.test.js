import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import { env } from '../src/config/env.js';

describe('Phase 1 Scaffolding & Health Check', () => {
  it('GET /api/health returns 200 OK and valid health envelope', async () => {
    const res = await request(app).get('/api/health');

    expect(res.status).toBe(200);
    expect(res.headers['x-server-instance']).toBe(env.SERVER_INSTANCE_ID);
    expect(res.body).toEqual({
      success: true,
      data: expect.objectContaining({
        status: 'healthy',
        serverInstance: env.SERVER_INSTANCE_ID,
      }),
    });
  });

  it('GET /api/non-existent returns 404 standard error format', async () => {
    const res = await request(app).get('/api/non-existent');

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('Route not found');
  });
});
