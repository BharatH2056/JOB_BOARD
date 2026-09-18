'use strict';

/**
 * services/mailer.service.js
 * ───────────────────────────
 * Nodemailer wrapper service for sending job digest emails.
 * Uses a mock/stream transport and outputs formatted log digests to console.log.
 */

const nodemailer = require('nodemailer');

// Create a transport (using jsonTransport so Nodemailer formats the message structure)
const transporter = nodemailer.createTransport({
  jsonTransport: true,
});

/**
 * Send a job digest email to a seeker.
 *
 * @param {string} toEmail      – recipient seeker email address
 * @param {string} seekerName   – seeker display name
 * @param {Object[]} matchedJobs – array of job documents matching the seeker criteria
 * @param {string} searchQuery  – the query or skill set matched against
 * @returns {Promise<Object>}   – Nodemailer send result
 */
const sendDigestEmail = async (toEmail, seekerName, matchedJobs, searchQuery) => {
  const jobListText = matchedJobs
    .map((j, idx) => `${idx + 1}. ${j.title} (${j.role}) - ${j.location} [${j.jobType}]`)
    .join('\n');

  const subject = `Daily Job Digest: ${matchedJobs.length} new jobs matching "${searchQuery}"`;
  const textContent = `Hello ${seekerName},\n\n` +
    `Here are your daily new job matches for query/skills "${searchQuery}" posted in the last 24 hours:\n\n` +
    `${jobListText}\n\n` +
    `Best regards,\nYour Job Board Team`;

  const mailOptions = {
    from: '"Job Board Alerts" <no-reply@jobboard.com>',
    to: toEmail,
    subject,
    text: textContent,
  };

  const info = await transporter.sendMail(mailOptions);

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`📧  [NODEMAILER DIGEST EMAIL]`);
  console.log(`    To: ${toEmail}`);
  console.log(`    Subject: ${subject}`);
  console.log(`    Query / Skills: ${searchQuery}`);
  console.log(`    Matches Count: ${matchedJobs.length}`);
  console.log(`    Content:\n${textContent}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  return info;
};

module.exports = {
  transporter,
  sendDigestEmail,
};
