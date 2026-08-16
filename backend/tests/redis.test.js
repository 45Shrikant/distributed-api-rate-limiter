import { describe, it, expect } from 'vitest';
import { isRedisConnected, handleRedisFailure } from '../src/config/redis.js';
import { env } from '../src/config/env.js';

describe('Phase 3 Redis Configuration & Failure Strategy', () => {
  it('isRedisConnected returns boolean state', () => {
    const connected = isRedisConnected();
    expect(typeof connected).toBe('boolean');
  });

  describe('Failure Strategy Handling', () => {
    it('throws 500 error when RATE_LIMIT_FAIL_MODE is closed', () => {
      env.RATE_LIMIT_FAIL_MODE = 'closed';
      const fakeError = new Error('ECONNREFUSED 127.0.0.1:6379');

      expect(() => handleRedisFailure('testOp', fakeError)).toThrow(
        /Rate limit service temporarily unavailable/
      );
    });

    it('returns degraded allowed payload when RATE_LIMIT_FAIL_MODE is open', () => {
      env.RATE_LIMIT_FAIL_MODE = 'open';
      const fakeError = new Error('ECONNREFUSED 127.0.0.1:6379');

      const result = handleRedisFailure('testOp', fakeError);
      expect(result).toEqual({
        allowed: true,
        current: 0,
        limit: Infinity,
        remaining: Infinity,
        resetSeconds: 0,
        degraded: true,
      });

      // Restore default fail mode
      env.RATE_LIMIT_FAIL_MODE = 'closed';
    });
  });
});
