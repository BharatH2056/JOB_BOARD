'use strict';

/**
 * test/skillGap.test.js
 * ──────────────────────
 * Integration test for seeker profile updates and skill-gap analysis against jobs.
 * Uses mongodb-memory-server — no Atlas connection required.
 */

process.env.JWT_SECRET = 'skill_gap_secret_999';
process.env.PORT       = '5093';
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
  console.log(`\n🧪 Skill Gap & Seeker Profile test suite running against port ${PORT}\n`);

  try {
    // Register employer and seeker
    const empReg = await request('POST', '/api/auth/register', {
      name: 'Acme Hiring Manager',
      email: 'hiring@acme.com',
      password: 'Password99!',
      role: 'employer',
    });
    const empToken = empReg.body.token;
    await User.findByIdAndUpdate(empReg.body.user._id, { emailVerified: true });

    const seekerReg = await request('POST', '/api/auth/register', {
      name: 'Dave Dev',
      email: 'dave@seeker.com',
      password: 'Password99!',
      role: 'seeker',
    });
    const seekerToken = seekerReg.body.token;

    console.log('📋 1. PUT /api/seeker/profile updates seeker skills, bio, resumeUrl');
    {
      const res = await request('PUT', '/api/seeker/profile', {
        skills: ['React', 'TypeScript', 'Node.js'],
        bio: 'Fullstack developer with 4 years experience building web apps.',
        resumeUrl: 'https://example.com/resumes/dave-dev.pdf',
      }, seekerToken);

      assert('Status 200', res.status === 200, res.status);
      assert('User object returned', !!res.body.user, res.body.user);
      assert('skills set', res.body.user.skills.length === 3, res.body.user.skills);
      assert('bio set', res.body.user.bio.includes('Fullstack'), res.body.user.bio);
      assert('resumeUrl set', res.body.user.resumeUrl === 'https://example.com/resumes/dave-dev.pdf', res.body.user.resumeUrl);
    }

    console.log('\n📋 2. Profile update access control (Employer blocked 403, No token 401)');
    {
      const resEmp = await request('PUT', '/api/seeker/profile', { bio: 'Hacker' }, empToken);
      assert('Employer blocked 403', resEmp.status === 403, resEmp.status);

      const resAnon = await request('PUT', '/api/seeker/profile', { bio: 'Hacker' });
      assert('No token blocked 401', resAnon.status === 401, resAnon.status);
    }

    console.log('\n📋 3. Employer creates job with skills_required set');
    let jobId;
    {
      const jobRes = await request('POST', '/api/jobs', {
        title: 'Fullstack React & Python Engineer',
        role: 'Fullstack',
        location: 'Remote',
        description: 'Building web frontend in React and backend services in Python, Docker, and TypeScript.',
        jobType: 'remote',
      }, empToken);

      assert('Job created 201', jobRes.status === 201, jobRes.status);
      jobId = jobRes.body.job._id;
      assert('skills_required generated', jobRes.body.job.skills_required.length > 0, jobRes.body.job.skills_required);
    }

    console.log('\n📋 4. GET /api/jobs/:id/skill-gap returns matching and missing skills');
    {
      const gapRes = await request('GET', `/api/jobs/${jobId}/skill-gap`, null, seekerToken);

      assert('Status 200', gapRes.status === 200, gapRes.status);
      assert('matchingSkills present', Array.isArray(gapRes.body.matchingSkills), gapRes.body.matchingSkills);
      assert('missingSkills present', Array.isArray(gapRes.body.missingSkills), gapRes.body.missingSkills);

      // Dave has ['React', 'TypeScript', 'Node.js']
      // Job requires ['React', 'TypeScript', 'Python', 'Docker']
      assert('React is matching', gapRes.body.matchingSkills.includes('React'), gapRes.body.matchingSkills);
      assert('TypeScript is matching', gapRes.body.matchingSkills.includes('TypeScript'), gapRes.body.matchingSkills);
      assert('Python is missing', gapRes.body.missingSkills.includes('Python'), gapRes.body.missingSkills);
      assert('Docker is missing', gapRes.body.missingSkills.includes('Docker'), gapRes.body.missingSkills);
    }

    console.log('\n📋 5. Skill gap access control (Employer blocked 403)');
    {
      const empGap = await request('GET', `/api/jobs/${jobId}/skill-gap`, null, empToken);
      assert('Employer blocked from skill-gap 403', empGap.status === 403, empGap.status);
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
