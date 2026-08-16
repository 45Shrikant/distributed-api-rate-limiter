# Production Cloud Deployment Guide

This guide walks you through deploying the **Distributed API Rate Limiter & Analytics Dashboard** to production cloud platforms.

---

## 🎯 Architecture Topology for Cloud Deployment

Because this project requires a real-time **Redis** store and a **MongoDB** database, the recommended cloud architecture is:

```
[ Frontend (React SPA) ] ──► Vercel (Fast Global Edge CDN)
                                    │
                                    ▼
[ Backend (Express API) ] ──► Vercel Serverless OR Render / Railway
                                    │
                  ┌─────────────────┴─────────────────┐
                  ▼                                   ▼
    [ Upstash Redis Cloud ]                 [ MongoDB Atlas ]
   (Free Serverless Redis)                 (Free Cloud Database)
```

---

## 📦 Step 1: Set Up Free Cloud Databases

### 1. Cloud Redis (Upstash Redis)
1. Go to [Upstash.com](https://upstash.com/) and create a free account.
2. Click **Create Database** -> Select **Redis** -> Choose your closest region.
3. In the database details, copy the **Redis Connection String (Node.js)**:
   ```
   rediss://default:your_password@your_endpoint.upstash.io:6379
   ```

### 2. Cloud MongoDB (MongoDB Atlas)
1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) and create a free **M0 Shared Cluster**.
2. Under **Network Access**, add IP `0.0.0.0/0` (Allow access from anywhere).
3. Under **Database Access**, create a user (e.g. `admin` / `strong_password`).
4. Click **Connect** -> **Drivers (Node.js)** -> Copy the connection string:
   ```
   mongodb+srv://admin:strong_password@cluster0.mongodb.net/rate_limiter?retryWrites=true&w=majority
   ```

---

## 🚀 Option A: Full-Stack Deployment to Vercel (Monorepo)

The repository already includes a pre-configured [`vercel.json`](../vercel.json) and [`backend/api/index.js`](../backend/api/index.js).

### Step-by-Step Vercel Deployment:
1. **Push your repository to GitHub**:
   ```bash
   git init
   git add .
   git commit -m "feat: prepare for cloud deployment"
   git remote add origin https://github.com/your-username/distributed-rate-limiter.git
   git push -u origin main
   ```
2. **Import into Vercel**:
   - Go to [Vercel Dashboard](https://vercel.com/new).
   - Select your GitHub repository.
3. **Configure Environment Variables in Vercel**:
   Add the following variables in the Vercel project settings:
   - `MONGO_URI` = `mongodb+srv://admin:password@cluster0.mongodb.net/rate_limiter?retryWrites=true&w=majority`
   - `REDIS_URL` = `rediss://default:password@your_endpoint.upstash.io:6379`
   - `JWT_SECRET` = `super_secret_production_jwt_key_998877`
   - `JWT_EXPIRES_IN` = `7d`
   - `RATE_LIMIT_FAIL_MODE` = `closed`
   - `SERVER_INSTANCE_ID` = `vercel-serverless-1`
4. Click **Deploy**!

Vercel will build the React SPA and deploy the Express API as a serverless edge handler.

---

## 🚀 Option B: Frontend on Vercel + Backend on Render (Recommended for Long-Running Servers)

If you prefer a persistent, long-running Node.js backend container:

### 1. Deploy Backend to Render / Railway:
1. Go to [Render.com](https://render.com/) -> **New Web Service**.
2. Connect your GitHub repository.
3. Settings:
   - **Root Directory**: `backend`
   - **Build Command**: `npm install`
   - **Start Command**: `node src/server.js`
4. Add Environment Variables:
   - `MONGO_URI`, `REDIS_URL`, `JWT_SECRET`, `RATE_LIMIT_FAIL_MODE`.
5. Copy your backend URL: e.g. `https://rate-limiter-backend.onrender.com`.

### 2. Deploy Frontend to Vercel:
1. In Vercel, click **Add New Project** -> Select Repository.
2. Settings:
   - **Root Directory**: `frontend`
   - **Framework Preset**: `Vite`
3. Environment Variables:
   - `VITE_API_URL` = `https://rate-limiter-backend.onrender.com`
4. Click **Deploy**!

---

## ✅ Post-Deployment Verification Checklist

1. **Health Check**:
   Visit `https://your-app.vercel.app/api/health` -> should return `status: healthy` with MongoDB and Redis connected.
2. **Dashboard UI**:
   Visit `https://your-app.vercel.app/` -> Verify KPI metric cards, time-series charts, and rate-limit progress gauges load.
3. **Rate Limiting Burst Test**:
   Visit `https://your-app.vercel.app/tester` -> Click **"⚡ Send Burst (10x)"** to observe real-time rate limit headers and HTTP 429 throttling!
