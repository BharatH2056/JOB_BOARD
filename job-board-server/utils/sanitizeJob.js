'use strict';

/**
 * utils/sanitizeJob.js
 * ─────────────────────
 * sanitizeJobForSeeker(job)
 *
 * Strips every employer-identifying field from a job document before it is
 * sent to a seeker. This is an explicit allowlist: only fields in SEEKER_FIELDS
 * are ever included — anything added to the Job schema later is automatically
 * excluded from seeker responses until consciously opted-in here.
 *
 * SEEKER_FIELDS (allowlist)
 * ─────────────────────────
 *   _id, title, role, location, description, salary,
 *   jobType, experienceLevel, status, createdAt, updatedAt
 *
 * Explicitly excluded (deny-list for documentation purposes)
 * ──────────────────────────────────────────────────────────
 *   employerId      – ObjectId ref to User
 *   hasApplications – operational flag, seeker-irrelevant
 *   __v             – Mongoose version key
 */

/** Fields a seeker is allowed to see on a job listing. */
const SEEKER_FIELDS = new Set([
  '_id',
  'title',
  'role',
  'location',
  'description',
  'salary',
  'jobType',
  'experienceLevel',
  'status',
  'createdAt',
  'updatedAt',
  'savedAt',
  'score',
  'matchExplanation',
  'skills_required',
]);

/**
 * Return a plain object containing only seeker-safe job fields.
 *
 * Accepts either a Mongoose document (calls .toObject()) or a plain object
 * (e.g. from a .lean() query). Works on a single job or an array.
 *
 * @param {Object|Array} job  – Mongoose document, plain object, or array of either
 * @returns {Object|Array}    – sanitized plain object(s)
 */
const sanitizeJobForSeeker = (job) => {
  if (Array.isArray(job)) {
    return job.map(sanitizeJobForSeeker);
  }

  // Normalise to plain object
  const raw = typeof job.toObject === 'function' ? job.toObject() : { ...job };

  const safe = {};
  for (const key of SEEKER_FIELDS) {
    if (key in raw) safe[key] = raw[key];
  }
  return safe;
};

module.exports = { sanitizeJobForSeeker, SEEKER_FIELDS };
