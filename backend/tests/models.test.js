import { describe, it, expect } from 'vitest';
import User from '../src/models/User.js';
import ApiRequest from '../src/models/ApiRequest.js';
import RateLimitConfig from '../src/models/RateLimitConfig.js';
import { USER_ROLES, USER_PLANS } from '../src/utils/constants.js';

describe('Phase 2 Models Validation', () => {
  describe('User Model', () => {
    it('validates a correct user document', () => {
      const user = new User({
        name: 'Jane Doe',
        email: 'jane@example.com',
        passwordHash: 'hashed_password_123',
        role: USER_ROLES.USER,
        plan: USER_PLANS.FREE,
      });

      const validationError = user.validateSync();
      expect(validationError).toBeUndefined();
    });

    it('requires name, email, and passwordHash', () => {
      const user = new User({});
      const error = user.validateSync();

      expect(error.errors.name).toBeDefined();
      expect(error.errors.email).toBeDefined();
      expect(error.errors.passwordHash).toBeDefined();
    });

    it('rejects invalid email formats', () => {
      const user = new User({
        name: 'Jane',
        email: 'invalid-email',
        passwordHash: 'hashed',
      });
      const error = user.validateSync();
      expect(error.errors.email).toBeDefined();
    });

    it('removes passwordHash when serialized to JSON', () => {
      const user = new User({
        name: 'Jane Doe',
        email: 'jane@example.com',
        passwordHash: 'secret_hash',
      });

      const json = user.toJSON();
      expect(json.passwordHash).toBeUndefined();
      expect(json.name).toBe('Jane Doe');
      expect(json.email).toBe('jane@example.com');
    });
  });

  describe('ApiRequest Model', () => {
    it('validates required logging fields', () => {
      const log = new ApiRequest({
        ip: '127.0.0.1',
        method: 'GET',
        endpoint: '/api/products',
        statusCode: 200,
        responseTime: 12.5,
        rateLimited: false,
      });

      const error = log.validateSync();
      expect(error).toBeUndefined();
    });

    it('enforces HTTP method validation', () => {
      const log = new ApiRequest({
        ip: '127.0.0.1',
        method: 'INVALID_VERB',
        endpoint: '/api/products',
        statusCode: 200,
        responseTime: 10,
      });

      const error = log.validateSync();
      expect(error.errors.method).toBeDefined();
    });
  });

  describe('RateLimitConfig Model', () => {
    it('validates a plan rate limit configuration', () => {
      const config = new RateLimitConfig({
        type: 'plan',
        key: 'free',
        limit: 100,
        windowSeconds: 60,
      });

      const error = config.validateSync();
      expect(error).toBeUndefined();
    });

    it('rejects negative or zero limits', () => {
      const config = new RateLimitConfig({
        type: 'plan',
        key: 'free',
        limit: 0,
      });

      const error = config.validateSync();
      expect(error.errors.limit).toBeDefined();
    });
  });
});
