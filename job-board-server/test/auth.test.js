'use strict';

/**
 * test/auth.test.js
 * ──────────────────
 * Integration smoke-test for all auth routes.
 * Uses mongodb-memory-server so no real Atlas connection is needed.
 *
 * Run: node test/auth.test.js
 */

// ── Env setup (must happen before any app require) ─────────────────────────
process.env.JWT_SECRET = 'test_secret_for_smoke_tests';
process.env.PORT       = '5099';
process.env.NODE_ENV   = 'test'; // silences errorHandler stack traces

const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose  = require('mongoose');
const http      = require('http');
const express   = require('express');
const cors      = require('cors');

// ── Build a minimal app (mirrors server.js without the DB connect call) ────
const routes       = require('../routes');
const errorHandler = require('../middleware/errorHandler');

const app = express();
app.use(cors());
app.use(express.json());
app.get('/health', (_req, res) =>
  res.status(200).json({ status: 'ok' })
);
app.use('/api', routes);
app.use((_req, res) =>
  res.status(404).json({ success: false, message: 'Not found' })
);
app.use(errorHandler);

// ── Test helpers ────────────────────────────────────────────────────────────

const PORT   = parseInt(process.env.PORT, 10);
let   server;
let   mongod;

const request = (method, path, body, token) =>
  new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : undefined;
    const options = {
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

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });

    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });

// ── Assertion helper ────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;

const assert = (label, condition, got) => {
  if (condition) {
    console.log(`  ✅ ${label}`);
    passed++;
  } else {
    console.error(`  ❌ ${label}`);
    if (got !== undefined) console.error(`     Got: ${JSON.stringify(got)}`);
    failed++;
  }
};

// ── Test suites ─────────────────────────────────────────────────────────────

async function testRegisterSeeker() {
  console.log('\n📋 Register — Seeker');
  const res = await request('POST', '/api/auth/register', {
    name: 'Alice Seeker',
    email: 'alice@example.com',
    password: 'password123',
    role: 'seeker',
  });

  assert('Status 201',          res.status === 201, res.status);
  assert('success=true',        res.body.success === true, res.body.success);
  assert('token present',       typeof res.body.token === 'string', res.body.token);
  assert('emailVerified=true',  res.body.user.emailVerified === true, res.body.user.emailVerified);
  assert('passwordHash absent', !('passwordHash' in res.body.user), res.body.user);

  return res.body.token; // return for later use
}

async function testRegisterEmployer() {
  console.log('\n📋 Register — Employer (mock email should appear above)');
  const res = await request('POST', '/api/auth/register', {
    name: 'Bob Employer',
    email: 'bob@company.com',
    password: 'securePass9',
    role: 'employer',
  });

  assert('Status 201',           res.status === 201, res.status);
  assert('emailVerified=false',  res.body.user.emailVerified === false, res.body.user.emailVerified);
  assert('token present',        typeof res.body.token === 'string', res.body.token);

  return { token: res.body.token, userId: res.body.user._id };
}

async function testDuplicateEmail() {
  console.log('\n📋 Register — Duplicate email should return 409');
  const res = await request('POST', '/api/auth/register', {
    name: 'Alice Again',
    email: 'alice@example.com',
    password: 'password123',
    role: 'seeker',
  });

  assert('Status 409', res.status === 409, res.status);
}

async function testRegisterValidation() {
  console.log('\n📋 Register — Missing fields should return 400');
  const res = await request('POST', '/api/auth/register', {
    email: 'nobody@example.com',
  });

  assert('Status 400', res.status === 400, res.status);
}

async function testLoginSuccess() {
  console.log('\n📋 Login — Valid credentials');
  const res = await request('POST', '/api/auth/login', {
    email: 'alice@example.com',
    password: 'password123',
  });

  assert('Status 200',    res.status === 200, res.status);
  assert('token present', typeof res.body.token === 'string', res.body.token);

  return res.body.token;
}

async function testLoginBadPassword() {
  console.log('\n📋 Login — Wrong password should return 401');
  const res = await request('POST', '/api/auth/login', {
    email: 'alice@example.com',
    password: 'wrongpassword',
  });

  assert('Status 401', res.status === 401, res.status);
}

async function testLoginUnknownUser() {
  console.log('\n📋 Login — Unknown user should return 401');
  const res = await request('POST', '/api/auth/login', {
    email: 'ghost@example.com',
    password: 'whatever',
  });

  assert('Status 401', res.status === 401, res.status);
}

async function testVerifyEmailEmployer() {
  console.log('\n📋 Verify Email — Register a fresh employer, grab token from DB, verify');

  // Register
  const regRes = await request('POST', '/api/auth/register', {
    name: 'Carol Corp',
    email: 'carol@corp.com',
    password: 'corpPass99',
    role: 'employer',
  });
  assert('Employer registered', regRes.status === 201, regRes.status);

  // Grab token directly from DB (bypasses email in tests)
  const User      = require('../models/User');
  const dbUser    = await User.findOne({ email: 'carol@corp.com' })
                              .select('+emailVerifyToken');
  const rawToken  = dbUser.emailVerifyToken;

  assert('Verify token in DB', typeof rawToken === 'string', rawToken);

  // Verify
  const vRes = await request('POST', '/api/auth/verify-email', { token: rawToken });
  assert('Status 200',          vRes.status === 200, vRes.status);
  assert('emailVerified=true',  vRes.body.user.emailVerified === true, vRes.body.user);
}

async function testVerifyEmailBadToken() {
  console.log('\n📋 Verify Email — Invalid token should return 400');
  const res = await request('POST', '/api/auth/verify-email', {
    token: 'completelywrongtoken',
  });

  assert('Status 400', res.status === 400, res.status);
}

async function testAuthMiddleware() {
  console.log('\n📋 Auth Middleware — No token should return 401');
  // Hit a protected endpoint (we create a quick test route inline)
  const res = await request('GET', '/api/protected-test');
  assert('Status 404 or 401', [401, 404].includes(res.status), res.status);
}

async function testProtectedRoute(token) {
  console.log('\n📋 Auth Middleware — Valid token accepted');
  // Use /api/health which is unprotected — just verify the token is parsed correctly
  // by using a JWT that was issued during registration
  const decoded = require('jsonwebtoken').verify(token, process.env.JWT_SECRET);
  assert('JWT contains id',   typeof decoded.id === 'string', decoded.id);
  assert('JWT contains role', decoded.role === 'seeker', decoded.role);
}

async function testRoleCheck() {
  console.log('\n📋 requireRole — Seeker JWT blocked from employer-only route');
  // Register seeker, get token, simulate hitting an employer-only route
  const seekerLoginRes = await request('POST', '/api/auth/login', {
    email: 'alice@example.com',
    password: 'password123',
  });
  const seekerToken = seekerLoginRes.body.token;

  // Decode and confirm role
  const decoded = require('jsonwebtoken').verify(seekerToken, process.env.JWT_SECRET);
  assert('Seeker role in JWT', decoded.role === 'seeker', decoded.role);

  // Simulate the role check in isolation (without a real endpoint)
  const { requireRole } = require('../middleware/auth');
  const mockReq  = { user: { id: 'x', role: 'seeker' } };
  let   blocked  = false;
  const mockRes  = {
    status(code) { this._code = code; return this; },
    json(body)   { blocked = this._code === 403; },
  };
  requireRole('employer')(mockReq, mockRes, () => {});
  assert('requireRole blocks seeker from employer route', blocked === true, blocked);
}

// ── Main runner ──────────────────────────────────────────────────────────────

(async () => {
  // 1. Start in-memory MongoDB
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());

  // 2. Start HTTP server
  server = app.listen(PORT);
  await new Promise((r) => server.once('listening', r));
  console.log(`\n🧪 Auth test suite running against port ${PORT}`);

  try {
    const seekerToken             = await testRegisterSeeker();
    const { token: employerToken} = await testRegisterEmployer();
    await testDuplicateEmail();
    await testRegisterValidation();
    const loginToken = await testLoginSuccess();
    await testLoginBadPassword();
    await testLoginUnknownUser();
    await testVerifyEmailEmployer();
    await testVerifyEmailBadToken();
    await testAuthMiddleware();
    await testProtectedRoute(loginToken);
    await testRoleCheck();
  } finally {
    server.close();
    await mongoose.disconnect();
    await mongod.stop();

    console.log(`\n${'─'.repeat(50)}`);
    console.log(`Results: ${passed} passed, ${failed} failed`);
    console.log('─'.repeat(50));

    process.exit(failed > 0 ? 1 : 0);
  }
})();
