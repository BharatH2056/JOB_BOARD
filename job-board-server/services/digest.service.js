'use strict';

/**
 * services/digest.service.js
 * ───────────────────────────
 * Scheduled daily job digest service powered by node-cron and Nodemailer.
 *
 * Responsibilities:
 *  - runDailyDigest():
 *    1. Finds seekers with lastSearchQuery, savedSearches, or profile skills.
 *    2. Queries open jobs posted within the last 24 hours.
 *    3. Filters/ranks matching new jobs for each seeker.
 *    4. Sends digest email via Nodemailer (logged to console).
 *  - startDigestCronJob():
 *    Schedules runDailyDigest to run daily at 00:00 (or custom cron expression).
 */

const cron              = require('node-cron');
const User              = require('../models/User');
const Job               = require('../models/Job');
const { sendDigestEmail } = require('./mailer.service');

/**
 * Helper to check if a job matches a search query or skill keywords.
 * Performs a case-insensitive check against title, role, location, description, and skills_required.
 *
 * @param {Object} job
 * @param {string} query
 * @returns {boolean}
 */
const matchesJobQuery = (job, query) => {
  if (!query || typeof query !== 'string') return false;
  const terms = query.toLowerCase().split(/\s+/).filter((t) => t.length > 1);
  if (terms.length === 0) return true;

  const targetText = [
    job.title,
    job.role,
    job.location,
    job.description,
    ...(job.skills_required || []),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  return terms.some((term) => targetText.includes(term));
};

/**
 * Execute the daily digest workflow for all eligible job seekers.
 *
 * @returns {Promise<{ processedSeekers: number, digestsSent: number }>}
 */
const runDailyDigest = async () => {
  console.log('[DIGEST SERVICE] Running daily job digest process...');

  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  // Fetch open jobs created in the last 24 hours
  const recentJobs = await Job.find({
    status: 'open',
    createdAt: { $gte: twentyFourHoursAgo },
  }).lean();

  if (recentJobs.length === 0) {
    console.log('[DIGEST SERVICE] No new jobs posted in the last 24 hours. Digest skipped.');
    return { processedSeekers: 0, digestsSent: 0 };
  }

  // Fetch all seekers
  const seekers = await User.find({ role: 'seeker' }).lean();
  let digestsSent = 0;

  for (const seeker of seekers) {
    const searchQuery =
      (seeker.lastSearchQuery && seeker.lastSearchQuery.trim()) ||
      (Array.isArray(seeker.savedSearches) && seeker.savedSearches[0]) ||
      (Array.isArray(seeker.skills) && seeker.skills.join(' ')) ||
      '';

    if (!searchQuery) continue;

    const matchedJobs = recentJobs.filter((job) => matchesJobQuery(job, searchQuery));

    if (matchedJobs.length > 0) {
      await sendDigestEmail(seeker.email, seeker.name, matchedJobs, searchQuery);
      digestsSent++;
    }
  }

  console.log(`[DIGEST SERVICE] Completed daily digest process. ${digestsSent} email(s) sent.`);
  return { processedSeekers: seekers.length, digestsSent };
};

/**
 * Start the daily node-cron scheduled job.
 * Default schedule is daily at midnight: "0 0 * * *"
 *
 * @param {string} [cronExpression="0 0 * * *"]
 * @returns {ScheduledTask}
 */
const startDigestCronJob = (cronExpression = '0 0 * * *') => {
  console.log(`[DIGEST SERVICE] Scheduling daily job digest cron with pattern: "${cronExpression}"`);
  const task = cron.schedule(cronExpression, async () => {
    try {
      await runDailyDigest();
    } catch (err) {
      console.error('[DIGEST SERVICE] Error during scheduled daily digest run:', err);
    }
  });

  return task;
};

module.exports = {
  runDailyDigest,
  startDigestCronJob,
  matchesJobQuery,
};
