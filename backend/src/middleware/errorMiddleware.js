import { HTTP_STATUS } from '../utils/constants.js';
import { env } from '../config/env.js';

// Catches unhandled routes and returns a predictable 404 response
export const notFoundHandler = (req, res, next) => {
  res.status(HTTP_STATUS.NOT_FOUND).json({
    success: false,
    message: `Cannot ${req.method} ${req.originalUrl} - Route not found`,
  });
};

// Global error handler prevents raw stack traces from leaking to clients
// while maintaining standard { success: false, message: ... } response format.
export const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || (res.statusCode >= 400 ? res.statusCode : HTTP_STATUS.INTERNAL_SERVER_ERROR);
  const message = err.message || 'Internal Server Error';

  console.error(`[Error] ${req.method} ${req.originalUrl}:`, err);

  res.status(statusCode).json({
    success: false,
    message,
    ...(env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};
