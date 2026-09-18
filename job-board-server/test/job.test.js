'use strict';

/**
 * test/job.test.js
 * ─────────────────
 * Integration smoke-test for all job-listing routes.
 * Uses mongodb-memory-server — no Atlas connection required.
 *
 * Scenarios
 * ─────────
 *  1.  Unverified employer blocked from creating job (403)
 *  2.  Seeker blocked from creating job (403)
 *  3.  No token → 401
 *  4.  Verified employer creates job (201)
 *  5.  Missing required fields → 400
 *  6.  Verified employer edits own job (200)
 *  7.  Edit with hasApplications=true → 403
 *  8.  Delete with hasApplications=true → 403
 *  9.  Close (PATCH /close) with hasApplications=true → 200 ✅ always allowed
 * 10.  Second close on already-closed job → 409
 * 11.  Different employer cannot edit another's job (403)
 * 12.  GET /employer/jobs returns only own jobs
 * 13.  Hard-delete a job (no applications) → 200, then 404
 */

// ── Env setup ───────────────────────────────────────────────────────────────
process.env.JWT_SECRET = 'job_test_secret_xyz';
process.env.PORT       = '5098';
process.env.NODE_ENV   = 'test';

const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose  = require('mongoose');
const http      = require('http');
const express   = require('express');
const cors      = require('cors');

const routes       = require('../routes');
const errorHandler = require('../middleware/errorHandler');

// ── Build minimal app ────────────────────────────────────────────────────────
const app = express();
app.use(cors());
app.use(express.json());
app.get('/health', (_req, res) => res.status(200).json({ status: 'ok' }));
app.use('/api', routes);
app.use((_req, res) => res.status(404).json({ success: false, message: 'Not found' }));
app.use(errorHandler);

// ── HTTP helper ──────────────────────────────────────────────────────────────
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

// ── Assertion helper ─────────────────────────────────────────────────────────
let passed = 0, failed = 0;

const assert = (label, condition, got) => {
  if (condition) { console.log(`  ✅ ${label}`); passed++; }
  else           { console.error(`  ❌ ${label}${got !== undefined ? ` — got: ${JSON.stringify(got)}` : ''}`); failed++; }
};

// ── Setup helpers ─────────────────────────────────────────────────────────────
const Job  = require('../models/Job');
const User = require('../models/User');

/** Register + auto-verify an employer in one step (bypasses email flow). */
const makeVerifiedEmployer = async (suffix = '') => {
  const regRes = await request('POST', '/api/auth/register', {
    name: `Employer${suffix}`,
    email: `employer${suffix}@acme.com`,
    password: 'Password99!',
    role: 'employer',
  });
  const token = regRes.body.token;
  const userId = regRes.body.user._id;

  // Directly flip emailVerified in DB (mirrors real email-verify flow)
  await User.findByIdAndUpdate(userId, {
    emailVerified: true,
    $unset: { emailVerifyToken: '', emailVerifyExpires: '' },
  });

  return { token, userId };
};

/** Register a seeker. */
const makeSeeker = async () => {
  const res = await request('POST', '/api/auth/register', {
    name: 'Alice Seeker',
    email: 'seeker@example.com',
    password: 'Password99!',
    role: 'seeker',
  });
  return res.body.token;
};

/** Valid job payload. */
const validJob = () => ({
  title: 'Senior Node.js Engineer',
  role: 'Backend Engineer',
  location: 'London, UK',
  description: 'Build scalable APIs using Node.js and MongoDB.',
  salary: '£80k–£100k',
  jobType: 'full-time',
  experienceLevel: 'Senior',
});

// ── Test runner ───────────────────────────────────────────────────────────────
let server, mongod;

(async () => {
  // Start in-memory MongoDB
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());

  // Start HTTP server
  server = app.listen(PORT);
  await new Promise((r) => server.once('listening', r));
  console.log(`\n🧪 Job test suite running against port ${PORT}\n`);

  try {
    // ── Fixture setup ──────────────────────────────────────────────────────
    const { token: empToken, userId: empId } = await makeVerifiedEmployer('A');
    const { token: emp2Token }               = await makeVerifiedEmployer('B');
    const seekerToken                        = await makeSeeker();

    // Unverified employer (register only, no DB flip)
    const unverifiedRes = await request('POST', '/api/auth/register', {
      name: 'Unverified Corp',
      email: 'unverified@corp.com',
      password: 'Password99!',
      role: 'employer',
    });
    const unverifiedToken = unverifiedRes.body.token;

    // ────────────────────────────────────────────────────────────────────────
    console.log('📋 1. Unverified employer blocked (403)');
    {
      const r = await request('POST', '/api/jobs', validJob(), unverifiedToken);
      assert('Status 403', r.status === 403, r.status);
      assert('emailVerified message', r.body.message.includes('verify'), r.body.message);
    }

    console.log('\n📋 2. Seeker blocked from job creation (403)');
    {
      const r = await request('POST', '/api/jobs', validJob(), seekerToken);
      assert('Status 403', r.status === 403, r.status);
    }

    console.log('\n📋 3. No token → 401');
    {
      const r = await request('POST', '/api/jobs', validJob());
      assert('Status 401', r.status === 401, r.status);
    }

    console.log('\n📋 4. Verified employer creates job (201)');
    let jobId;
    {
      const r = await request('POST', '/api/jobs', validJob(), empToken);
      assert('Status 201',        r.status === 201, r.status);
      assert('job.title correct', r.body.job.title === 'Senior Node.js Engineer', r.body.job.title);
      assert('status = open',     r.body.job.status === 'open', r.body.job.status);
      assert('hasApplications = false', r.body.job.hasApplications === false, r.body.job.hasApplications);
      assert('employerId present', !!r.body.job.employerId, r.body.job.employerId);
      jobId = r.body.job._id;
    }

    console.log('\n📋 5. Missing required fields → 400');
    {
      const r = await request('POST', '/api/jobs', { title: 'Only Title' }, empToken);
      assert('Status 400', r.status === 400, r.status);
    }

    console.log('\n📋 6. Edit own job before applications (200)');
    {
      const r = await request('PUT', `/api/jobs/${jobId}`, { title: 'Lead Node.js Engineer' }, empToken);
      assert('Status 200',           r.status === 200, r.status);
      assert('title updated',        r.body.job.title === 'Lead Node.js Engineer', r.body.job.title);
    }

    console.log('\n📋 7. Edit blocked when hasApplications = true (403)');
    {
      // Directly flip hasApplications in DB (simulates first application arriving)
      await Job.findByIdAndUpdate(jobId, { hasApplications: true });

      const r = await request('PUT', `/api/jobs/${jobId}`, { title: 'Should Fail' }, empToken);
      assert('Status 403',     r.status === 403, r.status);
      assert('Correct message', r.body.message.includes('applications'), r.body.message);
    }

    console.log('\n📋 8. Delete blocked when hasApplications = true (403)');
    {
      const r = await request('DELETE', `/api/jobs/${jobId}`, null, empToken);
      assert('Status 403', r.status === 403, r.status);
    }

    console.log('\n📋 9. Close (PATCH /close) allowed even with hasApplications (200)');
    {
      const r = await request('PATCH', `/api/jobs/${jobId}/close`, null, empToken);
      assert('Status 200',       r.status === 200, r.status);
      assert('status = closed',  r.body.job.status === 'closed', r.body.job.status);
    }

    console.log('\n📋 10. Closing already-closed job → 409');
    {
      const r = await request('PATCH', `/api/jobs/${jobId}/close`, null, empToken);
      assert('Status 409', r.status === 409, r.status);
    }

    console.log('\n📋 11. Employer B cannot edit Employer A\'s job (403)');
    {
      const r = await request('PUT', `/api/jobs/${jobId}`, { title: 'Steal This Job' }, emp2Token);
      // hasApplications is true so we'd get 403 for either reason; verify ownership check also fires
      // Create a fresh job with no applications for Employer A, then test Employer B
      const freshRes = await request('POST', '/api/jobs', {
        ...validJob(),
        title: 'Employer A Only',
      }, empToken);
      const freshId = freshRes.body.job._id;

      const r2 = await request('PUT', `/api/jobs/${freshId}`, { title: 'Hijack' }, emp2Token);
      assert('Status 403', r2.status === 403, r2.status);
      assert('Permission message', r2.body.message.includes('permission'), r2.body.message);
    }

    console.log('\n📋 12. GET /employer/jobs returns only own jobs');
    {
      // Create a second job for Employer A
      await request('POST', '/api/jobs', { ...validJob(), title: 'Job #2 by A' }, empToken);
      // Create a job for Employer B
      await request('POST', '/api/jobs', { ...validJob(), title: 'Job by B' }, emp2Token);

      const r = await request('GET', '/api/employer/jobs', null, empToken);
      assert('Status 200',               r.status === 200, r.status);
      assert('count ≥ 2',                r.body.count >= 2, r.body.count);
      assert('No Employer B jobs',
        r.body.jobs.every(j => j.employerId._id === empId || j.employerId === empId),
        r.body.jobs.map(j => j.title)
      );
      assert('employerId populated (name present)',
        r.body.jobs.every(j => j.employerId && j.employerId.name),
        r.body.jobs[0]?.employerId
      );
    }

    console.log('\n📋 13. Hard-delete job with no applications → 200, then 404');
    {
      const freshRes = await request('POST', '/api/jobs', {
        ...validJob(), title: 'Delete Me',
      }, empToken);
      const delId = freshRes.body.job._id;

      const delRes = await request('DELETE', `/api/jobs/${delId}`, null, empToken);
      assert('Status 200',    delRes.status === 200, delRes.status);

      // Verify it's actually gone
      const gone = await Job.findById(delId);
      assert('Job removed from DB', gone === null, gone);
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
