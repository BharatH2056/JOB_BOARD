'use strict';

/**
 * routes/seeker.routes.js
 * ────────────────────────
 * Public job-browsing routes:
 *
 *   GET   /api/jobs                   – list open jobs (filtered, sanitized)
 *   POST  /api/jobs/search            – vector semantic search ({ query })
 *   GET   /api/jobs/:id/skill-gap     – compare seeker skills vs job skills_required
 *   POST  /api/jobs/:id/apply         – submit job application with resume upload / URL
 *   GET   /api/jobs/:id               – single open job (sanitized)
 *
 * Seeker-only saved-job routes (require authenticate + requireRole('seeker')):
 *
 *   POST   /api/jobs/:id/save         – bookmark a job
 *   DELETE /api/jobs/:id/save         – remove bookmark
 *   GET    /api/seeker/saved-jobs     – list bookmarked jobs
 *   PUT    /api/seeker/profile        – update seeker profile
 *   GET    /api/seeker/applications   – list seeker's submitted applications
 *
 * ALL job responses pass through sanitizeJobForSeeker() before being sent.
 * No employer-identifying data ever leaves this router.
 */

const { Router }                                             = require('express');
const { authenticate, optionalAuthenticate, requireRole }  = require('../middleware/auth');
const { aiEndpointLimiter }                                  = require('../middleware/rateLimiter');
const seekerService                                          = require('../services/seeker.service');
const applicationService                                     = require('../services/application.service');
const { sanitizeJobForSeeker }                               = require('../utils/sanitizeJob');
const upload                                                 = require('../middleware/upload');

const router = Router();

/** Wrap async handlers so errors reach the global error handler. */
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

/** Guard for seeker-only routes. */
const seekerGuard = [authenticate, requireRole('seeker')];

// ─── GET /api/jobs ─────────────────────────────────────────────────────────
/**
 * Public. No authentication required.
 * Query params: ?role=&location=&jobType=&experienceLevel=
 */
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { jobs, total, page, limit, totalPages } = await seekerService.listOpenJobs(req.query);
    return res.status(200).json({
      success: true,
      count: jobs.length,
      total,
      page,
      limit,
      totalPages,
      jobs: sanitizeJobForSeeker(jobs),
    });
  })
);

// ─── POST /api/jobs/search ─────────────────────────────────────────────────
/**
 * Public. Semantic vector search across open jobs.
 * Body: { query: "search prompt..." }
 * Returns top 10 matching open jobs with a similarity score field.
 */
router.post(
  '/search',
  optionalAuthenticate,
  aiEndpointLimiter,
  asyncHandler(async (req, res) => {
    const { query } = req.body;
    if (!query) {
      return res.status(400).json({
        success: false,
        message: 'query field is required in request body',
      });
    }

    const seekerId = req.user ? req.user.id : null;
    const jobs = await seekerService.vectorSearchJobs(query, seekerId);
    return res.status(200).json({
      success: true,
      count: jobs.length,
      jobs: sanitizeJobForSeeker(jobs),
    });
  })
);

// ─── GET /api/jobs/:id/skill-gap ──────────────────────────────────────────
/**
 * Seeker-only. Compares seeker.skills against job.skills_required.
 * Returns { success: true, matchingSkills: [...], missingSkills: [...] }
 */
router.get(
  '/:id/skill-gap',
  seekerGuard,
  asyncHandler(async (req, res) => {
    const { matchingSkills, missingSkills } = await seekerService.getSkillGap(
      req.user.id,
      req.params.id
    );
    return res.status(200).json({
      success: true,
      matchingSkills,
      missingSkills,
    });
  })
);

// ─── POST /api/jobs/:id/apply ──────────────────────────────────────────────
/**
 * Seeker-only. Submit a job application.
 * Accepts resume upload file or resumeUrl parameter + formAnswers object.
 * Automatically flips Job.hasApplications = true.
 */
router.post(
  '/:id/apply',
  seekerGuard,
  upload.single('resume'),
  asyncHandler(async (req, res) => {
    let resumeUrl = req.body.resumeUrl;

    if (req.file) {
      resumeUrl = `uploads/resumes/${req.file.filename}`;
    }

    let formAnswers = req.body.formAnswers;
    if (typeof formAnswers === 'string') {
      try {
        formAnswers = JSON.parse(formAnswers);
      } catch (err) {
        // Keep string if not valid JSON
      }
    }

    const application = await applicationService.applyToJob(
      req.user.id,
      req.params.id,
      { resumeUrl, formAnswers }
    );

    return res.status(201).json({
      success: true,
      message: 'Application submitted successfully',
      application,
    });
  })
);

// ─── GET /api/jobs/:id ─────────────────────────────────────────────────────
/**
 * Public. Returns a single open job, sanitized.
 * Uses optionalAuthenticate to capture seekerId/IP for view tracking.
 */
router.get(
  '/:id',
  optionalAuthenticate,
  asyncHandler(async (req, res) => {
    const viewerId = req.user ? req.user.id : (req.ip || 'anonymous');
    const job = await seekerService.getJobById(req.params.id, viewerId);
    return res.status(200).json({
      success: true,
      job: sanitizeJobForSeeker(job),
    });
  })
);

// ─── POST /api/jobs/:id/save ───────────────────────────────────────────────
/**
 * Seeker-only. Bookmark a job.
 * Returns 409 if already saved.
 */
router.post(
  '/:id/save',
  seekerGuard,
  asyncHandler(async (req, res) => {
    await seekerService.saveJob(req.user.id, req.params.id);
    return res.status(201).json({
      success: true,
      message: 'Job saved successfully',
    });
  })
);

// ─── DELETE /api/jobs/:id/save ─────────────────────────────────────────────
/**
 * Seeker-only. Remove a bookmark.
 * Returns 404 if not in saved list.
 */
router.delete(
  '/:id/save',
  seekerGuard,
  asyncHandler(async (req, res) => {
    await seekerService.unsaveJob(req.user.id, req.params.id);
    return res.status(200).json({
      success: true,
      message: 'Job removed from saved list',
    });
  })
);

module.exports = router;
