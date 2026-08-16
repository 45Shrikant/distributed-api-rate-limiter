import { describe, it, expect } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import app from '../src/app.js';
import { env } from '../src/config/env.js';
import { generateToken } from '../src/utils/generateToken.js';
import { authenticate, optionalAuth, authorize } from '../src/middleware/authMiddleware.js';
import { USER_ROLES, USER_PLANS, HTTP_STATUS } from '../src/utils/constants.js';

describe('Phase 4 Authentication & Authorization', () => {
  const sampleUserId = '64b8f0f4e13e4b001a2b3c4d';

  describe('JWT Token Generation & Verification', () => {
    it('generates a valid JWT signed with env.JWT_SECRET', () => {
      const token = generateToken({
        userId: sampleUserId,
        role: USER_ROLES.USER,
        plan: USER_PLANS.FREE,
      });

      expect(typeof token).toBe('string');
      const decoded = jwt.verify(token, env.JWT_SECRET);
      expect(decoded.userId).toBe(sampleUserId);
      expect(decoded.role).toBe(USER_ROLES.USER);
      expect(decoded.plan).toBe(USER_PLANS.FREE);
    });

    it('hashes passwords and validates with bcrypt', async () => {
      const password = 'mySecretPassword123';
      const hash = await bcrypt.hash(password, 10);

      expect(await bcrypt.compare(password, hash)).toBe(true);
      expect(await bcrypt.compare('wrongPassword', hash)).toBe(false);
    });
  });

  describe('Auth Middleware', () => {
    it('blocks unauthenticated requests when token is missing', () => {
      const req = { headers: {} };
      let statusCalled = null;
      let jsonCalled = null;

      const res = {
        status: (code) => {
          statusCalled = code;
          return {
            json: (payload) => {
              jsonCalled = payload;
            },
          };
        },
      };
      const next = () => {};

      authenticate(req, res, next);
      expect(statusCalled).toBe(HTTP_STATUS.UNAUTHORIZED);
      expect(jsonCalled.success).toBe(false);
      expect(jsonCalled.message).toContain('No token provided');
    });

    it('attaches decoded user claims to req when valid token provided', () => {
      const token = generateToken({
        userId: sampleUserId,
        role: USER_ROLES.USER,
        plan: USER_PLANS.PREMIUM,
      });

      const req = { headers: { authorization: `Bearer ${token}` } };
      const res = {};
      let nextCalled = false;
      const next = () => {
        nextCalled = true;
      };

      authenticate(req, res, next);
      expect(nextCalled).toBe(true);
      expect(req.user.userId).toBe(sampleUserId);
      expect(req.user.plan).toBe(USER_PLANS.PREMIUM);
    });

    it('optionalAuth sets req.user = null when no token provided', () => {
      const req = { headers: {} };
      const res = {};
      let nextCalled = false;
      const next = () => {
        nextCalled = true;
      };

      optionalAuth(req, res, next);
      expect(nextCalled).toBe(true);
      expect(req.user).toBeNull();
    });

    it('authorize blocks unauthorized roles with 403 Forbidden', () => {
      const req = { user: { role: USER_ROLES.USER } };
      let statusCalled = null;
      const res = {
        status: (code) => {
          statusCalled = code;
          return { json: () => {} };
        },
      };

      const adminOnly = authorize(USER_ROLES.ADMIN);
      adminOnly(req, res, () => {});

      expect(statusCalled).toBe(HTTP_STATUS.FORBIDDEN);
    });
  });

  describe('Auth API Integration', () => {
    it('GET /api/auth/me returns 401 when unauthenticated', async () => {
      const res = await request(app).get('/api/auth/me');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Authentication required');
    });
  });
});
