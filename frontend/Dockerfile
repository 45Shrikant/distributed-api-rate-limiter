# Multi-Stage Production Dockerfile for React SPA Frontend
FROM node:22-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy source code and build production assets
COPY . .
RUN npm run build

# Production Web Server (Nginx)
FROM nginx:alpine AS runner

# Copy built static assets from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy Nginx SPA reverse proxy configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
