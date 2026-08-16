# Multi-Stage Production Dockerfile for Node.js Express Backend
FROM node:22-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy application source code
COPY . .

# Production Image
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Install only production dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy source code
COPY --from=builder /app/src ./src

EXPOSE 5000

CMD ["node", "src/server.js"]
