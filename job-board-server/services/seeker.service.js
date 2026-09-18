'use strict';

/**
 * services/seeker.service.js
 * ───────────────────────────
 * Business-logic for seeker-facing features — no Express req/res here.
 *
 * listOpenJobs         – paginated, filtered list of open job listings
 * getJobById           – fetch a single open job
 * vectorSearchJobs     – vector semantic search using MongoDB Atlas $vectorSearch + LLM match explanations
 * updateSeekerProfile  – update seeker's skills, bio, and resumeUrl
 * getSkillGap          – compare seeker's skills against job's skills_required
 * saveJob              – bookmark a job for a seeker
 * unsaveJob            – remove a bookmark
 * getSavedJobs         – list all bookmarked jobs for a seeker
 */


const User     = require('../models/User');
const Job      = require('../models/Job');
const SavedJob = require('../models/SavedJob');
const { generateEmbedding } = require('./embeddings');
const { explainJobMatch } = require('./llm');
const { getSearchCache, setSearchCache } = require('./cache.service');

// ─── Helpers ──────────────────────────────────────────────────────────────

/** Recognised filter query params and the Job field they map to. */
const FILTER_MAP = {
  role:            'role',
  location:        'location',
  jobType:         'jobType',
  experienceLevel: 'experienceLevel',
};

/**
 * Build a case-insensitive regex filter from a string value.
 * Lets seekers type "london" and match "London".
 */
const ilike = (value) => ({ $regex: value.trim(), $options: 'i' });

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

/**
 * Attaches matchExplanation to an array of job documents using the LLM service.
 * @param {Object[]} jobs
 * @param {string} queryText
 * @returns {Promise<Object[]>}
 */
const attachMatchExplanations = async (jobs, queryText) => {
  return Promise.all(
    jobs.map(async (job) => {
      const matchExplanation = await explainJobMatch({
        query: queryText,
        description: job.description,
      });
      return { ...job, matchExplanation };
    })
  );
};

// ─── Service methods ──────────────────────────────────────────────────────

/**
 * List open jobs with optional filtering and pagination.
 *
 * Supported query params: role, location, jobType, experienceLevel, page, limit
 * Results are sorted newest-first and use .lean() for performance.
 *
 * @param {Object} filters  – raw query object from req.query
 * @returns {Promise<{ jobs: Object[], total: number, page: number, limit: number, totalPages: number }>}
 */
const listOpenJobs = async (filters = {}) => {
  const query = { status: 'open' };

  for (const [param, field] of Object.entries(FILTER_MAP)) {
    if (filters[param]) {
      query[field] = field === 'jobType' ? filters[param] : ilike(filters[param]);
    }
  }

  const page = Math.max(1, parseInt(filters.page, 10) || 1);
  const limit = Math.max(1, parseInt(filters.limit, 10) || 10);

  const [total, jobs] = await Promise.all([
    Job.countDocuments(query),
    Job.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
  ]);

  return {
    jobs,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
};

/**
 * Fetch a single open job by ID.
 *
 * @param {string} jobId
 * @param {string} [viewerId]
 * @returns {Object}  – lean job document (NOT sanitized here)
 */
const getJobById = async (jobId, viewerId = null) => {
  if (viewerId) {
    await Job.findByIdAndUpdate(jobId, { $addToSet: { views: viewerId } });
  }

  const job = await Job.findOne({ _id: jobId, status: 'open' }).lean();

  if (!job) {
    const err = new Error('Job not found or no longer available');
    err.statusCode = 404;
    throw err;
  }

  return job;
};

/**
 * Semantic vector search on open jobs using description_embedding with LLM explanations attached.
 * Uses MongoDB Atlas $vectorSearch stage with fallback to cosine similarity for test/local DBs.
 *
 * @param {string} queryText
 * @param {string} [seekerId]
 * @returns {Promise<Object[]>} – top 10 matching jobs with score & matchExplanation fields
 */
const vectorSearchJobs = async (queryText, seekerId = null) => {
  if (!queryText || typeof queryText !== 'string' || !queryText.trim()) {
    const err = new Error('Search query string is required');
    err.statusCode = 400;
    throw err;
  }

  const cleanQuery = queryText.trim();

  if (seekerId) {
    await User.findByIdAndUpdate(seekerId, {
      lastSearchQuery: cleanQuery,
      $addToSet: { savedSearches: cleanQuery },
    });
  }

  // Check Redis cache
  const cachedResults = await getSearchCache(cleanQuery);
  if (cachedResults) {
    return cachedResults;
  }

  const queryVector = await generateEmbedding(cleanQuery);
  const indexName = process.env.VECTOR_INDEX_NAME || 'vector_index';

  let topJobs = [];

  try {
    const results = await Job.aggregate([
      {
        $vectorSearch: {
          index: indexName,
          path: 'description_embedding',
          queryVector: queryVector,
          numCandidates: 100,
          limit: 10,
          filter: { status: 'open' },
        },
      },
      {
        $project: {
          score: { $meta: 'vectorSearchScore' },
          title: 1,
          role: 1,
          location: 1,
          description: 1,
          salary: 1,
          jobType: 1,
          experienceLevel: 1,
          skills_required: 1,
          status: 1,
          createdAt: 1,
          updatedAt: 1,
        },
      },
    ]);

    if (results && results.length > 0) {
      topJobs = results;
    }
  } catch (err) {
    // Stage $vectorSearch not supported on non-Atlas MongoDB
  }

  if (topJobs.length === 0) {
    const openJobs = await Job.find({ status: 'open' })
      .select('+description_embedding')
      .lean();

    topJobs = openJobs
      .filter((j) => Array.isArray(j.description_embedding) && j.description_embedding.length > 0)
      .map((j) => {
        const score = parseFloat(cosineSimilarity(queryVector, j.description_embedding).toFixed(4));
        return { ...j, score };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);
  }

  const enrichedJobs = await attachMatchExplanations(topJobs, cleanQuery);
  await setSearchCache(cleanQuery, enrichedJobs);
  return enrichedJobs;
};


/**
 * Update seeker profile fields: skills, bio, resumeUrl.
 *
 * @param {string} seekerId
 * @param {Object} profileData – { skills?, bio?, resumeUrl? }
 * @returns {Promise<Object>}   – updated User document
 */
const updateSeekerProfile = async (seekerId, { skills, bio, resumeUrl }) => {
  const user = await User.findById(seekerId);

  if (!user) {
    const err = new Error('Seeker profile not found');
    err.statusCode = 404;
    throw err;
  }

  if (Array.isArray(skills)) {
    user.skills = skills
      .filter((s) => typeof s === 'string' && s.trim().length > 0)
      .map((s) => s.trim());
  }

  if (typeof bio === 'string') {
    user.bio = bio.trim();
  }

  if (resumeUrl !== undefined) {
    user.resumeUrl = typeof resumeUrl === 'string' && resumeUrl.trim() ? resumeUrl.trim() : null;
  }

  await user.save();
  return user;
};

/**
 * Compare logged-in seeker's skills against a job's skills_required.
 * Returns { matchingSkills: [...], missingSkills: [...] }
 *
 * @param {string} seekerId
 * @param {string} jobId
 * @returns {Promise<{ matchingSkills: string[], missingSkills: string[] }>}
 */
const getSkillGap = async (seekerId, jobId) => {
  const seeker = await User.findById(seekerId).lean();
  if (!seeker) {
    const err = new Error('Seeker profile not found');
    err.statusCode = 404;
    throw err;
  }

  const job = await Job.findOne({ _id: jobId, status: 'open' }).lean();
  if (!job) {
    const err = new Error('Job not found or no longer available');
    err.statusCode = 404;
    throw err;
  }

  const seekerSkillSet = new Set((seeker.skills || []).map((s) => s.toLowerCase().trim()));
  const matchingSkills = [];
  const missingSkills = [];

  for (const skill of job.skills_required || []) {
    const normalized = skill.toLowerCase().trim();
    if (seekerSkillSet.has(normalized)) {
      matchingSkills.push(skill);
    } else {
      missingSkills.push(skill);
    }
  }

  return { matchingSkills, missingSkills };
};

/**
 * Save (bookmark) a job for a seeker.
 *
 * @param {string} seekerId
 * @param {string} jobId
 * @returns {Object}  – the SavedJob document
 */
const saveJob = async (seekerId, jobId) => {
  const job = await Job.findOne({ _id: jobId, status: 'open' }).lean();
  if (!job) {
    const err = new Error('Job not found or no longer available');
    err.statusCode = 404;
    throw err;
  }

  try {
    const saved = await SavedJob.create({ seekerId, jobId });
    return saved;
  } catch (err) {
    if (err.code === 11000) {
      const conflict = new Error('Job is already in your saved list');
      conflict.statusCode = 409;
      throw conflict;
    }
    throw err;
  }
};

/**
 * Remove a saved-job bookmark.
 *
 * @param {string} seekerId
 * @param {string} jobId
 */
const unsaveJob = async (seekerId, jobId) => {
  const result = await SavedJob.deleteOne({ seekerId, jobId });

  if (result.deletedCount === 0) {
    const err = new Error('Saved job not found');
    err.statusCode = 404;
    throw err;
  }
};

/**
 * List all jobs saved by a seeker, newest-save-first.
 *
 * @param {string} seekerId
 * @returns {Object[]}  – array of lean job documents (NOT sanitized here)
 */
const getSavedJobs = async (seekerId) => {
  const savedRecords = await SavedJob.find({ seekerId })
    .sort({ savedAt: -1 })
    .populate('jobId')
    .lean();

  return savedRecords
    .filter((r) => r.jobId !== null)
    .map((r) => ({ ...r.jobId, savedAt: r.savedAt }));
};

module.exports = {
  listOpenJobs,
  getJobById,
  vectorSearchJobs,
  updateSeekerProfile,
  getSkillGap,
  saveJob,
  unsaveJob,
  getSavedJobs,
};
