'use strict';

/**
 * test/uploadAndEmbeddingFix.test.js
 * ────────────────────────────────────
 * Verification test for:
 *  1. Multipart form-data resume upload:
 *     - File persisted to ./uploads/resumes
 *     - resumeUrl in application formatted as uploads/resumes/<filename>
 *     - Resume file retrievable via GET /uploads/resumes/<filename>
 *  2. Form-only application (no file upload):
 *     - Functionality unaffected when passing resumeUrl string
 *  3. Response payload bloat fix (description_embedding):
 *     - description_embedding excluded by default on GET /employer/jobs and GET /employer/dashboard
 *     - Duplicate detection on job creation still functions correctly using .select('+description_embedding')
 */

process.env.JWT_SECRET = 'upload_fix_test_secret_1212';
process.env.PORT       = '5110';
process.env.NODE_ENV   = 'test';

const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');
const http     = require('http');
const express  = require('express');
const cors     = require('cors');
const fs       = require('fs');
const path     = require('path');

const routes       = require('../routes');
const errorHandler = require('../middleware/errorHandler');
const User         = require('../models/User');
const Job          = require('../models/Job');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
app.get('/health', (_req, res) => res.status(200).json({ status: 'ok' }));
app.use('/api', routes);
app.use(errorHandler);

const PORT = parseInt(process.env.PORT, 10);

const request = (method, path, body, token, isRaw = false, headers = {}) =>
  new Promise((resolve, reject) => {
    let payload = body;
    let contentHeaders = {};

    if (!isRaw) {
      payload = body ? JSON.stringify(body) : undefined;
      contentHeaders = {
        'Content-Type': 'application/json',
        ...(payload && { 'Content-Length': Buffer.byteLength(payload) }),
      };
    }

    const opts = {
      hostname: 'localhost',
      port: PORT,
      path,
      method,
      headers: {
        ...contentHeaders,
        ...headers,
        ...(token && { Authorization: `Bearer ${token}` }),
      },
    };

    const req = http.request(opts, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data), headers: res.headers }); }
        catch { resolve({ status: res.statusCode, body: data, headers: res.headers }); }
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
  console.log(' STARTING UPLOAD & EMBEDDING FIX TESTS');
  console.log('========================================\n');

  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());

  await new Promise((res) => { server = app.listen(PORT, res); });

  // 1. Setup Accounts
  console.log('[1] Setting up Employer & Seeker accounts...');
  const empReg = await request('POST', '/api/auth/register', {
    name: 'Upload Employer',
    email: 'employer@uploadfix.com',
    password: 'Password123!',
    role: 'employer',
  });
  const empToken = empReg.body.token;
  await User.updateOne({ email: 'employer@uploadfix.com' }, { emailVerified: true });

  const seekerReg = await request('POST', '/api/auth/register', {
    name: 'Upload Seeker',
    email: 'seeker@uploadfix.com',
    password: 'Password123!',
    role: 'seeker',
  });
  const seekerToken = seekerReg.body.token;

  // 2. Create Job
  const createJobRes = await request('POST', '/api/jobs', {
    title: 'Senior Systems Architect',
    role: 'Systems Architect',
    location: 'Remote',
    description: 'Lead systems architecture design with Rust and C++.',
    jobType: 'full-time',
  }, empToken);
  assert(createJobRes.status === 201, 'Job created');
  const jobId = createJobRes.body.job._id;

  // 3. Test Response Payload Bloat Fix (description_embedding)
  console.log('[3] Testing description_embedding response exclusion...');
  const employerJobs = await request('GET', '/api/employer/jobs', null, empToken);
  assert(employerJobs.status === 200, 'GET /employer/jobs returns 200');
  const fetchedJob = employerJobs.body.jobs[0];
  assert(fetchedJob.description_embedding === undefined, 'description_embedding is excluded from GET /employer/jobs response');

  const employerDash = await request('GET', '/api/employer/dashboard', null, empToken);
  assert(employerDash.status === 200, 'GET /employer/dashboard returns 200');
  const dashJob = employerDash.body.jobs[0];
  assert(dashJob.description_embedding === undefined, 'description_embedding is excluded from GET /employer/dashboard response');

  // Test duplicate job creation detection using .select('+description_embedding')
  const dupRes = await request('POST', '/api/jobs', {
    title: 'Senior Systems Architect',
    role: 'Systems Architect',
    location: 'Remote',
    description: 'Lead systems architecture design with Rust and C++.',
    jobType: 'full-time',
  }, empToken);
  assert(dupRes.status === 409, 'Duplicate job detection returns 409 using .select("+description_embedding")');

  // 4. Test Multipart Resume File Upload & Disk Persistence
  console.log('[4] Testing multipart resume file upload & disk persistence...');
  const boundary = '--------------------------' + Date.now().toString(16);
  const fileContent = 'PDF Dummy Resume Content for Testing Persistence';
  const fileName = 'my_sample_resume.pdf';

  const bodyBuffer = Buffer.concat([
    Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="resume"; filename="${fileName}"\r\nContent-Type: application/pdf\r\n\r\n`),
    Buffer.from(fileContent),
    Buffer.from(`\r\n--${boundary}\r\nContent-Disposition: form-data; name="formAnswers"\r\n\r\n{"coverLetter":"Here is my file resume"}\r\n--${boundary}--\r\n`),
  ]);

  const applyRes = await request(
    'POST',
    `/api/jobs/${jobId}/apply`,
    bodyBuffer,
    seekerToken,
    true, // isRaw
    {
      'Content-Type': `multipart/form-data; boundary=${boundary}`,
      'Content-Length': bodyBuffer.length,
    }
  );

  assert(applyRes.status === 201, 'POST /jobs/:id/apply with file upload returns 201');
  const savedResumeUrl = applyRes.body.application.resumeUrl;
  assert(savedResumeUrl && savedResumeUrl.startsWith('uploads/resumes/'), `resumeUrl stored as disk path: ${savedResumeUrl}`);
  assert(!savedResumeUrl.endsWith(fileName), `resumeUrl uses unique filename, not raw originalname (${savedResumeUrl})`);

  // Verify file exists on disk
  const diskPath = path.join(__dirname, '..', savedResumeUrl);
  assert(fs.existsSync(diskPath), `File exists on disk at ${diskPath}`);
  const diskContent = fs.readFileSync(diskPath, 'utf8');
  assert(diskContent === fileContent, 'Persisted file content matches uploaded content');

  // Verify file retrievable via static URL route
  const getStaticRes = await request('GET', `/${savedResumeUrl}`, null, null, true);
  assert(getStaticRes.status === 200, `Static route GET /${savedResumeUrl} returns 200`);
  assert(getStaticRes.body === fileContent, 'Static file retrieval content matches uploaded file');

  // 5. Test Form-only application (no file upload)
  console.log('[5] Testing form-only application (string resumeUrl)...');
  const seeker2Reg = await request('POST', '/api/auth/register', {
    name: 'Form Seeker',
    email: 'formseeker@uploadfix.com',
    password: 'Password123!',
    role: 'seeker',
  });
  const seeker2Token = seeker2Reg.body.token;

  const formApplyRes = await request(
    'POST',
    `/api/jobs/${jobId}/apply`,
    {
      resumeUrl: 'https://external-site.com/seeker_resume.pdf',
      formAnswers: { note: 'Using external URL' },
    },
    seeker2Token
  );

  assert(formApplyRes.status === 201, 'Form-only apply with JSON resumeUrl returns 201');
  assert(formApplyRes.body.application.resumeUrl === 'https://external-site.com/seeker_resume.pdf', 'External resumeUrl string preserved unaffected');

  console.log('\n========================================');
  console.log(' ALL UPLOAD & EMBEDDING FIX TESTS PASSED!');
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
    if (mongod) await mongod.stop();
  });
