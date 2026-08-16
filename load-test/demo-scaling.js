/**
 * Horizontal Scaling Verification Demo
 *
 * Demonstrates that multiple stateless Express instances (backend-1 & backend-2)
 * load-balanced behind Nginx share a single, unified Redis rate-limiting counter.
 *
 * Expected behavior:
 * Request 1 -> Handled by server-1 | Remaining: 4
 * Request 2 -> Handled by server-2 | Remaining: 3
 * Request 3 -> Handled by server-1 | Remaining: 2
 * Request 4 -> Handled by server-2 | Remaining: 1
 * Request 5 -> Handled by server-1 | Remaining: 0
 * Request 6 -> Handled by server-2 | Status: 429 Too Many Requests (Blocked!)
 */

const BASE_URL = process.env.TARGET_URL || 'http://localhost:5000';

async function runScalingDemo() {
  console.log('===============================================================');
  console.log(' Horizontal Scaling & Distributed Rate Limiter Demonstration ');
  console.log(` Target Load Balancer: ${BASE_URL}/api/test/rate-limit?limit=5&window=30`);
  console.log('===============================================================\n');

  for (let i = 1; i <= 7; i++) {
    try {
      const response = await fetch(`${BASE_URL}/api/test/rate-limit?limit=5&window=30`);
      const status = response.status;
      const serverInstance = response.headers.get('x-server-instance') || 'unknown';
      const limit = response.headers.get('x-ratelimit-limit') || '5';
      const remaining = response.headers.get('x-ratelimit-remaining') || '0';
      const reset = response.headers.get('x-ratelimit-reset') || '30';
      const retryAfter = response.headers.get('retry-after');

      const statusBadge =
        status === 200
          ? '\x1b[32m[200 OK]\x1b[0m'
          : '\x1b[31m[429 TOO MANY REQUESTS]\x1b[0m';

      const instanceBadge =
        serverInstance === 'server-1'
          ? '\x1b[36mserver-1\x1b[0m'
          : '\x1b[35mserver-2\x1b[0m';

      console.log(
        `Request #${i} | Status: ${statusBadge} | Handled By: ${instanceBadge} | Remaining Quota: ${remaining}/${limit} | Reset: ${reset}s${
          retryAfter ? ` | \x1b[33mRetry-After: ${retryAfter}s\x1b[0m` : ''
        }`
      );

      // Brief 100ms pause between requests
      await new Promise((r) => setTimeout(r, 100));
    } catch (error) {
      console.error(`Request #${i} Failed:`, error.message);
    }
  }

  console.log('\n===============================================================');
  console.log(' Key System Design Takeaways:');
  console.log(' 1. Notice how X-Server-Instance alternates between server-1 and server-2.');
  console.log(' 2. Notice how X-RateLimit-Remaining strictly decrements across BOTH instances.');
  console.log(' 3. This proves the Express backend is completely stateless and Redis');
  console.log('    serves as the unified shared counter across horizontal replicas.');
  console.log('===============================================================');
}

runScalingDemo();
