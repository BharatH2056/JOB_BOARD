'use strict';

/**
 * models/Job.js
 * Mongoose schema for job listings.
 *
 * Fields
 * ──────
 *  employerId      – ref to User (employer who owns this listing)
 *  title           – job title
 *  role            – role/position label (e.g. "Frontend Engineer")
 *  location        – city / "Remote" / etc.
 *  description     – full job description (markdown-safe)
 *  salary          – optional salary string e.g. "£60k–£80k"
 *  jobType         – enum: full-time | part-time | internship | remote
 *  experienceLevel – e.g. "Junior", "Mid", "Senior", "Lead"
 *  status          – open | closed  (default open)
 *  hasApplications – flipped to true when first application arrives
 *  createdAt       – from timestamps:true
 */

const mongoose = require('mongoose');

const jobSchema = new mongoose.Schema(
  {
    employerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'employerId is required'],
      index: true,
    },

    title: {
      type: String,
      required: [true, 'Job title is required'],
      trim: true,
      maxlength: [150, 'Title must be 150 characters or fewer'],
    },

    role: {
      type: String,
      required: [true, 'Role is required'],
      trim: true,
      maxlength: [100, 'Role must be 100 characters or fewer'],
    },

    location: {
      type: String,
      required: [true, 'Location is required'],
      trim: true,
      maxlength: [150, 'Location must be 150 characters or fewer'],
    },

    description: {
      type: String,
      required: [true, 'Description is required'],
      trim: true,
      maxlength: [10000, 'Description must be 10 000 characters or fewer'],
    },

    salary: {
      type: String,
      trim: true,
      maxlength: [100, 'Salary string must be 100 characters or fewer'],
      default: null,
    },

    jobType: {
      type: String,
      enum: {
        values: ['full-time', 'part-time', 'internship', 'remote'],
        message: 'jobType must be full-time, part-time, internship, or remote',
      },
      required: [true, 'jobType is required'],
    },

    experienceLevel: {
      type: String,
      trim: true,
      maxlength: [50, 'experienceLevel must be 50 characters or fewer'],
      default: null,
    },

    status: {
      type: String,
      enum: {
        values: ['open', 'closed'],
        message: 'status must be open or closed',
      },
      default: 'open',
    },

    hasApplications: {
      type: Boolean,
      default: false,
    },

    description_embedding: {
      type: [Number],
      default: undefined,
      select: false,
    },

    skills_required: {
      type: [String],
      default: [],
    },

    views: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true, // createdAt + updatedAt managed by Mongoose
  }
);

// ── Compound index: listing employer's jobs is the hottest query ───────────
jobSchema.index({ employerId: 1, createdAt: -1 });

// ── Strip __v from JSON responses ─────────────────────────────────────────
jobSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.__v;
  return obj;
};

module.exports = mongoose.model('Job', jobSchema);
