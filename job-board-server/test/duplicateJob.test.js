'use strict';

/**
 * test/duplicateJob.test.js
 * ──────────────────────────
 * Integration test for near-duplicate job posting prevention via vector embedding similarity.
 * Uses mongodb-memory-server — no Atlas connection required.
 */

process.env.JWT_SECRET = 'duplicate_job_secret_111';
process.env.PORT       = '5092';
process.env.NODE_ENV   = 'test';

const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose  = require('mongoose');
const http      = require('http');
const express   = require('express');
const cors      = require('cors');

const routes       = require('../routes');
const errorHandler = require('../middleware/errorHandler');
const User         = require('../models/User');

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

let passed = 0, failed = 0;

const assert = (label, condition, got) => {
  if (condition) { console.log(`  ✅ ${label}`); passed++; }
  else           { console.error(`  ❌ ${label}${got !== undefined ? ` — got: ${JSON.stringify(got)}` : ''}`); failed++; }
};

let server, mongod;

(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());

  server = app.listen(PORT);
  await new Promise((r) => server.once('listening', r));
  console.log(`\n🧪 Duplicate Job Detection test suite running against port ${PORT}\n`);

  try {
    const emp1Reg = await request('POST', '/api/auth/register', {
      name: 'Emp One',
      email: 'emp1@test.com',
      password: 'Password99!',
      role: 'employer',
    });
    const emp1Token = emp1Reg.body.token;
    await User.findByIdAndUpdate(emp1Reg.body.user._id, { emailVerified: true });

    const emp2Reg = await request('POST', '/api/auth/register', {
      name: 'Emp Two',
      email: 'emp2@test.com',
      password: 'Password99!',
      role: 'employer',
    });
    const emp2Token = emp2Reg.body.token;
    await User.findByIdAndUpdate(emp2Reg.body.user._id, { emailVerified: true });

    const jobDescription = 'We are hiring a Senior React Developer to build scalable web user interfaces using TypeScript, Redux, and modern CSS.';

    console.log('📋 1. Post job description for the first time (201)');
    let firstJobId;
    {
      const res = await request('POST', '/api/jobs', {
        title: 'Senior React Developer',
        role: 'Frontend',
        location: 'London',
        description: jobDescription,
        jobType: 'full-time',
      }, emp1Token);

      assert('Status 201', res.status === 201, res.status);
      firstJobId = res.body.job._id;
    }

    console.log('\n📋 2. Post exact duplicate job description by same employer (409)');
    {
      const res = await request('POST', '/api/jobs', {
        title: 'Senior React Developer (Copy)',
        role: 'Frontend',
        location: 'London',
        description: jobDescription,
        jobType: 'full-time',
      }, emp1Token);

      assert('Status 409', res.status === 409, res.status);
      assert('Correct error message', res.body.message === 'Duplicate or near-duplicate job posting detected.', res.body.message);
    }

    console.log('\n📋 3. Post same job description by different employer (201)');
    {
      const res = await request('POST', '/api/jobs', {
        title: 'Senior React Developer',
        role: 'Frontend',
        location: 'London',
        description: jobDescription,
        jobType: 'full-time',
      }, emp2Token);

      assert('Status 201 for different employer', res.status === 201, res.status);
    }

    console.log('\n📋 4. Close first job and re-post same description (200 & 201)');
    {
      // Close the first job
      const closeRes = await request('PATCH', `/api/jobs/${firstJobId}/close`, null, emp1Token);
      assert('First job closed 200', closeRes.status === 200, closeRes.status);

      // Now re-posting should be allowed since previous job is closed
      const res = await request('POST', '/api/jobs', {
        title: 'Senior React Developer (Re-opened)',
        role: 'Frontend',
        location: 'London',
        description: jobDescription,
        jobType: 'full-time',
      }, emp1Token);

      assert('Status 201 after previous job was closed', res.status === 201, res.status);
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
