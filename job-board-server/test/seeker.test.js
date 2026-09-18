'use strict';

/**
 * test/seeker.test.js
 * ────────────────────
 * Integration smoke-test for seeker-facing job browsing and saved jobs.
 * Uses mongodb-memory-server — no Atlas connection required.
 *
 * Scenarios
 * ─────────
 *  1. GET /jobs returns open jobs and sanitizes employer fields (no employerId, hasApplications, __v)
 *  2. GET /jobs with query filters (?role=, ?location=, ?jobType=, ?experienceLevel=)
 *  3. GET /jobs/:id returns sanitized single open job
 *  4. Closed jobs are not listed in GET /jobs or GET /jobs/:id
 *  5. POST /jobs/:id/save (Seeker saves a job: 401 if no auth, 403 if employer, 201 if seeker)
 *  6. POST /jobs/:id/save duplicate save returns 409
 *  7. GET /seeker/saved-jobs returns list of saved jobs (sanitized)
 *  8. DELETE /jobs/:id/save removes saved job (200), then 404 on repeat
 */

process.env.JWT_SECRET = 'seeker_test_secret_xyz';
process.env.PORT       = '5097';
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
app.use((_req, res) => res.status(404).json({ success: false, message: 'Not found' }));
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

let passed = 0, failed = 0;

const assert = (label, condition, got) => {
  if (condition) { console.log(`  ✅ ${label}`); passed++; }
  else           { console.error(`  ❌ ${label}${got !== undefined ? ` — got: ${JSON.stringify(got)}` : ''}`); failed++; }
};

const User = require('../models/User');
const Job  = require('../models/Job');

const makeVerifiedEmployer = async (suffix = '') => {
  const regRes = await request('POST', '/api/auth/register', {
    name: `Employer${suffix}`,
    email: `emp${suffix}@corp.com`,
    password: 'Password99!',
    role: 'employer',
  });
  const token = regRes.body.token;
  const userId = regRes.body.user._id;

  await User.findByIdAndUpdate(userId, {
    emailVerified: true,
    $unset: { emailVerifyToken: '', emailVerifyExpires: '' },
  });

  return { token, userId };
};

const makeSeeker = async (suffix = '') => {
  const res = await request('POST', '/api/auth/register', {
    name: `Seeker${suffix}`,
    email: `seeker${suffix}@example.com`,
    password: 'Password99!',
    role: 'seeker',
  });
  return { token: res.body.token, userId: res.body.user._id };
};

let server, mongod;

(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());

  server = app.listen(PORT);
  await new Promise((r) => server.once('listening', r));
  console.log(`\n🧪 Seeker test suite running against port ${PORT}\n`);

  try {
    const { token: empToken } = await makeVerifiedEmployer('1');
    const { token: seekerToken } = await makeSeeker('1');

    // Create 3 jobs: 2 open, 1 closed
    const job1Res = await request('POST', '/api/jobs', {
      title: 'Frontend React Engineer',
      role: 'Frontend',
      location: 'London',
      description: 'React, Redux, Tailwind',
      salary: '£70k',
      jobType: 'full-time',
      experienceLevel: 'Mid',
    }, empToken);
    const job1Id = job1Res.body.job._id;

    const job2Res = await request('POST', '/api/jobs', {
      title: 'Backend Go Engineer',
      role: 'Backend',
      location: 'Remote',
      description: 'Go, Microservices, gRPC',
      salary: '$120k',
      jobType: 'remote',
      experienceLevel: 'Senior',
    }, empToken);
    const job2Id = job2Res.body.job._id;

    const job3Res = await request('POST', '/api/jobs', {
      title: 'Intern Designer',
      role: 'Design',
      location: 'London',
      description: 'UI/UX Design',
      jobType: 'internship',
    }, empToken);
    const job3Id = job3Res.body.job._id;

    // Close job3
    await request('PATCH', `/api/jobs/${job3Id}/close`, null, empToken);

    console.log('📋 1. GET /jobs returns open jobs and sanitizes employer fields');
    {
      const r = await request('GET', '/api/jobs');
      assert('Status 200', r.status === 200, r.status);
      assert('Contains 2 open jobs', r.body.count === 2, r.body.count);

      const sampleJob = r.body.jobs[0];
      assert('employerId is undefined', sampleJob.employerId === undefined, sampleJob.employerId);
      assert('hasApplications is undefined', sampleJob.hasApplications === undefined, sampleJob.hasApplications);
      assert('__v is undefined', sampleJob.__v === undefined, sampleJob.__v);
      assert('title is present', !!sampleJob.title, sampleJob.title);
    }

    console.log('\n📋 2. GET /jobs with query filters');
    {
      const rRole = await request('GET', '/api/jobs?role=frontend');
      assert('Role filter matches 1 job', rRole.body.count === 1 && rRole.body.jobs[0].title.includes('React'), rRole.body.count);

      const rType = await request('GET', '/api/jobs?jobType=remote');
      assert('jobType filter matches 1 job', rType.body.count === 1 && rType.body.jobs[0].title.includes('Go'), rType.body.count);

      const rExp = await request('GET', '/api/jobs?experienceLevel=Mid');
      assert('experienceLevel filter matches 1 job', rExp.body.count === 1, rExp.body.count);

      const rLoc = await request('GET', '/api/jobs?location=London');
      assert('Location filter matches 1 open job in London', rLoc.body.count === 1, rLoc.body.count);
    }

    console.log('\n📋 3. GET /jobs/:id returns sanitized single job');
    {
      const r = await request('GET', `/api/jobs/${job1Id}`);
      assert('Status 200', r.status === 200, r.status);
      assert('Correct job title', r.body.job.title === 'Frontend React Engineer', r.body.job.title);
      assert('No employerId', r.body.job.employerId === undefined, r.body.job.employerId);
      assert('No hasApplications', r.body.job.hasApplications === undefined, r.body.job.hasApplications);
    }

    console.log('\n📋 4. Closed jobs are not returned');
    {
      const r = await request('GET', `/api/jobs/${job3Id}`);
      assert('Status 404', r.status === 404, r.status);
    }

    console.log('\n📋 5. Save job (POST /jobs/:id/save)');
    {
      const rNoAuth = await request('POST', `/api/jobs/${job1Id}/save`);
      assert('Unauthenticated save fails 401', rNoAuth.status === 401, rNoAuth.status);

      const rEmp = await request('POST', `/api/jobs/${job1Id}/save`, null, empToken);
      assert('Employer save fails 403', rEmp.status === 403, rEmp.status);

      const rSeeker = await request('POST', `/api/jobs/${job1Id}/save`, null, seekerToken);
      assert('Seeker save succeeds 201', rSeeker.status === 201, rSeeker.status);
    }

    console.log('\n📋 6. Duplicate save returns 409');
    {
      const r = await request('POST', `/api/jobs/${job1Id}/save`, null, seekerToken);
      assert('Status 409', r.status === 409, r.status);
    }

    console.log('\n📋 7. GET /seeker/saved-jobs');
    {
      // Save job2 as well
      await request('POST', `/api/jobs/${job2Id}/save`, null, seekerToken);

      const r = await request('GET', '/api/seeker/saved-jobs', null, seekerToken);
      assert('Status 200', r.status === 200, r.status);
      assert('Contains 2 saved jobs', r.body.count === 2, r.body.count);

      const savedItem = r.body.jobs[0];
      assert('No employerId in saved job', savedItem.employerId === undefined, savedItem.employerId);
      assert('No hasApplications in saved job', savedItem.hasApplications === undefined, savedItem.hasApplications);
      assert('savedAt property exists', !!savedItem.savedAt, savedItem.savedAt);
    }

    console.log('\n📋 8. DELETE /jobs/:id/save');
    {
      const rDel = await request('DELETE', `/api/jobs/${job1Id}/save`, null, seekerToken);
      assert('Status 200', rDel.status === 200, rDel.status);

      const rCheck = await request('GET', '/api/seeker/saved-jobs', null, seekerToken);
      assert('Count updated to 1', rCheck.body.count === 1, rCheck.body.count);

      const rDelAgain = await request('DELETE', `/api/jobs/${job1Id}/save`, null, seekerToken);
      assert('Repeat delete returns 404', rDelAgain.status === 404, rDelAgain.status);
    }

  } finally {
    server.close();
    await mongoose.disconnect();
    await mongod.stop();

    console.log(`\n${'─'.repeat(52)}`);
    console.log(`Results: ${passed} passed, ${failed} failed`);
    console.log('─'.repeat(52));
    process.exit(failed > 0 ? 1 : 0);
  }
})();
