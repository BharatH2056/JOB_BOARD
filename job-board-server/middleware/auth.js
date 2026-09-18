'use strict';

/**
 * middleware/auth.js
 * ──────────────────
 * authenticate         – verifies the Bearer JWT and attaches req.user = { id, role }
 * optionalAuthenticate – attaches req.user if a valid Bearer token is provided, without blocking if missing
 * requireRole          – factory that restricts a route to specific roles
 */

const jwt  = require('jsonwebtoken');
const User = require('../models/User');

// ─── authenticate ─────────────────────────────────────────────────────────

/**
 * Validates the Authorization: Bearer <token> header.
 * Checks if user is banned (returns 403).
 * On success, sets req.user = { id, role } and calls next().
 * On failure, responds with 401.
 */
const authenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization || '';

  if (!authHeader.startsWith('Bearer ')) {
    return res
      .status(401)
      .json({ success: false, message: 'No token provided' });
  }

  const token = authHeader.slice(7); // strip "Bearer "

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).lean();

    if (!user) {
      return res.status(401).json({ success: false, message: 'User account not found' });
    }

    if (user.isBanned) {
      return res.status(403).json({ success: false, message: 'User account is banned' });
    }

    req.user = { id: user._id.toString(), role: user.role };
    return next();
  } catch (err) {
    const message =
      err.name === 'TokenExpiredError' ? 'Token has expired' : 'Invalid token';
    return res.status(401).json({ success: false, message });
  }
};

// ─── optionalAuthenticate ──────────────────────────────────────────────────

/**
 * Attaches req.user if a valid Bearer token is provided and user is active.
 * Does NOT fail or return 401 if missing or invalid.
 */
const optionalAuthenticate = async (req, _res, next) => {
  const authHeader = req.headers.authorization || '';

  if (authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).lean();
      if (user && !user.isBanned) {
        req.user = { id: user._id.toString(), role: user.role };
      }
    } catch {
      // Ignore invalid/expired token for optional auth
    }
  }

  return next();
};

// ─── requireRole ──────────────────────────────────────────────────────────

/**
 * Role-check middleware factory.
 * Always used AFTER authenticate (depends on req.user being set).
 *
 * @param  {...string} roles  – one or more allowed roles
 * @returns Express middleware
 */
const requireRole = (...roles) => (req, res, next) => {
  if (!req.user) {
    return res
      .status(401)
      .json({ success: false, message: 'Not authenticated' });
  }

  if (!roles.includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: `Access denied. Required role: ${roles.join(' or ')}`,
    });
  }

  return next();
};

module.exports = { authenticate, optionalAuthenticate, requireRole };
