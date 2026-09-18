'use strict';

/**
 * test/dashboard.test.js
 * ───────────────────────
 * Integration test for Employer Dashboard & View Counting:
 *  - GET /api/employer/dashboard (employer sees viewCount, saveCount, applicantCount)
 *  - GET /api/jobs/:id view count increment and deduplication
 *  - Verification that saves and applications correctly update dashboard counts.
 * Uses mongodb-memory-server — no Atlas connection required.
 */

process.env.JWT_SECRET = 'dashboard_test_secret_888';
process.env.PORT       = '5095';
process.env.NODE_ENV   = 'test';

const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose  = require('mongoose');
const http      = require('http');
const express   = require('express');
const cors      = require('cors');

const routes       = require('../routes');
const errorHandler = require('../middleware/errorHandler');

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
  console.log(' STARTING EMPLOYER DASHBOARD TESTS');
  console.log('========================================\n');

  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());

  await new Promise((res) => { server = app.listen(PORT, res); });

  // 1. Setup Employer & Seeker accounts
  console.log('[1] Registering and verifying employer and seeker accounts...');
  const empReg = await request('POST', '/api/auth/register', {
    name: 'Dashboard Employer',
    email: 'employer@dashboard.com',
    password: 'Password123!',
    role: 'employer',
  });
  const empToken = empReg.body.token;

  // Mark employer email verified
  await mongoose.connection.db.collection('users').updateOne(
    { email: 'employer@dashboard.com' },
    { $set: { emailVerified: true } }
  );

  const seeker1Reg = await request('POST', '/api/auth/register', {
    name: 'Seeker One',
    email: 'seeker1@dashboard.com',
    password: 'Password123!',
    role: 'seeker',
  });
  const seeker1Token = seeker1Reg.body.token;

  const seeker2Reg = await request('POST', '/api/auth/register', {
    name: 'Seeker Two',
    email: 'seeker2@dashboard.com',
    password: 'Password123!',
    role: 'seeker',
  });
  const seeker2Token = seeker2Reg.body.token;

  // 2. Create Job
  console.log('[2] Employer creating a new job...');
  const createRes = await request('POST', '/api/jobs', {
    title: 'Senior Backend Engineer',
    role: 'Backend Engineer',
    location: 'Remote',
    description: 'We need a senior Node.js backend engineer with MongoDB experience.',
    jobType: 'full-time',
  }, empToken);
  assert(createRes.status === 201, 'Job created with status 201');
  const jobId = createRes.body.job._id;

  // 3. Initial Dashboard check
  console.log('[3] Fetching initial employer dashboard...');
  const dash1 = await request('GET', '/api/employer/dashboard', null, empToken);
  assert(dash1.status === 200, 'GET /employer/dashboard returns 200');
  assert(dash1.body.count === 1, 'Dashboard returns 1 job');
  const jobStats1 = dash1.body.jobs[0];
  assert(jobStats1.viewCount === 0, 'Initial viewCount is 0');
  assert(jobStats1.saveCount === 0, 'Initial saveCount is 0');
  assert(jobStats1.applicantCount === 0, 'Initial applicantCount is 0');

  // 4. View counting & deduplication
  console.log('[4] Testing job view counting and deduplication...');
  // Seeker 1 views job first time
  const view1 = await request('GET', `/api/jobs/${jobId}`, null, seeker1Token);
  assert(view1.status === 200, 'GET /jobs/:id returns 200');
  assert(view1.body.job.views === undefined, 'views array is hidden from seeker via sanitization');

  let dashCheck = await request('GET', '/api/employer/dashboard', null, empToken);
  assert(dashCheck.body.jobs[0].viewCount === 1, 'viewCount incremented to 1 after Seeker 1 view');

  // Seeker 1 views job second time (should be deduplicated)
  await request('GET', `/api/jobs/${jobId}`, null, seeker1Token);
  dashCheck = await request('GET', '/api/employer/dashboard', null, empToken);
  assert(dashCheck.body.jobs[0].viewCount === 1, 'viewCount stays 1 on repeat view by same seeker');

  // Seeker 2 views job
  await request('GET', `/api/jobs/${jobId}`, null, seeker2Token);
  dashCheck = await request('GET', '/api/employer/dashboard', null, empToken);
  assert(dashCheck.body.jobs[0].viewCount === 2, 'viewCount incremented to 2 after Seeker 2 view');

  // 5. Saving job
  console.log('[5] Testing job save count tracking...');
  const saveRes = await request('POST', `/api/jobs/${jobId}/save`, null, seeker1Token);
  assert(saveRes.status === 201, 'Seeker 1 saves job');

  dashCheck = await request('GET', '/api/employer/dashboard', null, empToken);
  assert(dashCheck.body.jobs[0].saveCount === 1, 'saveCount incremented to 1');

  // 6. Applying to job
  console.log('[6] Testing job applicant count tracking...');
  const applyRes = await request('POST', `/api/jobs/${jobId}/apply`, {
    resumeUrl: 'http://example.com/resume.pdf',
    formAnswers: { coverLetter: 'I love Node.js!' },
  }, seeker1Token);
  assert(applyRes.status === 201, 'Seeker 1 applies to job');

  dashCheck = await request('GET', '/api/employer/dashboard', null, empToken);
  assert(dashCheck.body.jobs[0].applicantCount === 1, 'applicantCount incremented to 1');

  // 7. Authorization checks
  console.log('[7] Testing access control for GET /api/employer/dashboard...');
  const seekerDash = await request('GET', '/api/employer/dashboard', null, seeker1Token);
  assert(seekerDash.status === 403, 'Seeker blocked with 403 from employer dashboard');

  const anonDash = await request('GET', '/api/employer/dashboard');
  assert(anonDash.status === 401, 'Unauthenticated user blocked with 401 from employer dashboard');

  console.log('\n========================================');
  console.log(' ALL EMPLOYER DASHBOARD TESTS PASSED!');
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
