'use strict';

/**
 * test/application.test.js
 * ─────────────────────────
 * Integration test for Job Applications:
 *  - POST /api/jobs/:id/apply (seeker applies, flips hasApplications = true)
 *  - GET /api/seeker/applications (seeker views own applications)
 *  - GET /api/employer/jobs/:id/applications (employer views applicant identities)
 *  - PATCH /api/employer/applications/:id/status (employer updates status)
 *  - Verification that status updates are reflected in GET /api/seeker/applications.
 * Uses mongodb-memory-server — no Atlas connection required.
 */

process.env.JWT_SECRET = 'application_test_secret_777';
process.env.PORT       = '5090';
process.env.NODE_ENV   = 'test';

const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose  = require('mongoose');
const http      = require('http');
const express   = require('express');
const cors      = require('cors');

const routes       = require('../routes');
const errorHandler = require('../middleware/errorHandler');
const User         = require('../models/User');
const Job          = require('../models/Job');

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
  console.log(`\n🧪 Application test suite running against port ${PORT}\n`);

  try {
    // 1. Create Employer A
    const emp1Reg = await request('POST', '/api/auth/register', {
      name: 'Employer A Corp',
      email: 'emp1@corp.com',
      password: 'Password99!',
      role: 'employer',
    });
    const emp1Token = emp1Reg.body.token;
    await User.findByIdAndUpdate(emp1Reg.body.user._id, { emailVerified: true });

    // 2. Create Employer B
    const emp2Reg = await request('POST', '/api/auth/register', {
      name: 'Employer B Inc',
      email: 'emp2@corp.com',
      password: 'Password99!',
      role: 'employer',
    });
    const emp2Token = emp2Reg.body.token;
    await User.findByIdAndUpdate(emp2Reg.body.user._id, { emailVerified: true });

    // 3. Create Seeker
    const seekerReg = await request('POST', '/api/auth/register', {
      name: 'Alice Candidate',
      email: 'alice@seeker.com',
      password: 'Password99!',
      role: 'seeker',
    });
    const seekerToken = seekerReg.body.token;

    // Update Alice's seeker profile
    await request('PUT', '/api/seeker/profile', {
      skills: ['React', 'TypeScript', 'Node.js'],
      bio: 'Experienced frontend engineer',
      resumeUrl: 'https://example.com/resumes/alice.pdf',
    }, seekerToken);

    // 4. Employer A posts a job
    const jobRes = await request('POST', '/api/jobs', {
      title: 'Fullstack Engineer Role',
      role: 'Fullstack',
      location: 'London',
      description: 'Building React and Node.js applications in a collaborative environment.',
      jobType: 'full-time',
    }, emp1Token);

    const jobId = jobRes.body.job._id;

    console.log('📋 1. Seeker applies to job (POST /jobs/:id/apply)');
    let applicationId;
    {
      const res = await request('POST', `/api/jobs/${jobId}/apply`, {
        resumeUrl: 'https://example.com/resumes/alice.pdf',
        formAnswers: { yearsExperience: '5', portfolioUrl: 'https://alice.dev' },
      }, seekerToken);

      assert('Status 201', res.status === 201, res.status);
      assert('Application returned', !!res.body.application, res.body.application);
      assert('Status is "applied"', res.body.application.status === 'applied', res.body.application.status);
      applicationId = res.body.application._id;

      // Verify Job.hasApplications flipped to true in DB
      const dbJob = await Job.findById(jobId);
      assert('Job.hasApplications flipped to true', dbJob.hasApplications === true, dbJob.hasApplications);
    }

    console.log('\n📋 2. Edit/Delete locks active on Job after application');
    {
      const editRes = await request('PUT', `/api/jobs/${jobId}`, { title: 'New Title' }, emp1Token);
      assert('Edit blocked 403', editRes.status === 403, editRes.status);

      const delRes = await request('DELETE', `/api/jobs/${jobId}`, null, emp1Token);
      assert('Delete blocked 403', delRes.status === 403, delRes.status);
    }

    console.log('\n📋 3. Duplicate application returns 409');
    {
      const res = await request('POST', `/api/jobs/${jobId}/apply`, {
        resumeUrl: 'https://example.com/resumes/alice.pdf',
      }, seekerToken);

      assert('Status 409', res.status === 409, res.status);
    }

    console.log('\n📋 4. Seeker views own applications (GET /seeker/applications)');
    {
      const res = await request('GET', '/api/seeker/applications', null, seekerToken);

      assert('Status 200', res.status === 200, res.status);
      assert('Count is 1', res.body.count === 1, res.body.count);

      const app = res.body.applications[0];
      assert('Contains sanitized job details', !!app.job && app.job.title === 'Fullstack Engineer Role', app.job);
      assert('Job employerId is stripped', app.job.employerId === undefined, app.job.employerId);
      assert('Status is "applied"', app.status === 'applied', app.status);
    }

    console.log('\n📋 5. Employer views applicants (GET /employer/jobs/:id/applications)');
    {
      const resEmp1 = await request('GET', `/api/employer/jobs/${jobId}/applications`, null, emp1Token);

      assert('Status 200 for owner', resEmp1.status === 200, resEmp1.status);
      assert('Count is 1', resEmp1.body.count === 1, resEmp1.body.count);

      const applicant = resEmp1.body.applications[0].applicant;
      assert('Applicant identity present (name)', applicant.name === 'Alice Candidate', applicant.name);
      assert('Applicant email present', applicant.email === 'alice@seeker.com', applicant.email);
      assert('Applicant skills present', applicant.skills.includes('React'), applicant.skills);

      // Employer B access check
      const resEmp2 = await request('GET', `/api/employer/jobs/${jobId}/applications`, null, emp2Token);
      assert('Employer B blocked 403', resEmp2.status === 403, resEmp2.status);
    }

    console.log('\n📋 6. Employer updates application status (PATCH /employer/applications/:id/status)');
    {
      // Update to 'reviewed'
      const resRev = await request('PATCH', `/api/employer/applications/${applicationId}/status`, {
        status: 'reviewed',
      }, emp1Token);

      assert('Status 200 for status update', resRev.status === 200, resRev.status);
      assert('Status changed to reviewed', resRev.body.application.status === 'reviewed', resRev.body.application.status);

      // Update to 'rejected'
      const resRej = await request('PATCH', `/api/employer/applications/${applicationId}/status`, {
        status: 'rejected',
      }, emp1Token);

      assert('Status changed to rejected', resRej.body.application.status === 'rejected', resRej.body.application.status);

      // Employer B attempt to update status
      const resEmp2Update = await request('PATCH', `/api/employer/applications/${applicationId}/status`, {
        status: 'applied',
      }, emp2Token);
      assert('Employer B blocked 403', resEmp2Update.status === 403, resEmp2Update.status);
    }

    console.log('\n📋 7. Seeker verifies status update via GET /seeker/applications');
    {
      const res = await request('GET', '/api/seeker/applications', null, seekerToken);

      assert('Status 200', res.status === 200, res.status);
      const app = res.body.applications[0];
      assert('Updated status is visible to seeker as "rejected"', app.status === 'rejected', app.status);
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
