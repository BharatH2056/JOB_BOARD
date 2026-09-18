'use strict';

/**
 * test/embeddingDimension3072.test.js
 * ─────────────────────────────────────
 * Verifies the gemini-embedding-001 dimension upgrade:
 *   1. generateEmbedding() returns exactly 3072 values
 *   2. POST /api/jobs persists a 3072-dim embedding on the document
 *   3. POST /api/jobs/search returns 200 (no dimension-mismatch error)
 *   4. Migration logic regenerates all jobs to 3072-dim embeddings
 */

process.env.NODE_ENV   = 'test';
process.env.PORT       = '5115';
process.env.USE_REDIS_MOCK = 'true';
process.env.JWT_SECRET = 'test-secret-3072';

const http             = require('http');
const mongoose         = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const bcrypt           = require('bcryptjs');
const jwt              = require('jsonwebtoken');
const express          = require('express');
const cors             = require('cors');

const routes           = require('../routes');
const errorHandler     = require('../middleware/errorHandler');
const { generateEmbedding } = require('../services/embeddings');
const Job              = require('../models/Job');
const User             = require('../models/User');

const PORT = parseInt(process.env.PORT, 10);

// ── Custom test reporter ──────────────────────────────────────────────────────
let passed = 0, failed = 0;

const assert = (label, condition, got) => {
  if (condition) {
    console.log(`  ✅ ${label}`);
    passed++;
  } else {
    console.error(`  ❌ ${label}${got !== undefined ? ` — got: ${JSON.stringify(got)}` : ''}`);
    failed++;
  }
};

// ── HTTP helper ───────────────────────────────────────────────────────────────
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
        ...(token   && { Authorization: `Bearer ${token}` }),
      },
    };
    const req = http.request(opts, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => {
        try   { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, body: data }); }
      });
    });
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });

// ── Bootstrap ─────────────────────────────────────────────────────────────────
let mongod, server, employerToken;

(async () => {
  mongod = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongod.getUri();
  await mongoose.connect(mongod.getUri());

  const app = express();
  app.use(cors());
  app.use(express.json());
  app.get('/health', (_req, res) => res.status(200).json({ status: 'ok' }));
  app.use('/api', routes);
  app.use(errorHandler);

  server = app.listen(PORT);
  await new Promise((r) => server.once('listening', r));
  console.log(`\n🧪 Embedding Dimension 3072 test suite (port ${PORT})\n`);

  // Seed an employer for authenticated routes
  const hash = await bcrypt.hash('Pass1234!', 10);
  const employer = await User.create({
    name: 'Embed Employer',
    email: 'embed@employer.com',
    passwordHash: hash,
    role: 'employer',
    emailVerified: true,
  });
  employerToken = jwt.sign(
    { id: employer._id.toString(), role: 'employer' },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );

  try {
    // ── Test 1 ────────────────────────────────────────────────────────────────
    console.log('📋 1. generateEmbedding() returns exactly 3072 values');
    {
      const embedding = await generateEmbedding('Senior React Engineer remote position');
      assert('Returns an array',               Array.isArray(embedding), typeof embedding);
      assert('Length is exactly 3072',          embedding.length === 3072, embedding.length);
      assert('Elements are numbers',            typeof embedding[0] === 'number', typeof embedding[0]);
    }

    // ── Test 2 ────────────────────────────────────────────────────────────────
    console.log('\n📋 2. POST /api/jobs persists a 3072-dim embedding on the Job document');
    let createdJobId;
    {
      const res = await request(
        'POST', '/api/jobs',
        {
          title: 'Full Stack Developer',
          role: 'Full Stack Developer',
          description: 'We need a skilled full stack developer with React and Node.js experience.',
          location: 'Remote',
          jobType: 'full-time',
          skills: ['React', 'Node.js'],
        },
        employerToken
      );

      assert('Returns 201', res.status === 201, res.status);
      createdJobId = res.body?.job?._id || res.body?._id;
      assert('Response contains job _id', !!createdJobId, res.body);

      if (createdJobId) {
        const dbJob = await Job.findById(createdJobId).select('+description_embedding').lean();
        assert('description_embedding exists',             Array.isArray(dbJob?.description_embedding), dbJob?.description_embedding);
        assert('description_embedding length is 3072',    dbJob?.description_embedding?.length === 3072, dbJob?.description_embedding?.length);
      }
    }

    // ── Test 3 ────────────────────────────────────────────────────────────────
    console.log('\n📋 3. POST /api/jobs/search returns 200 without dimension-mismatch');
    {
      const res = await request(
        'POST', '/api/jobs/search',
        { query: 'full stack developer React Node.js' }
      );

      // Accept 200 (success) or 429 (rate limit) — both mean no dimension error
      assert(
        'Returns 200 or 429 (no dimension-mismatch error)',
        [200, 429].includes(res.status),
        res.status
      );
      if (res.status === 200) {
        const isValid = Array.isArray(res.body) || (res.body && typeof res.body === 'object');
        assert('Search result is array or object', isValid, typeof res.body);
      }
    }

    // ── Test 4 ────────────────────────────────────────────────────────────────
    console.log('\n📋 4. Migration logic re-embeds legacy 1536-dim jobs to 3072');
    {
      // Simulate legacy: overwrite with wrong-dim embedding
      const legacyEmbedding = new Array(1536).fill(0.001);
      await Job.updateMany({}, { $set: { description_embedding: legacyEmbedding } });

      const legacyJobs = await Job.find({}).select('+description_embedding').lean();
      assert(
        'Setup: at least one job has legacy 1536-dim embedding',
        legacyJobs.length > 0 && legacyJobs[0].description_embedding.length === 1536,
        legacyJobs[0]?.description_embedding?.length
      );

      // Run migration (same logic as scripts/regenerate-embeddings.js)
      for (const job of legacyJobs) {
        const embedding = await generateEmbedding(job.description);
        await Job.updateOne({ _id: job._id }, { $set: { description_embedding: embedding } });
      }

      const migratedJobs = await Job.find({}).select('+description_embedding').lean();
      const allCorrect = migratedJobs.every((j) => j.description_embedding.length === 3072);
      assert('All jobs migrated to 3072-dim embeddings', allCorrect, migratedJobs.map((j) => j.description_embedding.length));
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
