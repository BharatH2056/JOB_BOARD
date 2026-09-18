'use strict';

/**
 * models/User.js
 * Mongoose schema for platform users.
 *
 * Fields
 * ──────
 *  name           – display name
 *  email          – unique, lowercased
 *  passwordHash   – bcrypt hash, never returned in API responses
 *  role           – "employer" | "seeker"
 *  emailVerified  – false by default; employers must verify before posting jobs
 *  emailVerifyToken      – opaque token sent in the verification link
 *  emailVerifyExpires    – token TTL (24 h)
 */

const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: [100, 'Name must be 100 characters or fewer'],
    },

    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address'],
    },

    passwordHash: {
      type: String,
      required: true,
      select: false, // never included in query results by default
    },

    role: {
      type: String,
      enum: {
        values: ['employer', 'seeker', 'admin'],
        message: 'Role must be "employer", "seeker", or "admin"',
      },
      required: [true, 'Role is required'],
    },

    emailVerified: {
      type: Boolean,
      default: false,
    },

    isBanned: {
      type: Boolean,
      default: false,
    },

    // ── Seeker profile fields ──────────────────────────────────────────────────
    skills: {
      type: [String],
      default: [],
    },

    bio: {
      type: String,
      trim: true,
      maxlength: [1000, 'Bio must be 1000 characters or fewer'],
      default: '',
    },

    resumeUrl: {
      type: String,
      trim: true,
      default: null,
    },

    lastSearchQuery: {
      type: String,
      trim: true,
      default: null,
    },

    savedSearches: {
      type: [String],
      default: [],
    },

    // ── Email verification ─────────────────────────────────────────────────────
    emailVerifyToken: {
      type: String,
      select: false, // never returned in API responses
    },

    emailVerifyExpires: {
      type: Date,
      select: false,
    },
  },
  {
    timestamps: true, // adds createdAt / updatedAt
  }
);

// ── Omit sensitive fields from JSON serialisation ──────────────────────────
userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.passwordHash;
  delete obj.emailVerifyToken;
  delete obj.emailVerifyExpires;
  delete obj.__v;
  return obj;
};

module.exports = mongoose.model('User', userSchema);
