'use strict';

/**
 * services/application.service.js
 * ────────────────────────────────
 * Business-logic for job application submission, applicant tracking, and status updates.
 *
 * applyToJob                 – seeker applies to a job; sets job.hasApplications = true
 * getSeekerApplications      – list all applications submitted by a seeker (sanitized job info)
 * getEmployerJobApplications – list applicants for a job owned by employer (full seeker identity)
 * updateApplicationStatus    – employer updates application status (applied / reviewed / rejected)
 */

const User        = require('../models/User');
const Job         = require('../models/Job');
const Application = require('../models/Application');
const { sanitizeJobForSeeker } = require('../utils/sanitizeJob');

/**
 * Seeker submits an application to an open job.
 *
 * @param {string} seekerId
 * @param {string} jobId
 * @param {Object} payload  – { resumeUrl?, formAnswers? }
 * @returns {Promise<Object>}
 */
const applyToJob = async (seekerId, jobId, payload = {}) => {
  const job = await Job.findOne({ _id: jobId, status: 'open' });
  if (!job) {
    const err = new Error('Job not found or no longer open for applications');
    err.statusCode = 404;
    throw err;
  }

  const seeker = await User.findById(seekerId).lean();
  if (!seeker) {
    const err = new Error('Seeker profile not found');
    err.statusCode = 404;
    throw err;
  }

  // Resolve resumeUrl from payload or fall back to seeker profile's default resumeUrl
  const finalResumeUrl = payload.resumeUrl || seeker.resumeUrl;
  if (!finalResumeUrl) {
    const err = new Error('Resume is required. Please provide a resume file/URL or set a default resumeUrl in your profile.');
    err.statusCode = 400;
    throw err;
  }

  try {
    const application = await Application.create({
      jobId,
      seekerId,
      resumeUrl: finalResumeUrl,
      formAnswers: payload.formAnswers || {},
    });

    // Flip hasApplications = true on the Job document (activates edit/delete locks)
    if (!job.hasApplications) {
      job.hasApplications = true;
      await job.save();
    }

    return application;
  } catch (err) {
    if (err.code === 11000) {
      const conflict = new Error('You have already applied to this job');
      conflict.statusCode = 409;
      throw conflict;
    }
    throw err;
  }
};

/**
 * List all applications submitted by a seeker.
 * Output job details are sanitized via sanitizeJobForSeeker().
 *
 * @param {string} seekerId
 * @returns {Promise<Object[]>}
 */
const getSeekerApplications = async (seekerId) => {
  const applications = await Application.find({ seekerId })
    .sort({ appliedAt: -1 })
    .populate('jobId')
    .lean();

  return applications
    .filter((app) => app.jobId !== null)
    .map((app) => {
      const sanitizedJob = sanitizeJobForSeeker(app.jobId);
      const { jobId, ...rest } = app;
      return {
        ...rest,
        job: sanitizedJob,
      };
    });
};

/**
 * List all applications submitted to a specific job owned by an employer.
 * Includes full applicant seeker identity (this direction is NOT blind).
 *
 * @param {string} employerId
 * @param {string} jobId
 * @returns {Promise<Object[]>}
 */
const getEmployerJobApplications = async (employerId, jobId) => {
  const job = await Job.findById(jobId).lean();
  if (!job) {
    const err = new Error('Job not found');
    err.statusCode = 404;
    throw err;
  }

  if (job.employerId.toString() !== employerId.toString()) {
    const err = new Error('You do not have permission to view applications for this job');
    err.statusCode = 403;
    throw err;
  }

  const applications = await Application.find({ jobId })
    .sort({ appliedAt: -1 })
    .populate('seekerId', 'name email skills bio resumeUrl')
    .lean();

  return applications.map((app) => {
    const seeker = app.seekerId;
    const { seekerId, ...rest } = app;
    return {
      ...rest,
      applicant: seeker,
    };
  });
};

/**
 * Employer updates the status of an application.
 *
 * @param {string} employerId
 * @param {string} applicationId
 * @param {string} newStatus  – applied | reviewed | rejected
 * @returns {Promise<Object>}  – updated Application document
 */
const updateApplicationStatus = async (employerId, applicationId, newStatus) => {
  const VALID_STATUSES = ['applied', 'reviewed', 'rejected'];
  if (!newStatus || !VALID_STATUSES.includes(newStatus)) {
    const err = new Error('Invalid status. Status must be applied, reviewed, or rejected');
    err.statusCode = 400;
    throw err;
  }

  const application = await Application.findById(applicationId).populate('jobId');
  if (!application) {
    const err = new Error('Application not found');
    err.statusCode = 404;
    throw err;
  }

  if (!application.jobId || application.jobId.employerId.toString() !== employerId.toString()) {
    const err = new Error('You do not have permission to update status for this application');
    err.statusCode = 403;
    throw err;
  }

  application.status = newStatus;
  await application.save();
  return application;
};

module.exports = {
  applyToJob,
  getSeekerApplications,
  getEmployerJobApplications,
  updateApplicationStatus,
};
