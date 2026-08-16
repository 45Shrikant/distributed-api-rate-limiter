// Generates standardized Redis cache keys for rate limiting.
//
// System Design Key Strategy:
// 1. Authenticated Requests: 'rate_limit:user:<userId>'
//    - Tracks quota globally across all devices a logged-in user uses.
// 2. Unauthenticated Requests: 'rate_limit:ip:<ipAddress>'
//    - Fallback protection against anonymous scraping and brute force.
// 3. Endpoint-Specific Override: 'rate_limit:<user|ip>:<id>:<endpoint>'
//    - Isolates sensitive actions (e.g. login brute force) from general browsing limits.
export const getClientIdentifier = (req, options = {}) => {
  const { endpointSpecific = false } = options;

  // Extract client IP, resolving behind reverse proxies (Nginx / Cloudflare / Docker)
  let ip =
    req.headers?.['x-forwarded-for']?.split(',')[0].trim() ||
    req.socket?.remoteAddress ||
    req.ip ||
    '127.0.0.1';

  // Normalize IPv6 localhost to IPv4
  if (ip === '::1' || ip === '::ffff:127.0.0.1') {
    ip = '127.0.0.1';
  }

  // Determine subject identifier: authenticated userId takes precedence over IP
  const subjectType = req.user?.userId ? 'user' : 'ip';
  const subjectId = req.user?.userId ? req.user.userId : ip;

  let key = `rate_limit:${subjectType}:${subjectId}`;

  // If endpoint isolation is enabled, append sanitized endpoint path
  if (endpointSpecific) {
    const rawPath = req.baseUrl ? `${req.baseUrl}${req.path}` : req.path;
    const cleanPath = (rawPath || req.originalUrl || '/').split('?')[0].replace(/\/+$/, '') || '/';
    key += `:${cleanPath}`;
  }

  return {
    key,
    subjectType,
    subjectId,
  };
};
