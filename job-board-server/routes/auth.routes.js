'use strict';

/**
 * routes/auth.routes.js
 * ─────────────────────
 * POST /api/auth/register       – create account, issue JWT
 * POST /api/auth/login          – verify credentials, issue JWT
 * POST /api/auth/verify-email   – validate token, mark emailVerified
 *
 * All heavy lifting is delegated to services/auth.service.js.
 */

const { Router } = require('express');
const authService = require('../services/auth.service');

const router = Router();

// ─── Helpers ──────────────────────────────────────────────────────────────

/** Wrap async route handlers so errors propagate to the global error handler. */
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

// ─── POST /api/auth/register ──────────────────────────────────────────────
/**
 * Body: { name, email, password, role }
 *
 * Seekers   → emailVerified = true  automatically
 * Employers → emailVerified = false, verification link logged to console
 */
router.post(
  '/register',
  asyncHandler(async (req, res) => {
    const { name, email, password, role } = req.body;

    // Basic input validation
    if (!name || !email || !password || !role) {
      return res
        .status(400)
        .json({ success: false, message: 'name, email, password, and role are required' });
    }

    if (password.length < 8) {
      return res
        .status(400)
        .json({ success: false, message: 'Password must be at least 8 characters' });
    }

    if (!['employer', 'seeker'].includes(role)) {
      return res
        .status(400)
        .json({ success: false, message: 'role must be "employer" or "seeker"' });
    }

    const { user, token } = await authService.registerUser({ name, email, password, role });

    return res.status(201).json({
      success: true,
      message:
        role === 'employer'
          ? 'Account created. Please check your email to verify your account before posting jobs.'
          : 'Account created successfully.',
      token,
      user,
    });
  })
);

// ─── POST /api/auth/login ─────────────────────────────────────────────────
/**
 * Body: { email, password }
 * Returns: { success, token, user }
 */
router.post(
  '/login',
  asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .json({ success: false, message: 'email and password are required' });
    }

    const { user, token } = await authService.loginUser({ email, password });

    return res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      user,
    });
  })
);

// ─── POST /api/auth/verify-email ──────────────────────────────────────────
/**
 * Body OR query: { token }
 * Accepts the token either as a query parameter (from clicking the email link)
 * or in the JSON body (for API clients).
 */
router.post(
  '/verify-email',
  asyncHandler(async (req, res) => {
    // Accept token from query string (GET-like link click) or request body
    const token = req.query.token || req.body.token;

    const user = await authService.verifyEmail(token);

    return res.status(200).json({
      success: true,
      message: 'Email verified successfully. You can now post jobs.',
      user,
    });
  })
);

// ─── GET /api/auth/verify-email ───────────────────────────────────────────
// Convenience: clicking the link in the console opens a browser → GET request
router.get(
  '/verify-email',
  asyncHandler(async (req, res) => {
    const { token } = req.query;
    const user = await authService.verifyEmail(token);

    return res.status(200).json({
      success: true,
      message: 'Email verified successfully. You can now post jobs.',
      user,
    });
  })
);

module.exports = router;
