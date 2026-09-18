'use strict';

/**
 * test/embeddings.test.js
 * ────────────────────────
 * Test suite for vector embedding generation and persistence on Job create and update.
 * Uses mongodb-memory-server — no Atlas connection required.
 */

process.env.JWT_SECRET = 'embeddings_test_secret_123';
process.env.PORT       = '5096';
process.env.NODE_ENV   = 'test';

const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose  = require('mongoose');
const http      = require('http');
const express   = require('express');
const cors      = require('cors');

const routes       = require('../routes');
const errorHandler = require('../middleware/errorHandler');
const { generateEmbedding } = require('../services/embeddings');
const Job          = require('../models/Job');
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
  console.log(`\n🧪 Embeddings test suite running against port ${PORT}\n`);

  try {
    console.log('📋 1. generateEmbedding standalone service test');
    {
      const embedding = await generateEmbedding('Backend Node.js developer wanted');
      assert('Embedding is an array', Array.isArray(embedding), typeof embedding);
      assert('Embedding length > 0', embedding.length > 0, embedding.length);
      assert('Elements are numbers', typeof embedding[0] === 'number', typeof embedding[0]);
    }

    console.log('\n📋 2. Automatic embedding generation on POST /jobs');
    let empToken, jobId, originalEmbedding;
    {
      const regRes = await request('POST', '/api/auth/register', {
        name: 'Tech Recruiter',
        email: 'recruiter@tech.com',
        password: 'Password99!',
        role: 'employer',
      });
      empToken = regRes.body.token;

      await User.findByIdAndUpdate(regRes.body.user._id, { emailVerified: true });

      const createRes = await request('POST', '/api/jobs', {
        title: 'Senior AI Engineer',
        role: 'AI/ML',
        location: 'San Francisco, CA',
        description: 'Building LLM pipelines with RAG and vector embeddings.',
        jobType: 'full-time',
      }, empToken);

      assert('Job created 201', createRes.status === 201, createRes.status);
      jobId = createRes.body.job._id;

      // Query database directly to inspect description_embedding
      const dbJob = await Job.findById(jobId).select('+description_embedding');
      assert('description_embedding exists in DB', Array.isArray(dbJob.description_embedding), dbJob.description_embedding);
      assert('description_embedding is non-empty', dbJob.description_embedding.length > 0, dbJob.description_embedding?.length);
      originalEmbedding = dbJob.description_embedding;
    }

    console.log('\n📋 3. Embedding regeneration on PUT /jobs/:id (description update)');
    {
      const updateRes = await request('PUT', `/api/jobs/${jobId}`, {
        description: 'Updated description focusing on PyTorch, Transformers, and MLOps.',
      }, empToken);

      assert('Job updated 200', updateRes.status === 200, updateRes.status);

      const updatedDbJob = await Job.findById(jobId).select('+description_embedding');
      assert('New embedding generated', Array.isArray(updatedDbJob.description_embedding), updatedDbJob.description_embedding);
      assert('Embedding updated for new description',
        JSON.stringify(updatedDbJob.description_embedding) !== JSON.stringify(originalEmbedding),
        'Embedding did not change'
      );
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
