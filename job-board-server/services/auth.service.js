'use strict';

/**
 * services/auth.service.js
 * Pure business-logic for authentication — no Express req/res here.
 *
 * Responsibilities
 * ────────────────
 *  registerUser    – validate uniqueness, hash password, persist user
 *  loginUser       – verify credentials, issue JWT
 *  verifyEmail     – validate token, mark emailVerified = true
 *  generateToken   – (internal) sign JWT
 *  sendVerificationEmail – (mock) console.log the verification link
 */

const crypto     = require('crypto');
const bcrypt     = require('bcryptjs');
const jwt        = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const { OAuth2Client } = require('google-auth-library');
const User       = require('../models/User');

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// ─── Constants ────────────────────────────────────────────────────────────
const BCRYPT_ROUNDS      = 12;
const JWT_EXPIRES_IN     = '7d';
const VERIFY_TOKEN_TTL_H = 24; // hours

// ─── Helpers ──────────────────────────────────────────────────────────────

/**
 * Sign a JWT containing { id, role }.
 * @param {Object} user  – Mongoose User document
 * @returns {string}     – signed JWT
 */
const generateToken = (user) =>
  jwt.sign(
    { id: user._id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );

/**
 * Sends a verification email to newly registered employers.
 * Uses nodemailer with Gmail SMTP if EMAIL_USER and EMAIL_APP_PASSWORD are set,
 * while keeping the console.log for debug / fallback.
 *
 * @param {string} email
 * @param {string} token  – raw hex verification token
 */
const sendVerificationEmail = async (email, token) => {
  const baseUrl = process.env.CLIENT_URL || 'http://localhost:5173';
  const link    = `${baseUrl}/verify-email?token=${token}`;

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`📧  [EMAIL] To: ${email}`);
  console.log(`    Subject: Verify your Job Board account`);
  console.log(`    Verification link (expires in ${VERIFY_TOKEN_TTL_H}h):`);
  console.log(`    ${link}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  if (process.env.EMAIL_USER && process.env.EMAIL_APP_PASSWORD) {
    try {
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_APP_PASSWORD,
        },
      });

      const mailOptions = {
        from: `"Job Board" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: 'Verify your Job Board account',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background-color: #16181D; color: #E5E7EB; border-radius: 8px; border: 1px solid rgba(255,255,255,0.1);">
            <h2 style="color: #ffffff; margin-bottom: 16px;">Verify Your Employer Account</h2>
            <p style="color: #9CA3AF; line-height: 1.6; margin-bottom: 24px;">
              Thank you for registering on Job Board. Please click the button below to verify your email address and activate your job-posting permissions:
            </p>
            <div style="margin-bottom: 24px;">
              <a href="${link}" style="background-color: #6366F1; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">
                Verify Email Address
              </a>
            </div>
            <p style="color: #6B7280; font-size: 12px; line-height: 1.5;">
              This link expires in ${VERIFY_TOKEN_TTL_H} hours.<br/>
              If the button above does not work, copy and paste this link into your browser:<br/>
              <a href="${link}" style="color: #818CF8;">${link}</a>
            </p>
          </div>
        `,
      };

      await transporter.sendMail(mailOptions);
      console.log(`✅ Verification email successfully sent to ${email}`);
    } catch (err) {
      console.error(`❌ Failed to send verification email to ${email}:`, err.message);
    }
  }
};

// ─── Service methods ──────────────────────────────────────────────────────

/**
 * Register a new user.
 *
 * Rules
 * ─────
 *  - Seekers   → emailVerified = true  (no verification needed)
 *  - Employers → emailVerified = false, verification email is mocked
 *
 * @param {{ name, email, password, role }} data
 * @returns {{ user, token }}
 */
const registerUser = async ({ name, email, password, role }) => {
  // 1. Check uniqueness
  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) {
    const err = new Error('An account with this email already exists');
    err.statusCode = 409;
    throw err;
  }

  // 2. Hash password
  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

  // 3. Build user document
  const userData = {
    name,
    email,
    passwordHash,
    role,
    emailVerified: role === 'seeker', // seekers are auto-verified
  };

  // 4. For employers: generate verification token
  let rawToken;
  if (role === 'employer') {
    rawToken = crypto.randomBytes(32).toString('hex');
    userData.emailVerifyToken   = rawToken;
    userData.emailVerifyExpires = new Date(
      Date.now() + VERIFY_TOKEN_TTL_H * 60 * 60 * 1000
    );
  }

  // 5. Persist
  const user = await User.create(userData);

  // 6. Send verification email for employers
  if (role === 'employer') {
    await sendVerificationEmail(user.email, rawToken);
  }

  // 7. Issue JWT
  const token = generateToken(user);

  return { user, token };
};

/**
 * Log in an existing user.
 *
 * @param {{ email, password }} credentials
 * @returns {{ user, token }}
 */
const loginUser = async ({ email, password }) => {
  // 1. Find user — explicitly select passwordHash (excluded by default)
  const user = await User.findOne({ email: email.toLowerCase() }).select(
    '+passwordHash'
  );

  if (!user) {
    const err = new Error('Invalid email or password');
    err.statusCode = 401;
    throw err;
  }

  // 2. Compare password
  const isMatch = await bcrypt.compare(password, user.passwordHash);
  if (!isMatch) {
    const err = new Error('Invalid email or password');
    err.statusCode = 401;
    throw err;
  }

  // 3. Issue JWT
  const token = generateToken(user);

  return { user, token };
};

/**
 * Verify a user's email using the token from the verification link.
 *
 * @param {string} token  – raw hex token from query string
 * @returns {Object}      – updated user document
 */
const verifyEmail = async (token) => {
  if (!token) {
    const err = new Error('Verification token is required');
    err.statusCode = 400;
    throw err;
  }

  // Find user with matching, non-expired token
  const user = await User.findOne({
    emailVerifyToken:   token,
    emailVerifyExpires: { $gt: new Date() },
  }).select('+emailVerifyToken +emailVerifyExpires');

  if (!user) {
    const err = new Error('Token is invalid or has expired');
    err.statusCode = 400;
    throw err;
  }

  // Mark verified and clear the token
  user.emailVerified      = true;
  user.emailVerifyToken   = undefined;
  user.emailVerifyExpires = undefined;
  await user.save();

  return user;
};

/**
 * Authenticate or register a user with a Google ID token.
 *
 * @param {{ credential, role }} params
 * @returns {{ user, token }}
 */
const googleAuth = async ({ credential, role }) => {
  let payload;
  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    payload = ticket.getPayload();
  } catch (error) {
    const err = new Error(error.message || 'Invalid Google credential');
    err.statusCode = 401;
    throw err;
  }

  if (!payload || !payload.email_verified) {
    const err = new Error('Google account email is not verified');
    err.statusCode = 400;
    throw err;
  }

  const email = payload.email.toLowerCase();
  let user = await User.findOne({ email });

  if (user) {
    const token = generateToken(user);
    return { user, token };
  }

  user = await User.create({
    name: payload.name || email.split('@')[0],
    email,
    role: role || 'seeker',
    authProvider: 'google',
    emailVerified: true,
  });

  const token = generateToken(user);
  return { user, token };
};

module.exports = { registerUser, loginUser, verifyEmail, googleAuth };
