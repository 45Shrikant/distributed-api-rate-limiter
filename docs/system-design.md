# Distributed API Rate Limiter & API Analytics Dashboard
## Comprehensive System Design & Architecture Specification

---

## 1. System Architecture Overview

```
                          [ Client Applications / Frontend SPA ]
                                             │
                                             ▼
                             ┌───────────────────────────────┐
                             │    Nginx Load Balancer (L7)   │
                             │  (Round-Robin Reverse Proxy)  │
                             └───────────────┬───────────────┘
                                             │
                      ┌──────────────────────┴──────────────────────┐
                      ▼                                             ▼
        ┌───────────────────────────┐                 ┌───────────────────────────┐
        │     Express Backend 1     │                 │     Express Backend 2     │
        │ [SERVER_INSTANCE: server-1]│                 │ [SERVER_INSTANCE: server-2]│
        │                           │                 │                           │
        │  1. Auth Middleware (JWT) │                 │  1. Auth Middleware (JWT) │
        │  2. RateLimiter (Atomic)  │                 │  2. RateLimiter (Atomic)  │
        │  3. Async Non-blocking Log│                 │  3. Async Non-blocking Log│
        └──────────────┬────────────┘                 └─────────────┬─────────────┘
                       │                                            │
                       └──────────────────────┬─────────────────────┘
                                              │
                    ┌─────────────────────────┴─────────────────────────┐
                    ▼                                                   ▼
     ┌──────────────────────────────┐                   ┌──────────────────────────────┐
     │    Redis In-Memory Store     │                   │     MongoDB Database         │
     │   (Shared Atomic State)      │                   │   (Persistent Analytics)     │
     │                              │                   │                              │
     │ • Atomic Counter (INCR)      │                   │ • Users & Credentials        │
     │ • Sliding Log (Sorted Sets)  │                   │ • Dynamic Limit Overrides    │
     │ • Refill Token Bucket        │                   │ • Request Audit Stream       │
     │ • Dynamic Config Cache-Aside │                   │ • Aggregation Pipelines      │
     └──────────────────────────────┘                   └──────────────────────────────┘
```

---

## 2. Core Architectural Decisions

### 2.1 Why Redis is Used for Rate Limiting
1. **In-Memory Sub-Millisecond Latency**: Evaluating rate-limit capacity occurs on *every single incoming HTTP request* before business logic execution. Redis delivers microsecond read/write operations in memory.
2. **Stateless Backend Scaling**: If rate-limit state were kept in Node.js process memory (e.g. `Map` or `Set`), adding a second backend server behind a load balancer would immediately double a client's quota. Redis provides a centralized, high-throughput source of truth across all horizontally distributed nodes.
3. **Native Time-to-Live (TTL)**: Redis keys can automatically expire (`EXPIRE` / `PEXPIRE`), eliminating the need for background cron jobs to garbage-collect expired rate-limit windows.

### 2.2 Why `INCR` is Used & Race Condition Prevention
* **The Read-Modify-Write Vulnerability**: In a naive implementation, an application reads `count = GET key`, computes `newCount = count + 1`, and writes `SET key newCount`. Under high concurrency, two requests reading simultaneously at `count = 4` will both write `5`, allowing 6 requests through when the limit was 5.
* **Atomic Redis Execution**: Redis executes commands in a single-threaded event loop. The `INCR key` primitive increments the integer value and returns the new integer atomically in a single instruction.

```javascript
// Fixed Window Atomic Pipeline
const current = await redis.incr(key);
if (current === 1) {
  await redis.expire(key, windowSeconds); // Set TTL on the first request of the window
}
const ttl = await redis.ttl(key);
const allowed = current <= limit;
```

### 2.3 Why MongoDB is NOT Used for Real-Time Rate-Limit Counters
| Metric / Characteristic | Redis In-Memory Store | MongoDB Document Database |
| :--- | :--- | :--- |
| **Operation Latency** | ~0.2 ms - 0.8 ms | ~5 ms - 25 ms |
| **Locking Mechanism** | Single-threaded atomic memory updates | Multi-version concurrency control (WiredTiger MVCC) |
| **Throughput Capacity** | 100,000+ operations/sec per core | Hundreds to thousands of disk writes/sec |
| **TTL Eviction** | Native, active & passive sub-second eviction | Background TTL index thread (runs every 60s) |
| **System Role** | **Real-time hot state counter** | **Cold storage & historical analytics** |

Using MongoDB for real-time request counters would create severe disk I/O bottlenecks and database lock contention under high traffic bursts. MongoDB is used exclusively for historical audit logging and aggregation queries.

---

## 3. Rate Limiting Algorithm Strategies

```
1. Fixed Window Counter
   Window 1 [00:00 - 01:00] (Max 100)  │  Window 2 [01:00 - 02:00] (Max 100)
   ┌───────────────────────────────────┼───────────────────────────────────┐
   │                    50 req [00:59] │ 50 req [01:01]                    │
   └───────────────────────────────────┴───────────────────────────────────┘
   ⚠️ Edge Case: 100 requests in 2 seconds at the boundary!

2. Sliding Window Log (Sorted Set)
   Current Timestamp: T
   Window evaluated: [T - 60s  ─────────────►  T]
   ┌─────────x─────────x─────────x─────────x─────────x─────────┐
   │ (Old elements removed via ZREMRANGEBYSCORE)               │
   └───────────────────────────────────────────────────────────┘
   ✅ Smooth sliding boundary, zero boundary burst漏洞.

3. Token Bucket
   Tokens Refilled Continuously (Rate: r tokens/sec) ────► [ 🪙 🪙 🪙 🪙 🪙 ] (Capacity: B)
   Incoming Request Consumes 1 Token ◄───────────────────┘
   ✅ Supports controlled short-lived traffic bursts without breaking sustained limits.
```

---

## 4. Failure Handling Strategy (`RATE_LIMIT_FAIL_MODE`)

When Redis encounters an outage, network partition, or failover, the application dynamically enforces one of two configurable strategies:

```javascript
export const handleRedisFailure = (error, operationName) => {
  console.error(`[Redis Failure Strategy] Operation "${operationName}" failed:`, error.message);

  if (env.RATE_LIMIT_FAIL_MODE === 'closed') {
    // Fail-Closed: Return HTTP 500 error to shield downstream infrastructure
    throw createError(
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      'Rate limiting service temporarily unavailable'
    );
  }

  // Fail-Open: Permit traffic through with degraded fallback telemetry
  return {
    allowed: true,
    current: 0,
    limit: Infinity,
    remaining: 1,
    resetSeconds: 0,
    retryAfter: 0,
    algorithm: 'fail_open_degraded',
  };
};
```

* **Fail-Closed (`closed`)**: Critical payment gateways or downstream systems that will collapse under traffic spikes choose fail-closed to guarantee backend safety.
* **Fail-Open (`open`)**: High-availability consumer services choose fail-open to prioritize user experience and uptime during transient cache maintenance.

---

## 5. Distributed Cache-Aside & Dynamic Invalidation

When administrators modify rate-limit rules via the Admin Dashboard:
1. The new rule is persisted in MongoDB (`RateLimitConfig`).
2. The application immediately invokes `invalidateRateLimitCache(key)` to evict `config:ratelimit:<key>` from Redis.
3. On the very next request across **any** backend node, the cache miss triggers a read from MongoDB and repopulates Redis with the new quota.

---

## 6. System Design Interview Q&A Guide

### Q1: How do you handle distributed race conditions in rate limiting?
**Answer**: By using atomic primitives in Redis. For Fixed Window, we use `INCR` which executes in a single atomic memory instruction. For Sliding Window and Token Bucket, we execute operations using Redis Transactions (`MULTI/EXEC`) or Redis Lua scripts (`EVALSHA`), guaranteeing that no interleaved operations can read intermediate state.

### Q2: How do you rate limit by IP address vs. Authenticated User ID?
**Answer**: We extract the subject identifier hierarchically:
- If a valid JWT Bearer token exists, we extract `req.user.id` and construct `rate_limit:user:<userId>:<endpoint>`. This prevents users from bypassing quotas by rotating IP addresses.
- If unauthenticated, we resolve the client's public IP from `X-Forwarded-For` (behind proxies) or `req.socket.remoteAddress` and construct `rate_limit:ip:<clientIp>:<endpoint>`.

### Q3: What happens when Redis crashes?
**Answer**: We configure a circuit-breaker / fallback strategy via `RATE_LIMIT_FAIL_MODE`. In `fail-open` mode, the error is logged and requests are allowed through to prioritize service availability. In `fail-closed` mode, the middleware returns HTTP 500 to protect downstream databases from cascading collapse.

### Q4: Fixed Window vs. Sliding Window vs. Token Bucket trade-offs?
**Answer**:
- **Fixed Window**: Minimal memory ($O(1)$ integer key) and fastest execution (`INCR`), but vulnerable to $2\times$ boundary bursts.
- **Sliding Window Log**: Eliminates boundary bursts by tracking exact millisecond timestamps in a Redis Sorted Set (`ZADD`), but consumes higher memory ($O(N)$ elements per window).
- **Token Bucket**: Stores only timestamp and token balance ($O(1)$ Hash), supports graceful traffic bursts up to bucket capacity while enforcing smooth steady-state refill rates.

### Q5: How would you scale this architecture to millions of requests per second?
**Answer**:
1. **Redis Cluster with Sharding**: Hash rate-limit keys across multiple Redis shards (`{user:123}:ratelimit` hash tags).
2. **Local In-Memory Micro-Batches**: Implement local process token caching (e.g. consume 10 tokens locally before syncing with Redis) to reduce Redis IOPS by $10\times$.
3. **Distributed Message Queue for Logging**: Instead of direct MongoDB writes on `res.finish`, publish request log events to Apache Kafka or RabbitMQ, with background consumer workers batch-inserting into MongoDB/ClickHouse.
