'use strict';

/**
 * models/SavedJob.js
 * ───────────────────
 * Tracks which jobs a seeker has saved ("bookmarked").
 *
 * Fields
 * ──────
 *  seekerId  – ref to User (the seeker)
 *  jobId     – ref to Job
 *  savedAt   – timestamp of when the save occurred (default: now)
 *
 * Constraints
 * ───────────
 *  Unique compound index on (seekerId, jobId) prevents duplicate saves.
 *  TTL or soft-delete: jobs that are deleted cascade — handled at the
 *  service layer via population (returns null for deleted jobs).
 */

const mongoose = require('mongoose');

const savedJobSchema = new mongoose.Schema(
  {
    seekerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'seekerId is required'],
    },

    jobId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Job',
      required: [true, 'jobId is required'],
    },

    savedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    // No timestamps: true — savedAt covers it; keeps the document minimal.
    versionKey: false,
  }
);

// ── Unique constraint: a seeker may save a job only once ──────────────────
savedJobSchema.index({ seekerId: 1, jobId: 1 }, { unique: true });

// ── Index for fast listing of a seeker's saved jobs ───────────────────────
savedJobSchema.index({ seekerId: 1, savedAt: -1 });

module.exports = mongoose.model('SavedJob', savedJobSchema);
