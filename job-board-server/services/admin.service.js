'use strict';

/**
 * services/admin.service.js
 * ─────────────────────────
 * Pure business-logic for Admin / Moderator operations.
 *
 * getAllJobs         – list all jobs in the database (unfiltered)
 * adminDeleteJob     – force delete any job by ID
 * getAllUsers        – list all registered platform users
 * setUserBanStatus   – set user's isBanned status (true/false)
 */

const Job  = require('../models/Job');
const User = require('../models/User');

/**
 * Fetch all job listings (unfiltered, includes open and closed jobs).
 * @returns {Promise<Object[]>}
 */
const getAllJobs = async () => {
  const jobs = await Job.find({})
    .populate('employerId', 'name email role emailVerified isBanned')
    .sort({ createdAt: -1 })
    .lean();

  return jobs;
};

/**
 * Force delete any job listing.
 * @param {string} jobId
 */
const adminDeleteJob = async (jobId) => {
  const job = await Job.findById(jobId);
  if (!job) {
    const err = new Error('Job not found');
    err.statusCode = 404;
    throw err;
  }

  await job.deleteOne();
};

/**
 * Fetch all registered users.
 * @returns {Promise<Object[]>}
 */
const getAllUsers = async () => {
  const users = await User.find({})
    .sort({ createdAt: -1 })
    .lean();

  return users;
};

/**
 * Update user ban status.
 * @param {string} userId
 * @param {boolean} isBanned
 * @returns {Promise<Object>}
 */
const setUserBanStatus = async (userId, isBanned = true) => {
  const user = await User.findById(userId);
  if (!user) {
    const err = new Error('User not found');
    err.statusCode = 404;
    throw err;
  }

  user.isBanned = Boolean(isBanned);
  await user.save();
  return user;
};

module.exports = {
  getAllJobs,
  adminDeleteJob,
  getAllUsers,
  setUserBanStatus,
};
