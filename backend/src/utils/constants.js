// Standard HTTP Status codes used across controllers and middleware for consistent API responses
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
};

// User Roles & Access Tiers
export const USER_ROLES = {
  USER: 'user',
  ADMIN: 'admin',
};

// Subscription Plans that dictate default API rate limits
export const USER_PLANS = {
  FREE: 'free',
  PREMIUM: 'premium',
};

// Default rate-limit thresholds (requests per minute) based on plan
export const PLAN_RATE_LIMITS = {
  [USER_PLANS.FREE]: { limit: 100, windowSeconds: 60 },
  [USER_PLANS.PREMIUM]: { limit: 1000, windowSeconds: 60 },
  [USER_ROLES.ADMIN]: { limit: 5000, windowSeconds: 60 },
};

// Specialized endpoint-specific limits (e.g., auth endpoints require stricter limits to prevent brute-force attacks)
export const ENDPOINT_RATE_LIMITS = {
  AUTH_LOGIN: { limit: 5, windowSeconds: 60 },
  AUTH_REGISTER: { limit: 3, windowSeconds: 60 },
  ANALYTICS: { limit: 60, windowSeconds: 60 },
};
