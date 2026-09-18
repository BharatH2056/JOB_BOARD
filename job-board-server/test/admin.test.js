'use strict';

/**
 * test/admin.test.js
 * ───────────────────
 * Integration test for:
 *  - Rate limiting (express-rate-limit) on AI endpoints: max 20 requests per 15 min.
 *  - Redis search caching and invalidation on job creation.
 *  - Admin / Moderator routes: GET /admin/jobs, DELETE /admin/jobs/:id, GET /admin/users, PATCH /admin/users/:id/ban.
 *  - Access control: Banned user restriction (403 Banned).
 * Uses mongodb-memory-server — no Atlas or external Redis required.
 */

process.env.JWT_SECRET     = 'admin_test_secret_1010';
process.env.PORT           = '5100';
process.env.NODE_ENV       = 'test';
process.env.USE_REDIS_MOCK = 'true';

const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose  = require('mongoose');
const http      = require('http');
const express   = require('express');
const cors      = require('cors');

const routes       = require('../routes');
const errorHandler = require('../middleware/errorHandler');
const User         = require('../models/User');
const Job          = require('../models/Job');
const { getSearchCache, redisClient } = require('../services/cache.service');

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
  console.log(' STARTING ADMIN, REDIS & RATE-LIMIT TESTS');
  console.log('========================================\n');

  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());

  await new Promise((res) => { server = app.listen(PORT, res); });

  // 1. Setup Admin, Employer, and Seeker
  console.log('[1] Setting up Admin, Employer, and Seeker accounts...');
  const empReg = await request('POST', '/api/auth/register', {
    name: 'Admin Test Employer',
    email: 'employer@admin.com',
    password: 'Password123!',
    role: 'employer',
  });
  const empToken = empReg.body.token;
  await User.updateOne({ email: 'employer@admin.com' }, { emailVerified: true });

  const adminDoc = await User.create({
    name: 'Super Admin',
    email: 'admin@platform.com',
    passwordHash: 'dummyhash',
    role: 'admin',
    emailVerified: true,
  });

  const jwt = require('jsonwebtoken');
  const adminToken = jwt.sign({ id: adminDoc._id, role: 'admin' }, process.env.JWT_SECRET);

  const seekerReg = await request('POST', '/api/auth/register', {
    name: 'Normal Seeker',
    email: 'seeker@admin.com',
    password: 'Password123!',
    role: 'seeker',
  });
  const seekerToken = seekerReg.body.token;
  const seekerId = seekerReg.body.user._id;

  // 2. Create Job
  const createJobRes = await request('POST', '/api/jobs', {
    title: 'Cloud DevOps Architect',
    role: 'DevOps Engineer',
    location: 'Remote',
    description: 'We need AWS Terraform Kubernetes DevOps experience.',
    jobType: 'full-time',
  }, empToken);
  assert(createJobRes.status === 201, 'Job created');
  const jobId = createJobRes.body.job._id;

  // 3. Redis Caching & Invalidation Test
  console.log('[3] Testing Redis caching and invalidation...');
  const search1 = await request('POST', '/api/jobs/search', { query: 'DevOps' }, seekerToken);
  assert(search1.status === 200, 'Search 1 returns 200');

  const cached1 = await getSearchCache('DevOps');
  assert(cached1 !== null && cached1.length > 0, 'Redis search cache populated for "DevOps"');

  // Register Employer 2 to post second job without employer-specific duplicate conflict
  const emp2Reg = await request('POST', '/api/auth/register', {
    name: 'Second Employer',
    email: 'employer2@admin.com',
    password: 'Password123!',
    role: 'employer',
  });
  const emp2Token = emp2Reg.body.token;
  await User.updateOne({ email: 'employer2@admin.com' }, { emailVerified: true });

  // Create another job to trigger cache invalidation
  const createJob2Res = await request('POST', '/api/jobs', {
    title: 'Kubernetes Specialist',
    role: 'DevOps Engineer',
    location: 'Remote',
    description: 'Kubernetes cluster management and helm chart deployment.',
    jobType: 'full-time',
  }, emp2Token);
  assert(createJob2Res.status === 201, 'Employer 2 created second job');

  const cached2 = await getSearchCache('DevOps');
  assert(cached2 === null, 'Redis search cache invalidated on new job creation');

  // 4. Admin Routes Test
  console.log('[4] Testing Admin / Moderator endpoints...');
  const adminJobs = await request('GET', '/api/admin/jobs', null, adminToken);
  assert(adminJobs.status === 200, 'GET /admin/jobs returns 200 for admin');
  assert(adminJobs.body.count >= 2, 'GET /admin/jobs lists all jobs');

  const seekerAdminAccess = await request('GET', '/api/admin/jobs', null, seekerToken);
  assert(seekerAdminAccess.status === 403, 'Seeker blocked from GET /admin/jobs with 403');

  const adminUsers = await request('GET', '/api/admin/users', null, adminToken);
  assert(adminUsers.status === 200, 'GET /admin/users returns 200');
  assert(adminUsers.body.count >= 3, 'GET /admin/users lists all registered users');

  // Admin ban user
  const banRes = await request('PATCH', `/api/admin/users/${seekerId}/ban`, { isBanned: true }, adminToken);
  assert(banRes.status === 200, 'PATCH /admin/users/:id/ban returns 200');
  assert(banRes.body.user.isBanned === true, 'User isBanned updated to true');

  // Banned seeker attempt to access protected endpoint
  const bannedAttempt = await request('GET', '/api/seeker/saved-jobs', null, seekerToken);
  assert(bannedAttempt.status === 403, 'Banned seeker blocked with 403');

  // Admin delete job
  const delJobRes = await request('DELETE', `/api/admin/jobs/${jobId}`, null, adminToken);
  assert(delJobRes.status === 200, 'DELETE /admin/jobs/:id returns 200 for admin');

  // 5. Rate Limiter Test (max 20 requests)
  console.log('[5] Testing rate limiting on AI endpoints...');
  let lastStatus = 200;
  for (let i = 0; i < 22; i++) {
    const res = await request('POST', '/api/jobs/search', { query: `Test query ${i}` }, empToken);
    lastStatus = res.status;
    if (res.status === 429) {
      break;
    }
  }
  assert(lastStatus === 429, 'Rate limiter triggers 429 after exceeding limit');

  console.log('\n========================================');
  console.log(' ALL ADMIN & RATE LIMIT TESTS PASSED!');
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
    if (redisClient) await redisClient.quit();
    if (mongod) await mongod.stop();
  });
