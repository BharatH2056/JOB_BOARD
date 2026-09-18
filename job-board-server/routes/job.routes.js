'use strict';

/**
 * routes/job.routes.js
 * ─────────────────────
 * All routes require: authenticate → requireRole('employer') → requireVerified
 *
 * POST   /api/jobs            – create a job listing
 * PUT    /api/jobs/:id        – edit a job (403 if hasApplications)
 * DELETE /api/jobs/:id        – hard-delete (403 if hasApplications)
 * PATCH  /api/jobs/:id/close  – soft-close (always permitted)
 */

const { Router }        = require('express');
const { authenticate, requireRole } = require('../middleware/auth');
const requireVerified   = require('../middleware/requireVerified');
const { aiEndpointLimiter } = require('../middleware/rateLimiter');
const jobService        = require('../services/job.service');

const router = Router();

/** Wrap async handlers so errors reach the global error handler. */
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

/** Shared guard chain for every employer-only job route. */
const employerGuard = [authenticate, requireRole('employer'), requireVerified];

// ─── POST /api/jobs ────────────────────────────────────────────────────────
/**
 * Body: { title, role, location, description, salary?, jobType, experienceLevel? }
 */
router.post(
  '/',
  employerGuard,
  aiEndpointLimiter,
  asyncHandler(async (req, res) => {
    const { title, role, location, description, jobType } = req.body;

    if (!title || !role || !location || !description || !jobType) {
      return res.status(400).json({
        success: false,
        message: 'title, role, location, description, and jobType are required',
      });
    }

    const job = await jobService.createJob(req.user.id, req.body);
    return res.status(201).json({ success: true, job });
  })
);

// ─── PUT /api/jobs/:id ─────────────────────────────────────────────────────
/**
 * Body: any subset of mutable fields.
 * Returns 403 if hasApplications is true.
 */
router.put(
  '/:id',
  employerGuard,
  asyncHandler(async (req, res) => {
    const job = await jobService.updateJob(req.params.id, req.user.id, req.body);
    return res.status(200).json({ success: true, job });
  })
);

// ─── DELETE /api/jobs/:id ──────────────────────────────────────────────────
/**
 * Hard-delete.
 * Returns 403 if hasApplications is true — use PATCH /close instead.
 */
router.delete(
  '/:id',
  employerGuard,
  asyncHandler(async (req, res) => {
    await jobService.deleteJob(req.params.id, req.user.id);
    return res.status(200).json({ success: true, message: 'Job deleted successfully' });
  })
);

// ─── PATCH /api/jobs/:id/close ─────────────────────────────────────────────
/**
 * Soft-close: sets status → "closed".
 * Always allowed regardless of hasApplications.
 */
router.patch(
  '/:id/close',
  employerGuard,
  asyncHandler(async (req, res) => {
    const job = await jobService.closeJob(req.params.id, req.user.id);
    return res.status(200).json({ success: true, message: 'Job closed successfully', job });
  })
);

module.exports = router;
