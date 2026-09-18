'use strict';

/**
 * services/job.service.js
 * ────────────────────────
 * Pure business-logic for job listings — no Express req/res here.
 *
 * createJob            – persist a new job owned by the requesting employer
 * updateJob            – edit a job; 403 if hasApplications = true
 * deleteJob            – hard-delete a job; 403 if hasApplications = true
 * closeJob             – soft-close (status → "closed"); always allowed
 * getEmployerJobs      – list all jobs belonging to a specific employer
 * getEmployerDashboard – get job metrics (viewCount, saveCount, applicantCount)
 */

const Job         = require('../models/Job');
const SavedJob    = require('../models/SavedJob');
const Application = require('../models/Application');
const { generateEmbedding }     = require('./embeddings');
const { extractJobMetadata }    = require('./llm');
const { invalidateSearchCache } = require('./cache.service');

// ─── Helpers ──────────────────────────────────────────────────────────────

/** Fields a caller is allowed to set on create/update. */
const MUTABLE_FIELDS = [
  'title',
  'role',
  'location',
  'description',
  'salary',
  'jobType',
  'experienceLevel',
];

/**
 * Fetch a job by id, enforce it belongs to the requesting employer,
 * and optionally enforce that no applications have been received.
 *
 * @param {string}  jobId          – MongoDB ObjectId string
 * @param {string}  employerId     – from req.user.id
 * @param {boolean} blockIfApplied – when true, throw 403 if hasApplications
 * @returns {mongoose.Document}    – the Job document
 */
const fetchOwnedJob = async (jobId, employerId, blockIfApplied = false) => {
  const job = await Job.findById(jobId);

  if (!job) {
    const err = new Error('Job not found');
    err.statusCode = 404;
    throw err;
  }

  if (job.employerId.toString() !== employerId.toString()) {
    const err = new Error('You do not have permission to modify this job');
    err.statusCode = 403;
    throw err;
  }

  if (blockIfApplied && job.hasApplications) {
    const err = new Error(
      'This job already has applications and cannot be edited or deleted. ' +
        'Use PATCH /jobs/:id/close to close it instead.'
    );
    err.statusCode = 403;
    throw err;
  }

  return job;
};

/**
 * Computes cosine similarity between two numeric vectors.
 * @param {number[]} a
 * @param {number[]} b
 * @returns {number}
 */
const cosineSimilarity = (a, b) => {
  if (!a || !b || a.length !== b.length) return 0;
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
};

// ─── Service methods ──────────────────────────────────────────────────────

/**
 * Create a new job listing.
 *
 * @param {string} employerId
 * @param {Object} data  – { title, role, location, description, salary, jobType, experienceLevel }
 * @returns {mongoose.Document}
 */
const createJob = async (employerId, data) => {
  const payload = { employerId };

  for (const field of MUTABLE_FIELDS) {
    if (data[field] !== undefined) payload[field] = data[field];
  }

  if (payload.description) {
    payload.description_embedding = await generateEmbedding(payload.description);

    // Near-duplicate check: Compare embedding against employer's existing open jobs
    if (Array.isArray(payload.description_embedding) && payload.description_embedding.length > 0) {
      const existingJobs = await Job.find({ employerId, status: 'open' })
        .select('+description_embedding')
        .lean();

      for (const existingJob of existingJobs) {
        if (Array.isArray(existingJob.description_embedding) && existingJob.description_embedding.length > 0) {
          const sim = cosineSimilarity(payload.description_embedding, existingJob.description_embedding);
          if (sim > 0.95) {
            const err = new Error('Duplicate or near-duplicate job posting detected.');
            err.statusCode = 409;
            throw err;
          }
        }
      }
    }

    const metadata = await extractJobMetadata(payload.description);
    if (Array.isArray(metadata.skills) && metadata.skills.length > 0) {
      payload.skills_required = metadata.skills;
    }
    if (!payload.experienceLevel && metadata.experienceLevel) {
      payload.experienceLevel = metadata.experienceLevel;
    }
  }

  const job = await Job.create(payload);

  // Cache invalidation is best-effort — must never crash the job-creation request.
  try {
    await invalidateSearchCache();
  } catch (err) {
    console.warn('[JOB SERVICE] Cache invalidation failed (ignored):', err.message);
  }

  return job;
};

/**
 * Update an existing job listing.
 * Blocked (403) if hasApplications is true.
 *
 * @param {string} jobId
 * @param {string} employerId
 * @param {Object} data  – subset of mutable fields
 * @returns {mongoose.Document}
 */
const updateJob = async (jobId, employerId, data) => {
  const job = await fetchOwnedJob(jobId, employerId, true /* blockIfApplied */);

  let descriptionChanged = false;

  for (const field of MUTABLE_FIELDS) {
    if (data[field] !== undefined) {
      if (field === 'description' && job.description !== data[field]) {
        descriptionChanged = true;
      }
      job[field] = data[field];
    }
  }

  if (descriptionChanged) {
    job.description_embedding = await generateEmbedding(job.description);

    const metadata = await extractJobMetadata(job.description);
    if (Array.isArray(metadata.skills) && metadata.skills.length > 0) {
      job.skills_required = metadata.skills;
    }
    if (!data.experienceLevel && metadata.experienceLevel) {
      job.experienceLevel = metadata.experienceLevel;
    }
  }

  await job.save();
  return job;
};

/**
 * Hard-delete a job listing.
 * Blocked (403) if hasApplications is true.
 *
 * @param {string} jobId
 * @param {string} employerId
 */
const deleteJob = async (jobId, employerId) => {
  const job = await fetchOwnedJob(jobId, employerId, true /* blockIfApplied */);
  await job.deleteOne();
};

/**
 * Soft-close a job (status → "closed").
 * Always permitted regardless of hasApplications.
 *
 * @param {string} jobId
 * @param {string} employerId
 * @returns {mongoose.Document}
 */
const closeJob = async (jobId, employerId) => {
  const job = await fetchOwnedJob(jobId, employerId, false /* allow even if applied */);

  if (job.status === 'closed') {
    const err = new Error('Job is already closed');
    err.statusCode = 409;
    throw err;
  }

  job.status = 'closed';
  await job.save();
  return job;
};

/**
 * List all jobs belonging to a specific employer, newest first.
 *
 * @param {string} employerId
 * @returns {mongoose.Document[]}
 */
const getEmployerJobs = async (employerId) => {
  const jobs = await Job.find({ employerId })
    .populate('employerId', 'name email role emailVerified')
    .sort({ createdAt: -1 })
    .lean();

  return jobs;
};

/**
 * Get aggregated metrics for an employer's dashboard.
 * Returns view count, save count, and applicant count per job.
 *
 * @param {string} employerId
 * @returns {Promise<Object[]>}
 */
const getEmployerDashboard = async (employerId) => {
  const jobs = await Job.find({ employerId })
    .sort({ createdAt: -1 })
    .lean();

  const dashboard = await Promise.all(
    jobs.map(async (job) => {
      const viewCount = Array.isArray(job.views) ? job.views.length : 0;
      const saveCount = await SavedJob.countDocuments({ jobId: job._id });
      const applicantCount = await Application.countDocuments({ jobId: job._id });

      return {
        _id: job._id,
        title: job.title,
        role: job.role,
        location: job.location,
        status: job.status,
        hasApplications: job.hasApplications,
        viewCount,
        saveCount,
        applicantCount,
        createdAt: job.createdAt,
      };
    })
  );

  return dashboard;
};

module.exports = {
  createJob,
  updateJob,
  deleteJob,
  closeJob,
  getEmployerJobs,
  getEmployerDashboard,
};
