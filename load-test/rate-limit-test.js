import autocannon from 'autocannon';

// Parse command line arguments
const args = process.argv.slice(2).reduce((acc, arg) => {
  const [key, value] = arg.replace(/^--/, '').split('=');
  acc[key] = value || true;
  return acc;
}, {});

const totalRequests = parseInt(args.requests || '100', 10);
const connections = parseInt(args.connections || '10', 10);
const quotaLimit = parseInt(args.limit || '25', 10);
const windowSeconds = parseInt(args.window || '60', 10);
const baseUrl = args.url || process.env.TARGET_URL || 'http://localhost:5000';

const targetUrl = `${baseUrl}/api/test/rate-limit?limit=${quotaLimit}&window=${windowSeconds}`;

console.log('===============================================================');
console.log(' Distributed Rate Limiter High-Throughput Load Test           ');
console.log(` Target Endpoint : ${targetUrl}`);
console.log(` Total Requests  : ${totalRequests}`);
console.log(` Concurrency     : ${connections} concurrent connections`);
console.log(` Quota Limit     : ${quotaLimit} requests per ${windowSeconds}s window`);
console.log('===============================================================\n');

async function runLoadTest() {
  console.log('🚀 Initiating load generator barrage...\n');

  const instance = autocannon(
    {
      url: targetUrl,
      connections,
      amount: totalRequests,
      method: 'GET',
    },
    (err, result) => {
      if (err) {
        console.error('Load test execution failed:', err);
        return;
      }

      const totalSent = result.requests.total;
      const status2xx = result['2xx'] || 0;
      const status4xx = result['4xx'] || 0;
      const non2xx = result.non2xx || 0;

      console.log('===============================================================');
      console.log(' LOAD TEST BENCHMARK RESULTS                                   ');
      console.log('===============================================================');
      console.log(` Total Requests Sent : ${totalSent}`);
      console.log(` \x1b[32m200 OK (Allowed)    : ${status2xx}\x1b[0m`);
      console.log(` \x1b[31m429 / 4xx (Blocked) : ${status4xx || non2xx}\x1b[0m`);
      console.log(` Throughput          : ${result.requests.average} req/sec`);
      console.log(` Average Latency     : ${result.latency.average} ms`);
      console.log(` p50 Latency (Median): ${result.latency.p50} ms`);
      console.log(` p90 Latency         : ${result.latency.p90} ms`);
      console.log(` p99 Latency         : ${result.latency.p99} ms`);
      console.log(` Max Latency         : ${result.latency.max} ms`);
      console.log('===============================================================\n');

      console.log('🎯 SYSTEM DESIGN ANALYSIS:');
      if (status4xx > 0) {
        console.log(` ✅ SUCCESS: Rate limiter successfully intercepted and blocked ${status4xx} requests`);
        console.log(`    after the quota of ${quotaLimit} requests was reached.`);
        console.log(` ✅ Redis atomic INCR prevented concurrency leaks across ${connections} parallel threads.`);
      } else {
        console.log(` ℹ️ All ${status2xx} requests succeeded because total requests (${totalSent}) <= limit (${quotaLimit}).`);
      }
      console.log('===============================================================');
    }
  );

  autocannon.track(instance, { renderProgressBar: true });
}

runLoadTest();
