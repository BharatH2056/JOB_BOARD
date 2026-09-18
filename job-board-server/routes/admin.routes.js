'use strict';

/**
 * routes/admin.routes.js
 * ──────────────────────
 * Admin / Moderator routes (require authenticate + requireRole('admin')):
 *
 *   GET    /api/admin/jobs           – list all jobs unfiltered
 *   DELETE /api/admin/jobs/:id       – force delete any job by ID
 *   GET    /api/admin/users          – list all registered users
 *   PATCH  /api/admin/users/:id/ban  – update user ban status ({ isBanned: boolean })
 */

const { Router }                    = require('express');
const { authenticate, requireRole } = require('../middleware/auth');
const adminService                  = require('../services/admin.service');

const router = Router();

const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

/** Guard for admin-only routes. */
const adminGuard = [authenticate, requireRole('admin')];

// ── GET /api/admin/jobs ───────────────────────────────────────────────────
router.get(
  '/jobs',
  adminGuard,
  asyncHandler(async (_req, res) => {
    const jobs = await adminService.getAllJobs();
    return res.status(200).json({
      success: true,
      count: jobs.length,
      jobs,
    });
  })
);

// ── DELETE /api/admin/jobs/:id ────────────────────────────────────────────
router.delete(
  '/jobs/:id',
  adminGuard,
  asyncHandler(async (req, res) => {
    await adminService.adminDeleteJob(req.params.id);
    return res.status(200).json({
      success: true,
      message: 'Job deleted by admin successfully',
    });
  })
);

// ── GET /api/admin/users ──────────────────────────────────────────────────
router.get(
  '/users',
  adminGuard,
  asyncHandler(async (_req, res) => {
    const users = await adminService.getAllUsers();
    return res.status(200).json({
      success: true,
      count: users.length,
      users,
    });
  })
);

// ── PATCH /api/admin/users/:id/ban ────────────────────────────────────────
router.patch(
  '/users/:id/ban',
  adminGuard,
  asyncHandler(async (req, res) => {
    const isBanned = req.body.isBanned !== undefined ? req.body.isBanned : true;
    const user = await adminService.setUserBanStatus(req.params.id, isBanned);
    return res.status(200).json({
      success: true,
      message: `User ban status updated to ${user.isBanned}`,
      user,
    });
  })
);

module.exports = router;
