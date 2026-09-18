'use strict';

/**
 * test/metadata.test.js
 * ──────────────────────
 * Integration test for LLM metadata extraction (skills_required & auto-filled experienceLevel).
 * Verifies safe JSON parsing, try/catch fallbacks, and DB persistence on job create/edit.
 */

process.env.JWT_SECRET = 'metadata_test_secret_789';
process.env.PORT       = '5094';
process.env.NODE_ENV   = 'test';

const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose  = require('mongoose');
const http      = require('http');
const express   = require('express');
const cors      = require('cors');

const routes               = require('../routes');
const errorHandler         = require('../middleware/errorHandler');
const { extractJobMetadata, safeParseMetadata } = require('../services/llm');
const Job                  = require('../models/Job');
const User                 = require('../models/User');

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
  console.log(`\n🧪 Metadata Extraction test suite running against port ${PORT}\n`);

  try {
    console.log('📋 1. safeParseMetadata helper handles valid, code-fenced, and malformed JSON');
    {
      const valid = safeParseMetadata('{"skills": ["React", "TypeScript"], "experienceLevel": "senior"}');
      assert('Valid JSON parsed', valid.skills.length === 2 && valid.experienceLevel === 'Senior', valid);

      const fenced = safeParseMetadata('```json\n{"skills": ["Python", "PyTorch"], "experienceLevel": "mid"}\n```');
      assert('Code-fenced JSON parsed', fenced.skills.includes('PyTorch') && fenced.experienceLevel === 'Mid', fenced);

      const malformed = safeParseMetadata('NOT VALID JSON AT ALL {{{');
      assert('Malformed JSON triggers fallback without erroring', Array.isArray(malformed.skills) && malformed.skills.length === 0, malformed);
    }

    console.log('\n📋 2. extractJobMetadata service returns skills and experience level');
    {
      const metadata = await extractJobMetadata('Looking for a Senior Developer with expertise in React, TypeScript, and Node.js');
      assert('Skills extracted', metadata.skills.includes('React') && metadata.skills.includes('TypeScript'), metadata.skills);
      assert('Experience level detected', metadata.experienceLevel === 'Senior', metadata.experienceLevel);
    }

    console.log('\n📋 3. POST /jobs auto-fills experienceLevel and populates skills_required');
    let empToken, jobId;
    {
      const regRes = await request('POST', '/api/auth/register', {
        name: 'Metadata Recruiter',
        email: 'meta@corp.com',
        password: 'Password99!',
        role: 'employer',
      });
      empToken = regRes.body.token;
      await User.findByIdAndUpdate(regRes.body.user._id, { emailVerified: true });

      // Omit experienceLevel in POST body
      const createRes = await request('POST', '/api/jobs', {
        title: 'Backend Engineer',
        role: 'Backend',
        location: 'London',
        description: 'Seeking a Senior engineer skilled in Python, Docker, and Kubernetes.',
        jobType: 'full-time',
      }, empToken);

      assert('Job created 201', createRes.status === 201, createRes.status);
      jobId = createRes.body.job._id;

      const dbJob = await Job.findById(jobId);
      assert('skills_required populated in DB', dbJob.skills_required.includes('Python') && dbJob.skills_required.includes('Docker'), dbJob.skills_required);
      assert('experienceLevel auto-filled in DB', dbJob.experienceLevel === 'Senior', dbJob.experienceLevel);
    }

    console.log('\n📋 4. PUT /jobs/:id updates skills_required on description edit');
    {
      const updateRes = await request('PUT', `/api/jobs/${jobId}`, {
        description: 'Updated role for a Junior Developer focused on React and TypeScript.',
      }, empToken);

      assert('Job updated 200', updateRes.status === 200, updateRes.status);

      const updatedDbJob = await Job.findById(jobId);
      assert('Updated skills_required includes React', updatedDbJob.skills_required.includes('React'), updatedDbJob.skills_required);
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
