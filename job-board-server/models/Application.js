'use strict';

/**
 * models/Application.js
 * ──────────────────────
 * Mongoose schema for job applications submitted by seekers to job listings.
 *
 * Fields
 * ──────
 *  jobId        – ref to Job
 *  seekerId     – ref to User (the job seeker)
 *  resumeUrl    – link or file path to seeker's resume
 *  formAnswers  – optional key-value map of screening question answers
 *  status       – enum: applied | reviewed | rejected (default: applied)
 *  appliedAt    – timestamp of application submission (default: now)
 */

const mongoose = require('mongoose');

const applicationSchema = new mongoose.Schema(
  {
    jobId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Job',
      required: [true, 'jobId is required'],
      index: true,
    },

    seekerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'seekerId is required'],
      index: true,
    },

    resumeUrl: {
      type: String,
      required: [true, 'resumeUrl is required'],
      trim: true,
    },

    formAnswers: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    status: {
      type: String,
      enum: {
        values: ['applied', 'reviewed', 'rejected'],
        message: 'Status must be applied, reviewed, or rejected',
      },
      default: 'applied',
    },

    appliedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    versionKey: false,
  }
);

// ── Compound unique index: a seeker may apply to a job only once ──────────
applicationSchema.index({ jobId: 1, seekerId: 1 }, { unique: true });

// ── Compound index for fast seeker/employer application queries ──────────
applicationSchema.index({ seekerId: 1, appliedAt: -1 });
applicationSchema.index({ jobId: 1, appliedAt: -1 });

module.exports = mongoose.model('Application', applicationSchema);
