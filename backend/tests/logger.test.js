import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import mongoose from 'mongoose';
import { requestLogger } from '../src/middleware/requestLogger.js';
import ApiRequest from '../src/models/ApiRequest.js';

describe('Phase 8 Non-Blocking API Request Logging', () => {
  let app;
  let createSpy;

  beforeEach(() => {
    vi.restoreAllMocks();
    Object.defineProperty(mongoose.connection, 'readyState', {
      value: 1,
      configurable: true,
      writable: true,
    });
    createSpy = vi.spyOn(ApiRequest, 'create').mockResolvedValue({});

    app = express();
    app.use(express.json());
    app.use(requestLogger);
  });

  it('records request to MongoDB on response finish event', async () => {
    app.get('/api/sample', (req, res) => {
      res.status(200).json({ success: true });
    });

    const res = await request(app).get('/api/sample');
    expect(res.status).toBe(200);

    expect(createSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'GET',
        endpoint: '/api/sample',
        statusCode: 200,
        rateLimited: false,
      })
    );
  });

  it('flags rateLimited as true on 429 status code', async () => {
    app.get('/api/throttled', (req, res) => {
      res.status(429).json({ success: false, message: 'Too many requests' });
    });

    const res = await request(app).get('/api/throttled');
    expect(res.status).toBe(429);

    expect(createSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'GET',
        endpoint: '/api/throttled',
        statusCode: 429,
        rateLimited: true,
      })
    );
  });

  it('ignores health check route to preserve clean analytics', async () => {
    app.get('/api/health', (req, res) => {
      res.status(200).json({ success: true });
    });

    await request(app).get('/api/health');
    expect(createSpy).not.toHaveBeenCalled();
  });
});
