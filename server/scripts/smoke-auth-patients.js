// Run with: node server/scripts/smoke-auth-patients.js (server must be running)
import { randomUUID } from 'node:crypto';

const baseUrl = 'http://localhost:5000';
const email = `smoke-${randomUUID()}@example.com`;
const password = `Smoke-${randomUUID()}!`;
const searchName = `Smoke Patient ${randomUUID()}`;

let passed = 0;
let failed = 0;
let token;
let user;
let firstPatient;
let secondPatient;

const assert = (condition, message) => {
  if (!condition) {
    throw new Error(message);
  }
};

const request = async (path, { method = 'GET', body, authToken } = {}) => {
  const headers = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (authToken) headers.Authorization = `Bearer ${authToken}`;

  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    ...(body === undefined ? {} : { body: JSON.stringify(body) })
  });
  let responseBody;
  try {
    responseBody = await response.json();
  } catch {
    responseBody = undefined;
  }

  return { status: response.status, body: responseBody };
};

const check = async (label, run) => {
  try {
    await run();
    passed += 1;
    console.log(`PASS ${label}`);
  } catch (error) {
    failed += 1;
    console.error(`FAIL ${label}: ${error.message}`);
  }
};

const requireValue = (value, prerequisite) => {
  assert(value, `Cannot run: ${prerequisite} did not succeed.`);
  return value;
};

await check('1. GET /api/health reports status ok', async () => {
  const result = await request('/api/health');
  assert(result.status === 200, `Expected 200, got ${result.status}.`);
  assert(result.body?.status === 'ok', 'Expected response body { status: "ok" }.');
});

await check('2. Signup creates a password-free Technician user', async () => {
  const result = await request('/api/auth/signup', {
    method: 'POST',
    body: { name: 'Smoke Test User', email, password, role: 'Technician' }
  });
  assert(result.status === 201, `Expected 201, got ${result.status}.`);
  assert(typeof result.body?.token === 'string', 'Response has no token.');
  assert(result.body?.user?.role === 'Technician', 'User role is not Technician.');
  assert(typeof result.body?.user?.id === 'string', 'User id is not a string.');
  for (const field of ['_id', '__v', 'password']) {
    assert(!(field in result.body.user), `User response contains ${field}.`);
  }
  token = result.body.token;
  user = result.body.user;
});

await check('3. Login rejects a wrong password and an unknown email with exact messages', async () => {
  const wrongPassword = await request('/api/auth/login', {
    method: 'POST',
    body: { email, password: `${password}-wrong` }
  });
  assert(wrongPassword.status === 400, `Wrong-password login returned ${wrongPassword.status}.`);
  assert(wrongPassword.body?.message === 'Invalid password.', 'Wrong-password message did not match.');

  const unknownEmail = await request('/api/auth/login', {
    method: 'POST',
    body: { email: `unknown-${randomUUID()}@example.com`, password }
  });
  assert(unknownEmail.status === 400, `Unknown-email login returned ${unknownEmail.status}.`);
  assert(
    unknownEmail.body?.message === 'No user found with this email address.',
    'Unknown-email message did not match.'
  );
});

await check('4. /api/auth/me rejects no token and returns the signed-in user', async () => {
  const unauthenticated = await request('/api/auth/me');
  assert(unauthenticated.status === 401, `Expected unauthenticated status 401, got ${unauthenticated.status}.`);

  requireValue(token, 'signup');
  requireValue(user, 'signup');
  const authenticated = await request('/api/auth/me', { authToken: token });
  assert(authenticated.status === 200, `Expected authenticated status 200, got ${authenticated.status}.`);
  assert(authenticated.body?.id === user.id, 'Returned user id differs from signup.');
  assert(authenticated.body?.email === user.email, 'Returned user email differs from signup.');
  assert(authenticated.body?.role === user.role, 'Returned user role differs from signup.');
  assert(!('password' in authenticated.body), 'User response contains password.');
});

await check('5. Profile updates are self-only and cannot change role', async () => {
  requireValue(token, 'signup');
  requireValue(user, 'signup');
  const updated = await request(`/api/users/${encodeURIComponent(user.id)}`, {
    method: 'PATCH',
    authToken: token,
    body: { name: 'X', role: 'Clinician' }
  });
  assert(updated.status === 200, `Own-profile update returned ${updated.status}.`);
  assert(updated.body?.name === 'X', 'Profile name was not updated.');
  assert(updated.body?.role === 'Technician', 'Profile role changed from Technician.');
  assert(!('password' in updated.body), 'User response contains password.');

  const otherUser = await request('/api/users/000000000000000000000001', {
    method: 'PATCH',
    authToken: token,
    body: { name: 'Not the signed-in user' }
  });
  assert(otherUser.status === 403, `Other-user update returned ${otherUser.status}, expected 403.`);
});

await check('6. Password change rejects an incorrect current password', async () => {
  requireValue(token, 'signup');
  const result = await request('/api/auth/password', {
    method: 'PATCH',
    authToken: token,
    body: { currentPassword: `${password}-wrong`, newPassword: `New-${randomUUID()}!` }
  });
  assert(result.status === 400, `Expected 400, got ${result.status}.`);
  assert(result.body?.message === 'Current password is incorrect.', 'Password error message did not match.');
});

await check('7. Patient creation generates distinct codes and search finds both', async () => {
  requireValue(token, 'signup');
  const createPatient = async (suffix) => request('/api/patients', {
    method: 'POST',
    authToken: token,
    body: {
      name: `${searchName} ${suffix}`,
      age: 30,
      gender: 'Other'
    }
  });

  const first = await createPatient('One');
  const second = await createPatient('Two');
  assert(first.status === 201, `First patient creation returned ${first.status}.`);
  assert(second.status === 201, `Second patient creation returned ${second.status}.`);
  assert(/^PAT-2026-\d{4}$/.test(first.body?.patientId), `Invalid first patient code: ${first.body?.patientId}.`);
  assert(/^PAT-2026-\d{4}$/.test(second.body?.patientId), `Invalid second patient code: ${second.body?.patientId}.`);
  assert(first.body.patientId !== second.body.patientId, 'Patient codes are not unique.');
  firstPatient = first.body;
  secondPatient = second.body;

  const results = await request(`/api/patients?search=${encodeURIComponent(searchName)}`, {
    authToken: token
  });
  assert(results.status === 200, `Patient search returned ${results.status}.`);
  const foundIds = new Set(results.body?.map((patient) => patient.patientId));
  assert(foundIds.has(firstPatient.patientId), 'Search did not find the first patient.');
  assert(foundIds.has(secondPatient.patientId), 'Search did not find the second patient.');
});

await check('8. Patient detail resolves codes and ids; malformed ids return 404', async () => {
  requireValue(token, 'signup');
  requireValue(firstPatient, 'patient creation');

  for (const identifier of [firstPatient.patientId, firstPatient.id]) {
    assert(typeof identifier === 'string', 'Created patient is missing its id or code.');
    const result = await request(`/api/patients/${encodeURIComponent(identifier)}`, {
      authToken: token
    });
    assert(result.status === 200, `Patient detail for ${identifier} returned ${result.status}.`);
    assert(result.body?.patientId === firstPatient.patientId, 'Patient detail returned the wrong patient.');
    assert(Array.isArray(result.body?.tests) && result.body.tests.length === 0, 'Expected tests: [].');
  }

  const malformed = await request('/api/patients/not-an-id', { authToken: token });
  assert(malformed.status === 404, `Malformed patient id returned ${malformed.status}, expected 404.`);
});

await check('9. Test and dashboard stub routes return 501', async () => {
  requireValue(token, 'signup');
  for (const path of ['/api/tests', '/api/stats/dashboard']) {
    const result = await request(path, { authToken: token });
    assert(result.status === 501, `${path} returned ${result.status}, expected 501.`);
    assert(result.body?.message === 'Not implemented yet', `${path} returned an unexpected message.`);
  }
});

console.log(`\nSummary: ${passed} passed, ${failed} failed.`);
if (failed > 0) {
  process.exitCode = 1;
}
