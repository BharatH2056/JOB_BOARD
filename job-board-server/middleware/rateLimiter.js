'use strict';

/**
 * middleware/rateLimiter.js
 * ─────────────────────────
 * Express rate-limiter middleware using express-rate-limit.
 * Restricts requests on AI-heavy endpoints:
 *   - POST /jobs
 *   - POST /jobs/search
 *   - POST /jobs/chat-search
 *
 * Limit: Max 20 requests per 15 minutes per user (or IP if unauthenticated).
 */

const rateLimit = require('express-rate-limit');

const aiEndpointLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,                  // limit each IP/user to 20 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  validate: { keyGeneratorIpFallback: false },
  keyGenerator: (req) => (req.user && req.user.id ? String(req.user.id) : req.ip),
  message: {
    success: false,
    message: 'Rate limit exceeded: Maximum 20 AI API requests per 15 minutes allowed.',
  },
});

module.exports = {
  aiEndpointLimiter,
};
