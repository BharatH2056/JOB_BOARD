'use strict';

/**
 * test/vectorSearch.test.js
 * ──────────────────────────
 * Integration test for vector search route (POST /api/jobs/search).
 * Tests ranking quality, sanitization, score inclusion, and LLM match explanations.
 */

process.env.JWT_SECRET = 'vector_search_secret_456';
process.env.PORT       = '5095';
process.env.NODE_ENV   = 'test';

const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose  = require('mongoose');
const http      = require('http');
const express   = require('express');
const cors      = require('cors');

const routes          = require('../routes');
const errorHandler    = require('../middleware/errorHandler');
const User            = require('../models/User');
const { explainJobMatch } = require('../services/llm');

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
  console.log(`\n🧪 Vector Search test suite running against port ${PORT}\n`);

  try {
    const regRes = await request('POST', '/api/auth/register', {
      name: 'Global Recruiter',
      email: 'recruiter@global.com',
      password: 'Password99!',
      role: 'employer',
    });
    const empToken = regRes.body.token;
    await User.findByIdAndUpdate(regRes.body.user._id, { emailVerified: true });

    // Seed 3 distinct jobs
    await request('POST', '/api/jobs', {
      title: 'Senior Frontend Developer',
      role: 'Frontend',
      location: 'London',
      description: 'Expert in React, TypeScript, Redux, and modern CSS layout frameworks for web applications.',
      jobType: 'full-time',
    }, empToken);

    await request('POST', '/api/jobs', {
      title: 'Data Scientist & ML Engineer',
      role: 'Data Science',
      location: 'Remote',
      description: 'Building machine learning models, PyTorch neural networks, data pipelines, and predictive AI.',
      jobType: 'remote',
    }, empToken);

    await request('POST', '/api/jobs', {
      title: 'DevOps & Cloud Engineer',
      role: 'DevOps',
      location: 'New York',
      description: 'Kubernetes, Terraform, AWS infrastructure automation, CI/CD pipelines, and Docker containers.',
      jobType: 'full-time',
    }, empToken);

    console.log('📋 1. Search missing query field returns 400');
    {
      const res = await request('POST', '/api/jobs/search', {});
      assert('Status 400', res.status === 400, res.status);
    }

    console.log('\n📋 2. Search query for Frontend React Developer');
    {
      const res = await request('POST', '/api/jobs/search', {
        query: 'React TypeScript web frontend components',
      });

      assert('Status 200', res.status === 200, res.status);
      assert('Returns 3 jobs', res.body.count === 3, res.body.count);

      const topResult = res.body.jobs[0];
      assert('Top result is Frontend', topResult.title.includes('Frontend'), topResult.title);
      assert('Score field is present', typeof topResult.score === 'number', topResult.score);
      assert('matchExplanation is present', typeof topResult.matchExplanation === 'string' && topResult.matchExplanation.length > 0, topResult.matchExplanation);
      assert('employerId is absent', topResult.employerId === undefined, topResult.employerId);
      assert('hasApplications is absent', topResult.hasApplications === undefined, topResult.hasApplications);
    }

    console.log('\n📋 3. Search query for Data Science ML');
    {
      const res = await request('POST', '/api/jobs/search', {
        query: 'machine learning neural networks predictive AI model',
      });

      assert('Status 200', res.status === 200, res.status);
      const topResult = res.body.jobs[0];
      assert('Top result is Data Scientist', topResult.title.includes('Data Scientist'), topResult.title);
      assert('Score is present', typeof topResult.score === 'number', topResult.score);
      assert('matchExplanation is present', typeof topResult.matchExplanation === 'string', topResult.matchExplanation);
    }

    console.log('\n📋 4. Verify score ordering and LLM explanation sentence length');
    {
      const res = await request('POST', '/api/jobs/search', {
        query: 'Kubernetes Terraform Cloud Infrastructure Docker',
      });

      assert('Status 200', res.status === 200, res.status);
      assert('Top result is DevOps', res.body.jobs[0].title.includes('DevOps'), res.body.jobs[0].title);

      const scores = res.body.jobs.map(j => j.score);
      let sorted = true;
      for (let i = 0; i < scores.length - 1; i++) {
        if (scores[i] < scores[i + 1]) sorted = false;
      }
      assert('Results are sorted by score descending', sorted, scores);

      // Verify each explanation is under 2 sentences
      const explanations = res.body.jobs.map(j => j.matchExplanation);
      let concise = true;
      for (const exp of explanations) {
        const sentenceCount = exp.split(/[.!?]+/).filter(s => s.trim().length > 0).length;
        if (sentenceCount > 2) concise = false;
      }
      assert('All matchExplanations are under 2 sentences', concise, explanations[0]);
    }

    console.log('\n📋 5. Standalone LLM service test');
    {
      const explanation = await explainJobMatch({
        query: 'React Engineer',
        description: 'Building interactive user interfaces using React and Redux.',
      });
      assert('returns string', typeof explanation === 'string', typeof explanation);
      const sentences = explanation.split(/[.!?]+/).filter(s => s.trim().length > 0).length;
      assert('under 2 sentences', sentences <= 2, sentences);
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
