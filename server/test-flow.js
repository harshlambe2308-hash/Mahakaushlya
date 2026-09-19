#!/usr/bin/env node
'use strict';

/**
 * MahaKaushalya merged-backend E2E test (uses only the built-in http module).
 * Run the server first: npm start   then:   npm test
 */

const http = require('http');

const BASE = 'http://localhost:5000';
const results = [];
let traineeToken = '';
let adminToken = '';
let outcomeId = '';
let followupId = '';

function request(method, path, body, token) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE);
    const postData = body ? JSON.stringify(body) : null;

    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method,
      headers: { 'Content-Type': 'application/json' },
    };

    if (token) options.headers['Authorization'] = `Bearer ${token}`;
    if (postData) options.headers['Content-Length'] = Buffer.byteLength(postData);

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });

    req.on('error', reject);
    if (postData) req.write(postData);
    req.end();
  });
}

function log(name, passed, detail) {
  results.push({ name, passed });
  console.log(`  ${passed ? '✅' : '❌'} ${name}${detail ? ` — ${detail}` : ''}`);
}

async function test(name, fn) {
  try {
    await fn();
  } catch (err) {
    log(name, false, err.message);
  }
}

async function run() {
  console.log('\n🔬 MahaKaushalya MERGED backend E2E test\n');
  console.log('━'.repeat(64));

  // Phase 1: health
  await test('GET /health', async () => {
    const r = await request('GET', '/health');
    log('Health check', r.status === 200 && r.body.success === true, r.body.message);
  });

  // Phase 2: trainee registration + login
  const suffix = Date.now();
  const traineeEmail = `merged_trainee_${suffix}@example.com`;
  const traineePhone = `9${String(suffix).slice(-9)}`;

  await test('POST /api/trainee/auth/register', async () => {
    const r = await request('POST', '/api/trainee/auth/register', {
      fullName: 'Merged Test Trainee',
      email: traineeEmail,
      phone: traineePhone,
      password: 'test123456',
      dob: '1999-03-10',
      gender: 'male',
      address: 'Mumbai, Maharashtra',
      district: 'Pune',
      trade: 'CNC Operator',
      courseName: 'CNC Machine Operator',
      trainingCenter: 'ITI Mumbai Central',
      trainingPartner: 'NIIT Foundation',
    });
    traineeToken = r.body.data?.token || '';
    log(
      'Register trainee',
      r.status === 201 && r.body.success && traineeToken && r.body.data?.prn,
      `${r.body.message} PRN: ${r.body.data?.prn}`
    );
  });

  await test('Duplicate trainee registration rejected (409)', async () => {
    const r = await request('POST', '/api/trainee/auth/register', {
      fullName: 'Duplicate User',
      email: traineeEmail,
      phone: '9876543219',
      password: 'test123456',
    });
    log('Duplicate registration rejected', r.status === 409, r.body.message);
  });

  await test('POST /api/trainee/auth/login', async () => {
    const r = await request('POST', '/api/trainee/auth/login', {
      email: traineeEmail,
      password: 'test123456',
    });
    traineeToken = r.body.data?.token || traineeToken;
    log('Trainee login', r.status === 200 && !!traineeToken, r.body.message);
  });

  await test('Wrong trainee password rejected (401)', async () => {
    const r = await request('POST', '/api/trainee/auth/login', {
      email: traineeEmail,
      password: 'wrongpassword',
    });
    log('Wrong password rejected', r.status === 401, r.body.message);
  });

  // Phase 3: protected trainee routes
  await test('GET /api/trainee/dashboard (protected)', async () => {
    const r = await request('GET', '/api/trainee/dashboard', null, traineeToken);
    log(
      'Trainee dashboard',
      r.status === 200 && r.body.success && r.body.data?.trainee,
      `Trainee: ${r.body.data?.trainee?.fullName}`
    );
  });

  await test('PUT /api/trainee/profile (protected)', async () => {
    const r = await request('PUT', '/api/trainee/profile', { address: 'Pune, Maharashtra (updated)' }, traineeToken);
    log('Update trainee profile', r.status === 200 && r.body.success, r.body.message);
  });

  // Phase 4: outcomes
  await test('POST /api/trainee/outcomes/submit (employed)', async () => {
    const r = await request(
      'POST',
      '/api/trainee/outcomes/submit',
      {
        status: 'employed',
        employerName: 'Tata Consultancy Services',
        designation: 'Junior Software Developer',
        monthlySalary: 25000,
        joiningDate: '2026-07-01',
        workLocation: 'Pune, Maharashtra',
      },
      traineeToken
    );
    outcomeId = r.body.data?.id || '';
    log('Submit outcome', r.status === 201 && r.body.success, r.body.message);
  });

  await test('GET /api/trainee/outcomes/history (protected)', async () => {
    const r = await request('GET', '/api/trainee/outcomes/history', null, traineeToken);
    log('Outcome history', r.status === 200 && r.body.data?.count >= 1, `Count: ${r.body.data?.count}`);
  });

  // Phase 5: follow-up flow
  await test('POST /api/trainee/dev/followups/seed (dev)', async () => {
    const r = await request(
      'POST',
      '/api/trainee/dev/followups/seed',
      { question: 'Are you still working at TCS?', channel: 'whatsapp', outcomeId },
      traineeToken
    );
    followupId = r.body.data?.id || '';
    log('Seed follow-up', r.status === 201 && r.body.success, r.body.message);
  });

  await test('POST /api/trainee/followups/respond (protected)', async () => {
    const r = await request(
      'POST',
      '/api/trainee/followups/respond',
      { followupId, response: 'Yes, still working at TCS.' },
      traineeToken
    );
    log('Respond to follow-up', r.status === 200 && r.body.success, r.body.message);
  });

  // Phase 6: admin seed + login
  const adminEmail = `merged_admin_${suffix}@mssds.gov.in`;
  await test('POST /api/admin/dev/seed-admin (dev)', async () => {
    const r = await request('POST', '/api/admin/dev/seed-admin', {
      email: adminEmail,
      password: 'admin123456',
      role: 'admin',
    });
    log('Seed admin user', r.status === 201 && r.body.success, r.body.message);
  });

  await test('POST /api/admin/auth/login', async () => {
    const r = await request('POST', '/api/admin/auth/login', {
      email: adminEmail,
      password: 'admin123456',
    });
    adminToken = r.body.data?.token || '';
    log('Admin login', r.status === 200 && !!adminToken, `Role: ${r.body.data?.user?.role}`);
  });

  // Phase 7: protected admin routes
  await test('GET /api/admin/dashboard (protected)', async () => {
    const r = await request('GET', '/api/admin/dashboard', null, adminToken);
    log(
      'Admin dashboard',
      r.status === 200 && r.body.success && r.body.data?.totalTrainees >= 1,
      `Trainees: ${r.body.data?.totalTrainees}, Outcomes: ${r.body.data?.totalOutcomes}`
    );
  });

  await test('GET /api/admin/overview (protected)', async () => {
    const r = await request('GET', '/api/admin/overview', null, adminToken);
    log('Admin overview', r.status === 200 && r.body.data?.totalEnrolled >= 1, `Enrolled: ${r.body.data?.totalEnrolled}`);
  });

  await test('GET /api/admin/trainees (protected)', async () => {
    const r = await request('GET', '/api/admin/trainees', null, adminToken);
    log('Admin trainee list', r.status === 200 && r.body.data?.count >= 1, `Count: ${r.body.data?.count}`);
  });

  await test('GET /api/admin/trainees?trade=CNC filter', async () => {
    const r = await request('GET', '/api/admin/trainees?trade=CNC', null, adminToken);
    log('Filter trainees by trade', r.status === 200 && r.body.data?.count >= 1, `Matched: ${r.body.data?.count}`);
  });

  await test('GET /api/admin/outcomes (protected)', async () => {
    const r = await request('GET', '/api/admin/outcomes', null, adminToken);
    log('Admin outcome list', r.status === 200 && r.body.data?.count >= 1, `Count: ${r.body.data?.count}`);
  });

  await test('PUT /api/admin/outcomes/:id/verify (protected)', async () => {
    const r = await request(
      'PUT',
      `/api/admin/outcomes/${outcomeId}/verify`,
      { verificationStatus: 'verified', remarks: 'Verified via E2E test.' },
      adminToken
    );
    log('Verify outcome', r.status === 200 && r.body.success, r.body.message);
  });

  await test('Re-verify rejected (409)', async () => {
    const r = await request(
      'PUT',
      `/api/admin/outcomes/${outcomeId}/verify`,
      { verificationStatus: 'rejected' },
      adminToken
    );
    log('Cannot re-verify', r.status === 409, r.body.message);
  });

  await test('GET /api/admin/analytics (protected)', async () => {
    const r = await request('GET', '/api/admin/analytics', null, adminToken);
    log(
      'Admin analytics',
      r.status === 200 && r.body.data?.placementByTrade && r.body.data?.salaryDistribution,
      `Avg salary: ₹${r.body.data?.salaryDistribution?.average}`
    );
  });

  await test('GET /api/admin/followups (protected)', async () => {
    const r = await request('GET', '/api/admin/followups', null, adminToken);
    log('Admin follow-up list', r.status === 200 && r.body.data?.count >= 1, `Count: ${r.body.data?.count}`);
  });

  await test('GET /api/admin/queue/non-responders (protected)', async () => {
    const r = await request('GET', '/api/admin/queue/non-responders', null, adminToken);
    log('Non-responder queue', r.status === 200 && Array.isArray(r.body.data), `Entries: ${r.body.data?.length}`);
  });

  // Phase 8: role enforcement + 401s
  await test('Trainee token REJECTED on admin route (403)', async () => {
    const r = await request('GET', '/api/admin/dashboard', null, traineeToken);
    log('Trainee blocked from admin route', r.status === 403, r.body.message);
  });

  await test('Admin token REJECTED on trainee route (403)', async () => {
    const r = await request('GET', '/api/trainee/dashboard', null, adminToken);
    log('Admin blocked from trainee route', r.status === 403, r.body.message);
  });

  await test('Missing token rejected (401)', async () => {
    const r = await request('GET', '/api/trainee/dashboard');
    log('Unauthenticated rejected', r.status === 401, r.body.message);
  });

  await test('Invalid token rejected (401)', async () => {
    const r = await request('GET', '/api/trainee/dashboard', null, 'not.a.real.token');
    log('Invalid token rejected', r.status === 401, r.body.message);
  });

  await test('Unknown route returns 404 envelope (authenticated)', async () => {
    const r = await request('GET', '/api/trainee/does-not-exist', null, traineeToken);
    log('404 handler', r.status === 404 && r.body.success === false, r.body.message);
  });

  // Summary
  console.log('\n' + '━'.repeat(64));
  const passed = results.filter((r) => r.passed).length;
  const failed = results.length - passed;

  console.log(`\n🏁 Results: ${passed}/${results.length} passed, ${failed} failed\n`);

  if (failed === 0) {
    console.log('🎉 ALL TESTS PASSED — merged backend verified end-to-end!\n');
  } else {
    console.log('⚠️  Some tests failed:');
    results.filter((r) => !r.passed).forEach((r) => console.log(`   ❌ ${r.name}`));
    console.log('');
  }

  process.exit(failed > 0 ? 1 : 0);
}

run().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
