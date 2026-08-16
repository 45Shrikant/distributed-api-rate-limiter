import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { HTTP_STATUS } from '../utils/constants.js';

// Verifies Bearer JWT and extracts client claims (userId, role, plan).
// In stateless backend clusters, verifying cryptographically signed JWTs
// avoids expensive database lookups on every single incoming HTTP request.
export const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(HTTP_STATUS.UNAUTHORIZED).json({
      success: false,
      message: 'Authentication required. No token provided.',
    });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET);
    req.user = decoded; // Contains { userId, role, plan, iat, exp }
    next();
  } catch (error) {
    return res.status(HTTP_STATUS.UNAUTHORIZED).json({
      success: false,
      message: 'Invalid or expired authentication token.',
    });
  }
};

// Optional authentication middleware:
// If a valid JWT is present, decodes user context (for plan-based rate limiting).
// If no token is provided, allows request through as unauthenticated (for IP-based rate limiting).
export const optionalAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, env.JWT_SECRET);
      req.user = decoded;
    } catch {
      // If token is malformed or expired in optional auth, treat as unauthenticated guest
      req.user = null;
    }
  } else {
    req.user = null;
  }

  next();
};

// Role-based authorization middleware
export const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        message: 'Authentication required.',
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(HTTP_STATUS.FORBIDDEN).json({
        success: false,
        message: `Forbidden: Access restricted to [${allowedRoles.join(', ')}] roles.`,
      });
    }

    next();
  };
};
