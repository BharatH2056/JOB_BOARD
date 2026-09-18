'use strict';

// routes/index.js
// Central mount point for all API route modules.

const { Router }                    = require('express');
const { authenticate, requireRole } = require('../middleware/auth');
const requireVerified               = require('../middleware/requireVerified');
const { sanitizeJobForSeeker }      = require('../utils/sanitizeJob');
const authRoutes                    = require('./auth.routes');
const jobRoutes                     = require('./job.routes');       // employer CRUD
const seekerRoutes                  = require('./seeker.routes');    // public browse + saves + applications
const adminRoutes                   = require('./admin.routes');     // admin/moderator routes
const jobService                    = require('../services/job.service');
const seekerService                 = require('../services/seeker.service');
const applicationService            = require('../services/application.service');
const { uploadPdfOnly }             = require('../middleware/upload');

const router = Router();

const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

// ── /api/health ────────────────────────────────────────────────────────────
router.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── /api/auth ──────────────────────────────────────────────────────────────
router.use('/auth', authRoutes);

// ── /api/admin ─────────────────────────────────────────────────────────────
router.use('/admin', adminRoutes);

// ── /api/jobs ──────────────────────────────────────────────────────────────
// Seeker routes (public GET /jobs, POST /jobs/search, POST /jobs/chat-search, GET /jobs/:id/skill-gap, POST /jobs/:id/apply, GET /jobs/:id, POST/DELETE /jobs/:id/save)
// are mounted BEFORE employer CRUD so Express resolves them first.
router.use('/jobs', seekerRoutes);
router.use('/jobs', jobRoutes);

// ── GET /api/employer/dashboard ────────────────────────────────────────────
/**
 * Employer-only. Get metrics (viewCount, saveCount, applicantCount) for all jobs owned by employer.
 */
router.get(
  '/employer/dashboard',
  authenticate,
  requireRole('employer'),
  requireVerified,
  asyncHandler(async (req, res) => {
    const dashboard = await jobService.getEmployerDashboard(req.user.id);
    return res.status(200).json({
      success: true,
      count: dashboard.length,
      jobs: dashboard,
    });
  })
);

// ── GET /api/employer/jobs ─────────────────────────────────────────────────
router.get(
  '/employer/jobs',
  authenticate,
  requireRole('employer'),
  requireVerified,
  asyncHandler(async (req, res) => {
    const jobs = await jobService.getEmployerJobs(req.user.id);
    return res.status(200).json({ success: true, count: jobs.length, jobs });
  })
);

// ── GET /api/employer/jobs/:id/applications ───────────────────────────────
/**
 * Employer-only. View applicants to their own job including full seeker identity.
 */
router.get(
  '/employer/jobs/:id/applications',
  authenticate,
  requireRole('employer'),
  requireVerified,
  asyncHandler(async (req, res) => {
    const applications = await applicationService.getEmployerJobApplications(
      req.user.id,
      req.params.id
    );
    return res.status(200).json({
      success: true,
      count: applications.length,
      applications,
    });
  })
);

// ── PATCH /api/employer/applications/:id/status ───────────────────────────
/**
 * Employer-only. Update application status (applied / reviewed / rejected).
 */
router.patch(
  '/employer/applications/:id/status',
  authenticate,
  requireRole('employer'),
  requireVerified,
  asyncHandler(async (req, res) => {
    const { status } = req.body;
    const application = await applicationService.updateApplicationStatus(
      req.user.id,
      req.params.id,
      status
    );
    return res.status(200).json({
      success: true,
      message: 'Application status updated successfully',
      application,
    });
  })
);

// ── GET /api/seeker/saved-jobs ─────────────────────────────────────────────
router.get(
  '/seeker/saved-jobs',
  authenticate,
  requireRole('seeker'),
  asyncHandler(async (req, res) => {
    const jobs = await seekerService.getSavedJobs(req.user.id);
    return res.status(200).json({
      success: true,
      count: jobs.length,
      jobs: sanitizeJobForSeeker(jobs),
    });
  })
);

// ── GET /api/seeker/applications ───────────────────────────────────────────
/**
 * Seeker-only. List all submitted applications with current status.
 */
router.get(
  '/seeker/applications',
  authenticate,
  requireRole('seeker'),
  asyncHandler(async (req, res) => {
    const applications = await applicationService.getSeekerApplications(req.user.id);
    return res.status(200).json({
      success: true,
      count: applications.length,
      applications,
    });
  })
);

// ── PUT /api/seeker/profile ────────────────────────────────────────────────
router.put(
  '/seeker/profile',
  authenticate,
  requireRole('seeker'),
  uploadPdfOnly.single('resume'),
  asyncHandler(async (req, res) => {
    const profileData = { ...req.body };
    if (req.file) {
      profileData.resumeUrl = `/uploads/resumes/${req.file.filename}`;
    }
    // skills arrives as individual form fields or a JSON string when sent via 
    // FormData — parse it back into an array if needed:
    if (typeof profileData.skills === 'string') {
      try { profileData.skills = JSON.parse(profileData.skills); } catch { profileData.skills = []; }
    }
    const user = await seekerService.updateSeekerProfile(req.user.id, profileData);
    return res.status(200).json({ success: true, message: 'Profile updated successfully', user });
  })
);

module.exports = router;
