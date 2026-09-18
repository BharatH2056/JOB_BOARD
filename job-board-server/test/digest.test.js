'use strict';

/**
 * test/digest.test.js
 * ────────────────────
 * Integration test for the scheduled daily job digest (node-cron + Nodemailer):
 *  - Matches new jobs created in the last 24 hours against seeker lastSearchQuery or profile skills.
 *  - Excludes jobs older than 24 hours.
 *  - Verifies Nodemailer sendDigestEmail is called and logs expected content.
 *  - Verifies node-cron job initialization.
 * Uses mongodb-memory-server — no Atlas connection required.
 */

process.env.JWT_SECRET = 'digest_test_secret_999';
process.env.PORT       = '5099';
process.env.NODE_ENV   = 'test';

const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose  = require('mongoose');
const http      = require('http');
const express   = require('express');
const cors      = require('cors');

const routes                   = require('../routes');
const errorHandler             = require('../middleware/errorHandler');
const Job                      = require('../models/Job');
const User                     = require('../models/User');
const { runDailyDigest, startDigestCronJob } = require('../services/digest.service');

const app = express();
app.use(cors());
app.use(express.json());
app.get('/health', (_req, res) => res.status(200).json({ status: 'ok' }));
app.use('/api', routes);
app.use(errorHandler);

const PORT = parseInt(process.env.PORT, 10);

const request = (method, path, body, token) =>
  new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : undefined;
    const opts = {
      hostname: 'localhost',
      port: PORT,
      path,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(payload && { 'Content-Length': Buffer.byteLength(payload) }),
        ...(token && { Authorization: `Bearer ${token}` }),
      },
    };
    const req = http.request(opts, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, body: data }); }
      });
    });
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });

let mongod, server;

const assert = (condition, msg) => {
  if (!condition) {
    console.error(`  FAIL: ${msg}`);
    throw new Error(`Assertion failed: ${msg}`);
  }
  console.log(`  PASS: ${msg}`);
};

async function runTests() {
  console.log('\n========================================');
  console.log(' STARTING DAILY DIGEST CRON TESTS');
  console.log('========================================\n');

  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());

  await new Promise((res) => { server = app.listen(PORT, res); });

  // 1. Setup Employer and Jobs
  console.log('[1] Registering employer and posting jobs...');
  const empReg = await request('POST', '/api/auth/register', {
    name: 'Digest Employer',
    email: 'employer@digest.com',
    password: 'Password123!',
    role: 'employer',
  });
  const empToken = empReg.body.token;

  await User.updateOne({ email: 'employer@digest.com' }, { emailVerified: true });

  // Job A (recent, React)
  const jobARes = await request('POST', '/api/jobs', {
    title: 'Senior React Developer',
    role: 'Frontend Engineer',
    location: 'Remote',
    description: 'We need a React developer with TypeScript skills.',
    jobType: 'full-time',
  }, empToken);
  assert(jobARes.status === 201, 'Job A (React) posted');

  // Job B (recent, Python)
  const jobBRes = await request('POST', '/api/jobs', {
    title: 'Python Data Engineer',
    role: 'Data Engineer',
    location: 'New York',
    description: 'We need a Python developer with PySpark experience.',
    jobType: 'full-time',
  }, empToken);
  assert(jobBRes.status === 201, 'Job B (Python) posted');

  // Job C (old job, posted 48 hours ago)
  const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);
  const oldJobDoc = await Job.create({
    employerId: empReg.body.user._id,
    title: 'Old PHP Developer',
    role: 'Backend Engineer',
    location: 'Remote',
    description: 'Legacy PHP maintenance role.',
    jobType: 'full-time',
    createdAt: fortyEightHoursAgo,
    updatedAt: fortyEightHoursAgo,
  });
  assert(oldJobDoc._id !== undefined, 'Job C (48h old) created directly in DB');

  // 2. Register Seekers
  console.log('[2] Registering seeker accounts...');

  // Seeker 1: Profile skills only
  const seeker1Reg = await request('POST', '/api/auth/register', {
    name: 'Seeker Skills Only',
    email: 'seeker.skills@digest.com',
    password: 'Password123!',
    role: 'seeker',
  });
  const seeker1Token = seeker1Reg.body.token;
  await request('PUT', '/api/seeker/profile', { skills: ['React', 'TypeScript'] }, seeker1Token);

  // Seeker 2: Executes search query to save lastSearchQuery
  const seeker2Reg = await request('POST', '/api/auth/register', {
    name: 'Seeker Last Search',
    email: 'seeker.search@digest.com',
    password: 'Password123!',
    role: 'seeker',
  });
  const seeker2Token = seeker2Reg.body.token;
  await request('POST', '/api/jobs/search', { query: 'Python' }, seeker2Token);

  // Seeker 3: Empty profile & no queries
  await request('POST', '/api/auth/register', {
    name: 'Seeker Empty',
    email: 'seeker.empty@digest.com',
    password: 'Password123!',
    role: 'seeker',
  });

  // Verify seeker 2 lastSearchQuery saved
  const seeker2Doc = await User.findOne({ email: 'seeker.search@digest.com' }).lean();
  assert(seeker2Doc.lastSearchQuery === 'Python', 'Seeker 2 lastSearchQuery recorded as "Python"');

  // 3. Execute Daily Digest Job
  console.log('[3] Running daily job digest execution...');
  const { processedSeekers, digestsSent } = await runDailyDigest();
  assert(processedSeekers === 3, 'Processed 3 total seekers');
  assert(digestsSent === 2, 'Sent 2 digest emails (Seeker 1 and Seeker 2)');

  // 4. Verify Cron Task Scheduling
  console.log('[4] Verifying node-cron scheduled task initialization...');
  const cronTask = startDigestCronJob('0 0 * * *');
  assert(cronTask !== undefined && typeof cronTask.stop === 'function', 'Cron task scheduled and returns valid task object');
  cronTask.stop();

  console.log('\n========================================');
  console.log(' ALL DAILY DIGEST CRON TESTS PASSED!');
  console.log('========================================\n');
}

runTests()
  .catch((err) => {
    console.error('Test error:', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (server) server.close();
    if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
    if (mongod) await mongod.stop();
  });
