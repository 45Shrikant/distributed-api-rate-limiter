# Distributed API Rate Limiter & API Analytics Dashboard

A production-style, interview-ready System Design project demonstrating **distributed rate limiting**, **atomic Redis operations**, **stateless horizontal scaling**, **cache-aside governance**, and **real-time API analytics** built with Node.js (ES Modules), Express, React 18, Redis 7, MongoDB 7, Docker, and Nginx.

---

## 🏗️ High-Level System Architecture

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
        │  • JWT Authentication     │                 │  • JWT Authentication     │
        │  • Atomic Rate Limiting   │                 │  • Atomic Rate Limiting   │
        │  • Non-blocking Logging   │                 │  • Non-blocking Logging   │
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
     │ • Atomic Counters (INCR/TTL) │                   │ • User Identities & Roles    │
     │ • Sliding Log (Sorted Sets)  │                   │ • Dynamic Limit Overrides    │
     │ • Refill Token Bucket        │                   │ • Request Audit Trails       │
     │ • Dynamic Config Cache       │                   │ • Aggregation Pipelines      │
     └──────────────────────────────┘                   └──────────────────────────────┘
```

---

## ✨ Key Features

- **⚡ Multiple Rate Limiting Algorithms**:
  - `Fixed Window Counter` (Atomic `INCR` + `EXPIRE` + `TTL`)
  - `Sliding Window Log` (Redis Sorted Sets with millisecond timestamps)
  - `Token Bucket` (Redis Hashes with continuous token refill rates)
- **🌐 Horizontal Scaling Demonstration**:
  - Demonstrates stateless Express instances behind Nginx where `X-Server-Instance` alternates between `server-1` and `server-2` while decrementing a **single shared Redis counter**.
- **🛡️ Multi-Tenant & Tier-Based Quotas**:
  - IP-based rate limiting for anonymous traffic (`rate_limit:ip:<ip>:<endpoint>`).
  - User-based rate limiting for authenticated clients (`rate_limit:user:<userId>:<endpoint>`).
  - Tiered plan allowances: `Free` (100 req/min), `Premium` (1,000 req/min), `Admin` (5,000 req/min).
- **📋 Standard IETF Rate Limit Headers**:
  - `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`, `X-Server-Instance`, `Retry-After`.
  - Structured HTTP `429 Too Many Requests` responses.
- **🔄 Dynamic Configuration & Cache-Aside Invalidation**:
  - Administrators can change rate-limit rules at runtime in MongoDB; Redis caches are automatically invalidated so changes take effect across all cluster nodes without server restarts.
- **📊 Real-Time Analytics & Aggregation Pipelines**:
  - Non-blocking asynchronous MongoDB request logging on `res.finish`.
  - Aggregation pipelines (`$match`, `$group`, `$sort`, `$project`) for traffic volume, hourly time-series, endpoint breakdown, and status code distributions.
- **🖥️ Modern React Dashboard & Interactive API Playground**:
  - Recharts traffic graphs, live quota meters, request logs, and interactive "Send Burst (10x)" test buttons.
- **🛡️ Resilient Redis Failure Strategy**:
  - Configurable `RATE_LIMIT_FAIL_MODE=closed` (strict security) or `open` (high availability fallback).

---

## 🚀 Quick Start Guide

### Prerequisites
- [Node.js](https://nodejs.org/) (v18+)
- [Docker & Docker Compose](https://www.docker.com/)

---

### Option 1: Run with Docker Compose (Recommended)

To start the complete multi-container production stack (MongoDB, Redis, Express Backend, and React Frontend):

```bash
docker compose up --build
```

- **Frontend Dashboard & API Tester**: [http://localhost:3000](http://localhost:3000)
- **Backend Express API**: [http://localhost:5000](http://localhost:5000)
- **Health Check**: [http://localhost:5000/api/health](http://localhost:5000/api/health)

---

### Option 2: Horizontal Scaling Demonstration

To run 2 load-balanced backend instances (`backend-1` and `backend-2`) behind Nginx:

```bash
# 1. Start scaled cluster
docker compose -f docker-compose.scale.yml up --build

# 2. In a separate terminal, run the automated scaling demo script
node load-test/demo-scaling.js
```

**Expected Scaling Output:**
```text
Request #1 | Status: [200 OK] | Handled By: server-1 | Remaining Quota: 4/5 | Reset: 30s
Request #2 | Status: [200 OK] | Handled By: server-2 | Remaining Quota: 3/5 | Reset: 30s
Request #3 | Status: [200 OK] | Handled By: server-1 | Remaining Quota: 2/5 | Reset: 29s
Request #4 | Status: [200 OK] | Handled By: server-2 | Remaining Quota: 1/5 | Reset: 29s
Request #5 | Status: [200 OK] | Handled By: server-1 | Remaining Quota: 0/5 | Reset: 29s
Request #6 | Status: [429 TOO MANY REQUESTS] | Handled By: server-2 | Remaining Quota: 0/5 | Reset: 28s | Retry-After: 28s
```

---

### Option 3: Local Development (Without Docker)

#### 1. Start Local Redis & MongoDB:
Make sure local Redis (`localhost:6379`) and MongoDB (`localhost:27017`) instances are running.

#### 2. Start Backend:
```bash
cd backend
npm install
npm run dev
```

#### 3. Start Frontend:
```bash
cd frontend
npm install
npm run dev
```

---

## 🧪 Automated Testing

### Backend Unit & Integration Tests (Vitest)
```bash
cd backend
npm test
```
*Executes 50 automated tests across 11 test suites covering JWT auth, atomic Redis operations, rate-limit headers, 429 errors, multi-user isolation, and MongoDB aggregations.*

---

## ⚡ High-Throughput Load Testing (Autocannon)

Run concurrent load testing benchmarks against the rate limiter:

```bash
cd load-test
npm install

# 100 Requests Benchmark
npm run test:100

# 500 Requests Benchmark
npm run test:500

# 1,000 Requests High-Concurrency Benchmark
npm run test:1000
```

---

## 📡 API Reference

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/health` | Public | Node.js health status & `X-Server-Instance` |
| `POST` | `/api/auth/register` | Public | Register user (`free` / `premium` plan) |
| `POST` | `/api/auth/login` | Public | Authenticate user & issue JWT token |
| `GET` | `/api/auth/me` | Authenticated | Retrieve current session profile |
| `GET` | `/api/products` | Public / Plan | Get product catalog (plan-based rate limit) |
| `GET` | `/api/products/:id` | Public / Plan | Get single product |
| `GET` | `/api/user/profile` | Authenticated | Get user account info |
| `GET` | `/api/user/rate-limit` | Authenticated | Get current rate limit quota & remaining |
| `GET` | `/api/user/requests` | Authenticated | Get user's recent request audit logs |
| `GET` | `/api/admin/users` | Admin Only | Get paginated list of users |
| `PATCH`| `/api/admin/users/:id/plan` | Admin Only | Change user plan (`free` <-> `premium`) |
| `GET` | `/api/admin/rate-limits` | Admin Only | Get default & dynamic rate-limit rules |
| `PUT` | `/api/admin/rate-limits/:id` | Admin Only | Upsert dynamic rate-limit rule & evict cache |
| `DELETE`| `/api/admin/rate-limits/:id` | Admin Only | Delete dynamic rate-limit rule |
| `GET` | `/api/admin/analytics` | Admin Only | Get cluster overview metrics |
| `GET` | `/api/analytics/overview` | Public | Get total requests, block rate, avg latency |
| `GET` | `/api/analytics/hourly` | Public | Get 24-hour time-series traffic buckets |
| `GET` | `/api/analytics/endpoints` | Public | Get per-endpoint request volume |
| `GET` | `/api/analytics/status-codes`| Public | Get HTTP status code distribution |
| `GET` | `/api/test/rate-limit` | Public | Configurable test endpoint (`?limit=5&window=30`) |

---

## ⚙️ Environment Variables

| Variable | Default | Description |
| :--- | :--- | :--- |
| `PORT` | `5000` | HTTP port for the Express backend |
| `NODE_ENV` | `development` | Environment runtime mode |
| `SERVER_INSTANCE_ID` | `server-1` | Instance identifier emitted in `X-Server-Instance` |
| `MONGO_URI` | `mongodb://127.0.0.1:27017/rate_limiter` | MongoDB connection URI |
| `REDIS_URL` | `redis://127.0.0.1:6379` | Redis connection URL |
| `JWT_SECRET` | `super_secret_jwt_key_system_design_12345` | JWT signing secret |
| `JWT_EXPIRES_IN` | `7d` | JWT expiration duration |
| `RATE_LIMIT_FAIL_MODE`| `closed` | `closed` (strict 500 on Redis down) or `open` (permit traffic) |

---

---

## ☁️ Cloud Deployment (Vercel, Render, Railway, Upstash)

This project is pre-configured for one-click deployment across free modern cloud services:
- **Frontend SPA**: Deploy directly on **Vercel** (`frontend/vercel.json` included).
- **Backend API**: Deploy as **Vercel Serverless Function** (`backend/api/index.js` + `vercel.json`) or as a container on **Render / Railway / Fly.io**.
- **Distributed Redis**: Connect to **[Upstash Redis](https://upstash.com/)** (Free Serverless Redis).
- **MongoDB Database**: Connect to **[MongoDB Atlas](https://www.mongodb.com/cloud/atlas)** (Free M0 Shared Tier).

For the complete step-by-step tutorial, check the **[Cloud Deployment Guide](docs/deployment-guide.md)**.

---

## 📖 Deep Dive System Design Documentation

For a comprehensive architectural breakdown, including race-condition analysis, algorithm trade-offs, and system design interview questions, read [`docs/system-design.md`](docs/system-design.md).

