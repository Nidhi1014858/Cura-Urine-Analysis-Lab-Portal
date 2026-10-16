/**
 * Safe Endpoint Contracts & Unit Test Suite for Cura POCT Urinalysis Portal
 * Runs locally without connecting to or mutating the shared MongoDB Atlas database.
 */

import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { asyncHandler } from '../utils/asyncHandler.js';
import {
  todayIST,
  validateBatch,
  validateBrandPanel,
  recalculateAnalytes
} from '../utils/validation.js';
import { getTodayIST } from '../../src/utils/formatters.js';
import { getSampleRGBReadings, PANEL_10_KEYS, PANEL_14_KEYS } from '../../src/services/predictionEngine.js';
import { jsonTransform } from '../utils/jsonTransform.js';
import { protect, restrictTo } from '../middleware/auth.js';
import { signup, getMe } from '../controllers/authController.js';
import { RgbDataset } from '../models/RgbDataset.js';
import { getRgbDataset } from '../controllers/rgbDatasetController.js';
import { updatePatient } from '../controllers/patientController.js';
import { Patient } from '../models/Patient.js';
import { MOCK_USERS, MOCK_INVENTORY } from '../../src/services/seedData.js';
import { localApi } from '../../src/services/localApi.js';
import { apiClient } from '../../src/services/apiClient.js';
import { api } from '../../src/services/api.js';

process.env.JWT_SECRET = 'test-mock-jwt-secret-key-for-contracts';

let totalTests = 0;
let passedTests = 0;

function runTest(name, fn) {
  totalTests++;
  try {
    fn();
    passedTests++;
    console.log(`PASS: ${name}`);
  } catch (err) {
    console.error(`FAIL: ${name}`, err);
  }
}

async function runAsyncTest(name, fn) {
  totalTests++;
  try {
    await fn();
    passedTests++;
    console.log(`PASS: ${name}`);
  } catch (err) {
    console.error(`FAIL: ${name}`, err);
  }
}

function mockRes() {
  return {
    statusCode: null,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      if (this.statusCode === null) {
        this.statusCode = 200;
      }
      this.body = data;
      return this;
    }
  };
}

console.log('=== STARTING SAFE ENDPOINT CONTRACTS & UNIT TESTS ===');

// --- 1. Asia/Kolkata Date Helper & Boundary Tests ---
runTest('1a. todayIST matches Asia/Kolkata date across midnight UTC lag', () => {
  // 2026-10-11T20:30:00Z corresponds to 02:00 AM Oct 12 IST
  const lateNightUTC = new Date('2026-10-11T20:30:00Z');
  const serverDate = todayIST(lateNightUTC);
  const clientDate = getTodayIST(lateNightUTC);
  assert.equal(serverDate, '2026-10-12');
  assert.equal(clientDate, '2026-10-12');
  assert.notEqual(lateNightUTC.toISOString().slice(0, 10), serverDate);
});

// --- 2. Batch & Expiry Date Validation ---
runTest('2a. validateBatch rejects missing fields with HTTP 400', () => {
  assert.throws(
    () => validateBatch({ stripBatch: '', manufactureDate: '2026-05-01', expiryDate: '2027-05-01' }),
    (err) => err.statusCode === 400 && err.message.includes('required')
  );
});

runTest('2b. validateBatch rejects invalid calendar date formats', () => {
  assert.throws(
    () => validateBatch({ stripBatch: 'B1', manufactureDate: 'not-a-date', expiryDate: '2027-05-01' }),
    (err) => err.statusCode === 400 && err.message.includes('valid calendar date')
  );
});

runTest('2c. validateBatch rejects expired strip with exact specified message', () => {
  const expiredDate = '2022-01-01';
  assert.throws(
    () => validateBatch({ stripBatch: 'B1', manufactureDate: '2021-01-01', expiryDate: expiredDate }),
    (err) =>
      err.statusCode === 400 &&
      err.message === `This strip batch expired on ${expiredDate} — testing with an expired strip may produce unreliable results. Submission blocked.`
  );
});

runTest('2d. validateBatch rejects manufacture date in the future', () => {
  assert.throws(
    () => validateBatch({ stripBatch: 'B1', manufactureDate: '2099-01-01', expiryDate: '2099-12-31' }),
    (err) => err.statusCode === 400 && err.message.includes('must not be in the future')
  );
});

runTest('2e. validateBatch accepts valid active strip batch', () => {
  const result = validateBatch({
    stripBatch: 'CUR-14-2401',
    manufactureDate: '2026-01-01',
    expiryDate: '2028-12-31'
  });
  assert.equal(result, true);
});

// --- 3. Strip Brand & Panel Compatibility ---
runTest('3a. validateBrandPanel rejects unknown brand', () => {
  assert.throws(
    () => validateBrandPanel('Nonexistent Brand', '10-panel'),
    (err) => err.statusCode === 400 && err.message.includes('Unknown strip brand')
  );
});

runTest('3b. validateBrandPanel rejects incompatible brand and panel', () => {
  assert.throws(
    () => validateBrandPanel('Siemens Multistix 10SG', '14-panel'),
    (err) => err.statusCode === 400 && err.message.includes('does not support 14-panel')
  );
});

runTest('3c. validateBrandPanel accepts compatible 10-panel and 14-panel combinations', () => {
  assert.equal(validateBrandPanel('Siemens Multistix 10SG', '10-panel'), true);
  assert.equal(validateBrandPanel('CuraStrip Pro 14', '10-panel'), true);
  assert.equal(validateBrandPanel('CuraStrip Pro 14', '14-panel'), true);
  assert.equal(validateBrandPanel('Dirui H14-MA', '14-panel'), true);
});

// --- 4. Server-Side RGB Recalculation & Overall Status ---
runTest('4a. recalculateAnalytes processes 10-panel and recomputes all 10 analytes', () => {
  const sample10 = getSampleRGBReadings('10-panel', 'normal');
  const result = recalculateAnalytes('10-panel', sample10);
  assert.equal(result.analytes.length, 10);
  assert.equal(result.overallStatus, 'normal');
  for (const a of result.analytes) {
    assert.ok(PANEL_10_KEYS.includes(a.id));
    assert.ok(a.value !== undefined);
  }
});

runTest('4b. recalculateAnalytes processes 14-panel and recomputes all 14 analytes', () => {
  const sample14 = getSampleRGBReadings('14-panel', 'pathological');
  const result = recalculateAnalytes('14-panel', sample14);
  assert.equal(result.analytes.length, 14);
  for (const a of result.analytes) {
    assert.ok(PANEL_14_KEYS.includes(a.id));
  }
});

runTest('4c. recalculateAnalytes rejects missing required analyte RGB reading', () => {
  const incompleteReadings = { glucose: { r: 64, g: 196, b: 180 } };
  assert.throws(
    () => recalculateAnalytes('10-panel', incompleteReadings),
    (err) => err.statusCode === 400 && err.message.includes('Missing RGB reading')
  );
});

runTest('4d. recalculateAnalytes overrides untrusted client flags and status', () => {
  const normalReadings = getSampleRGBReadings('10-panel', 'normal');
  // Inject forged client flags with rgbInput
  const forgedArray = Object.entries(normalReadings).map(([key, rgb]) => ({
    id: key,
    rgbInput: rgb,
    flag: 'abnormal', // forged flag
    value: 'Fake Value'
  }));
  const result = recalculateAnalytes('10-panel', forgedArray);
  // Must be recalculated to normal
  assert.equal(result.overallStatus, 'normal');
  const glucose = result.analytes.find((a) => a.id === 'glucose');
  assert.equal(glucose.flag, 'normal');
});

// --- 5. JSON Transform & Subdocument Contract ---
runTest('5a. jsonTransform plugin exposes string id and removes _id, __v, password', () => {
  const schema = new mongoose.Schema({
    name: String,
    password: { type: String, select: true }
  });
  schema.plugin(jsonTransform);
  const TestModel = mongoose.model('TestJsonTransformModel', schema);
  const doc = new TestModel({ name: 'Sample', password: 'secretpassword' });
  const json = doc.toJSON();
  assert.equal(typeof json.id, 'string');
  assert.equal(json._id, undefined);
  assert.equal(json.__v, undefined);
  assert.equal(json.password, undefined);
});

// --- 6. Role-Based Access Control Middleware (restrictTo) ---
runTest('6a. restrictTo allows authorized role and calls next()', () => {
  let nextCalled = false;
  const middleware = restrictTo('Clinician');
  const req = { user: { role: 'Clinician' } };
  const res = mockRes();
  middleware(req, res, () => { nextCalled = true; });
  assert.equal(nextCalled, true);
});

runTest('6b. restrictTo rejects unauthorized role with HTTP 403', () => {
  let nextCalled = false;
  const middleware = restrictTo('Clinician');
  const req = { user: { role: 'Technician' } };
  const res = mockRes();
  middleware(req, res, () => { nextCalled = true; });
  assert.equal(nextCalled, false);
  assert.equal(res.statusCode, 403);
  assert.equal(res.body?.message, 'You do not have permission to do this.');
});

runTest('6c. restrictTo("Admin") rejects Technician and Clinician with 403 and permits Admin', () => {
  const middleware = restrictTo('Admin');

  // Technician rejected
  const reqTech = { user: { role: 'Technician' } };
  const resTech = mockRes();
  let nextTech = false;
  middleware(reqTech, resTech, () => { nextTech = true; });
  assert.equal(nextTech, false);
  assert.equal(resTech.statusCode, 403);
  assert.equal(resTech.body?.message, 'You do not have permission to do this.');

  // Clinician rejected
  const reqClin = { user: { role: 'Clinician' } };
  const resClin = mockRes();
  let nextClin = false;
  middleware(reqClin, resClin, () => { nextClin = true; });
  assert.equal(nextClin, false);
  assert.equal(resClin.statusCode, 403);

  // Admin allowed
  const reqAdmin = { user: { role: 'Admin' } };
  const resAdmin = mockRes();
  let nextAdmin = false;
  middleware(reqAdmin, resAdmin, () => { nextAdmin = true; });
  assert.equal(nextAdmin, true);
});

await runAsyncTest('6d. protect middleware rejects missing or invalid bearer token with HTTP 401', async () => {
  const reqNoHeader = { headers: {} };
  const resNoHeader = mockRes();
  let nextCalledNoHeader = false;
  await protect(reqNoHeader, resNoHeader, () => { nextCalledNoHeader = true; });
  assert.equal(nextCalledNoHeader, false);
  assert.equal(resNoHeader.statusCode, 401);
  assert.equal(resNoHeader.body?.message, 'Not authenticated.');

  const reqBadToken = { headers: { authorization: 'Bearer invalid-token-string' } };
  const resBadToken = mockRes();
  let nextCalledBadToken = false;
  await protect(reqBadToken, resBadToken, () => { nextCalledBadToken = true; });
  assert.equal(nextCalledBadToken, false);
  assert.equal(resBadToken.statusCode, 401);
  assert.equal(resBadToken.body?.message, 'Not authenticated.');
});

import { User } from '../models/User.js';
import { errorHandler } from '../middleware/errorHandler.js';
import {
  getAllowedOrigins,
  createCorsOptions,
  DEFAULT_ALLOWED_ORIGINS
} from '../config/corsConfig.js';
import cors from 'cors';

// --- 7. AsyncHandler Promise Rejection & Centralized Error Handler ---
await runAsyncTest('7a. asyncHandler catches rejected promises and invokes next(err)', async () => {
  const rejectedError = new Error('Async controller failure');
  const failingHandler = async () => {
    throw rejectedError;
  };
  const wrapped = asyncHandler(failingHandler);
  let caughtError = null;
  const req = {};
  const res = mockRes();
  wrapped(req, res, (err) => { caughtError = err; });
  await new Promise((r) => setImmediate(r));
  assert.equal(caughtError, rejectedError);
});

await runAsyncTest('7b. asyncHandler propagates error to centralized errorHandler', async () => {
  const customError = new Error('Database connection failed');
  customError.statusCode = 503;
  const failingHandler = async () => {
    throw customError;
  };
  const wrapped = asyncHandler(failingHandler);
  const req = {};
  const res = mockRes();
  wrapped(req, res, (err) => {
    errorHandler(err, req, res, () => {});
  });
  await new Promise((r) => setImmediate(r));
  assert.equal(res.statusCode, 503);
  assert.equal(res.body?.message, 'Database connection failed');
});

// --- 8. Public Signup Clinician Authorization Gate & Defaults ---
await runAsyncTest('8a. signup rejects self-assigned Clinician role without valid invite code', async () => {
  process.env.CLINICIAN_INVITE_CODE = 'SECRET_CLIN_2026';
  const req = {
    body: {
      name: 'Dr. Unauthorized',
      email: 'unauth@cura.lab',
      password: 'Password123!',
      role: 'Clinician',
      clinicianCode: 'WRONG_CODE'
    }
  };
  const res = mockRes();
  await signup(req, res, () => {});
  assert.equal(res.statusCode, 403);
  assert.ok(res.body?.message?.includes('authorization invite code'));
});

await runAsyncTest('8b. signup rejects Clinician role if invite code is entirely missing', async () => {
  process.env.CLINICIAN_INVITE_CODE = 'SECRET_CLIN_2026';
  const req = {
    body: {
      name: 'Dr. NoCode',
      email: 'nocode@cura.lab',
      password: 'Password123!',
      role: 'Clinician'
    }
  };
  const res = mockRes();
  await signup(req, res, () => {});
  assert.equal(res.statusCode, 403);
  assert.ok(res.body?.message?.includes('authorization invite code'));
});

await runAsyncTest('8c. signup accepts Clinician registration with valid invite code and never persists code', async () => {
  process.env.CLINICIAN_INVITE_CODE = 'VALID_CODE_9876';
  const origFindOne = User.findOne;
  const origCreate = User.create;
  let createdPayload = null;

  try {
    User.findOne = async () => null; // Email not taken
    User.create = async (doc) => {
      createdPayload = doc;
      return {
        _id: new mongoose.Types.ObjectId(),
        ...doc,
        toJSON() {
          return { id: this._id.toString(), ...this };
        }
      };
    };

    const req = {
      body: {
        name: 'Dr. Authorized Clinician',
        email: 'dr.clinician@cura.lab',
        password: 'Password123!',
        role: 'Clinician',
        clinicianCode: 'VALID_CODE_9876'
      }
    };
    const res = mockRes();
    await signup(req, res, (err) => {
      if (err) throw err;
    });

    assert.equal(res.statusCode, 201);
    assert.equal(res.body?.user?.role, 'Clinician');
    assert.equal(res.body?.user?.clinicianCode, undefined);
    assert.equal(createdPayload?.role, 'Clinician');
    assert.equal(createdPayload?.clinicianCode, undefined);
    assert.ok(res.body?.token);
  } finally {
    User.findOne = origFindOne;
    User.create = origCreate;
  }
});

await runAsyncTest('8d. signup defaults public registration to Technician when role is omitted', async () => {
  const origFindOne = User.findOne;
  const origCreate = User.create;
  let createdPayload = null;

  try {
    User.findOne = async () => null;
    User.create = async (doc) => {
      createdPayload = doc;
      return {
        _id: new mongoose.Types.ObjectId(),
        ...doc,
        toJSON() {
          return { id: this._id.toString(), ...this };
        }
      };
    };

    const req = {
      body: {
        name: 'Default Tech User',
        email: 'default.tech@cura.lab',
        password: 'Password123!'
        // role omitted
      }
    };
    const res = mockRes();
    await signup(req, res, (err) => {
      if (err) throw err;
    });

    assert.equal(res.statusCode, 201);
    assert.equal(res.body?.user?.role, 'Technician');
    assert.equal(createdPayload?.role, 'Technician');
  } finally {
    User.findOne = origFindOne;
    User.create = origCreate;
  }
});

await runAsyncTest('8e. signup rejects unsupported roles with HTTP 400', async () => {
  for (const badRole of ['Admin', 'Superuser', 'Operator', '']) {
    const req = {
      body: {
        name: 'Bad Role User',
        email: 'badrole@cura.lab',
        password: 'Password123!',
        role: badRole
      }
    };
    const res = mockRes();
    await signup(req, res, () => {});
    assert.equal(res.statusCode, 400, `Expected 400 for role "${badRole}"`);
    assert.equal(res.body?.message, 'Role must be Technician or Clinician.');
  }
});

// --- 9. CORS Allowed and Disallowed Origins via corsConfig ---
runTest('9a. getAllowedOrigins always preserves default local development origins', () => {
  const origins = getAllowedOrigins('https://cura.hospital.org, https://staging.cura.lab');
  for (const def of DEFAULT_ALLOWED_ORIGINS) {
    assert.ok(origins.includes(def), `Default origin ${def} should be preserved`);
  }
  assert.ok(origins.includes('https://cura.hospital.org'));
  assert.ok(origins.includes('https://staging.cura.lab'));
});

runTest('9b. createCorsOptions origin resolver permits allowed origins and headless requests', () => {
  const options = createCorsOptions('https://custom.cura.org');

  let passedLocal = false;
  options.origin('http://localhost:3000', (err, allow) => {
    passedLocal = !err && allow === true;
  });
  assert.equal(passedLocal, true);

  let passedHeadless = false;
  options.origin(undefined, (err, allow) => {
    passedHeadless = !err && allow === true;
  });
  assert.equal(passedHeadless, true);

  let passedCustom = false;
  options.origin('https://custom.cura.org', (err, allow) => {
    passedCustom = !err && allow === true;
  });
  assert.equal(passedCustom, true);
});

runTest('9c. createCorsOptions origin resolver rejects unapproved origins with Error', () => {
  const options = createCorsOptions();
  let caughtError = null;

  options.origin('https://malicious-site.com', (err) => {
    caughtError = err;
  });
  assert.ok(caughtError instanceof Error);
  assert.ok(caughtError.message.includes('not allowed by CORS'));
});

runTest('9d. CORS preflight OPTIONS request sets appropriate headers for allowed origin', () => {
  const corsMiddleware = cors(createCorsOptions());
  const preflightReq = {
    method: 'OPTIONS',
    headers: {
      origin: 'http://localhost:3000',
      'access-control-request-method': 'POST',
      'access-control-request-headers': 'content-type,authorization'
    }
  };
  const headersSet = {};
  const preflightRes = {
    statusCode: 200,
    setHeader(name, val) {
      headersSet[name.toLowerCase()] = val;
    },
    getHeader(name) {
      return headersSet[name.toLowerCase()];
    },
    end() {}
  };

  corsMiddleware(preflightReq, preflightRes, () => {});
  assert.equal(headersSet['access-control-allow-origin'], 'http://localhost:3000');
  assert.equal(headersSet['access-control-allow-credentials'], 'true');
  assert.ok(headersSet['access-control-allow-methods'].includes('POST'));
});

// --- 10. RGB Dataset Model & Controller Contract Tests ---
runTest('10a. RgbDataset model uses exact collection name "rgb_dataset"', () => {
  assert.equal(RgbDataset.collection.name, 'rgb_dataset');
});

runTest('10b. RgbDataset toJSON preserves business id and strips _id and __v', () => {
  const instance = new RgbDataset({
    id: 'normal-001',
    label: 'Normal hydration baseline',
    status: 'normal',
    rgbReadings: { glucose: { r: 64, g: 196, b: 180 } }
  });
  const json = instance.toJSON();
  assert.equal(json.id, 'normal-001');
  assert.equal(json.label, 'Normal hydration baseline');
  assert.equal(json._id, undefined);
  assert.equal(json.__v, undefined);
});

await runAsyncTest('10c. getRgbDataset returns 200 with retrieved dataset array', async () => {
  const originalFind = RgbDataset.find;
  try {
    RgbDataset.find = () => ({
      sort: () => Promise.resolve([
        { id: 'sample-1', label: 'Sample 1', status: 'normal', rgbReadings: {} }
      ])
    });

    const res = mockRes();
    let nextCalled = false;
    await getRgbDataset({}, res, () => { nextCalled = true; });

    assert.equal(res.statusCode, 200);
    assert.equal(Array.isArray(res.body), true);
    assert.equal(res.body.length, 1);
    assert.equal(res.body[0].id, 'sample-1');
    assert.equal(nextCalled, false);
  } finally {
    RgbDataset.find = originalFind;
  }
});

await runAsyncTest('10d. getRgbDataset handles empty dataset collection returning 200 with []', async () => {
  const originalFind = RgbDataset.find;
  try {
    RgbDataset.find = () => ({
      sort: () => Promise.resolve([])
    });

    const res = mockRes();
    let nextCalled = false;
    await getRgbDataset({}, res, () => { nextCalled = true; });

    assert.equal(res.statusCode, 200);
    assert.equal(Array.isArray(res.body), true);
    assert.equal(res.body.length, 0);
    assert.equal(nextCalled, false);
  } finally {
    RgbDataset.find = originalFind;
  }
});

await runAsyncTest('10e. getRgbDataset propagates database failure to next(err)', async () => {
  const originalFind = RgbDataset.find;
  try {
    const dbError = new Error('Database connection dropped');
    RgbDataset.find = () => ({
      sort: () => Promise.reject(dbError)
    });

    const res = mockRes();
    let passedError = null;
    await getRgbDataset({}, res, (err) => { passedError = err; });

    assert.equal(passedError, dbError);
    assert.equal(res.statusCode, null);
  } finally {
    RgbDataset.find = originalFind;
  }
});

// --- 11. Edit Patient Details Controller & Role Authorization Tests ---
await runAsyncTest('11a. updatePatient successfully updates patient details, trims strings, and preserves immutable patientId', async () => {
  const originalFindById = Patient.findById;
  try {
    const mockId = new mongoose.Types.ObjectId();
    const mockPatient = {
      _id: mockId,
      patientId: 'PAT-2026-0004',
      name: 'Original Name',
      age: 28,
      gender: 'Male',
      phone: '+91 9876543210',
      email: 'old@example.com',
      bloodGroup: 'B+',
      address: 'Old Address',
      save: async function() { return this; },
      toJSON: function() { return { ...this }; }
    };

    Patient.findById = () => Promise.resolve(mockPatient);

    const req = {
      params: { id: String(mockId) },
      body: {
        name: '  Updated Patient Name  ',
        age: 32,
        gender: 'Female',
        phone: ' +91 99999 11111 ',
        email: '  Updated@Example.com ',
        bloodGroup: 'O+',
        address: '  New Address, Mumbai  ',
        patientId: 'TAMPERED-ID-ATTEMPT' // Must be ignored
      }
    };
    const res = mockRes();
    await updatePatient(req, res, () => {});

    assert.equal(res.statusCode, 200);
    assert.equal(mockPatient.name, 'Updated Patient Name');
    assert.equal(mockPatient.age, 32);
    assert.equal(mockPatient.gender, 'Female');
    assert.equal(mockPatient.phone, '+91 99999 11111');
    assert.equal(mockPatient.email, 'updated@example.com');
    assert.equal(mockPatient.bloodGroup, 'O+');
    assert.equal(mockPatient.address, 'New Address, Mumbai');
    assert.equal(mockPatient.patientId, 'PAT-2026-0004'); // Preserved!
  } finally {
    Patient.findById = originalFindById;
  }
});

await runAsyncTest('11b. updatePatient rejects invalid data (empty name, out-of-range age, malformed email, invalid gender) with HTTP 400', async () => {
  const originalFindById = Patient.findById;
  try {
    const mockId = new mongoose.Types.ObjectId();
    const createMockDoc = () => ({
      _id: mockId,
      patientId: 'PAT-2026-0004',
      name: 'Valid Name',
      age: 25,
      gender: 'Male',
      phone: '',
      email: '',
      bloodGroup: 'B+',
      address: '',
      save: async function() { return this; },
      toJSON: function() { return { ...this }; }
    });

    Patient.findById = () => Promise.resolve(createMockDoc());

    // 1. Empty name
    const emptyNameRes = mockRes();
    await updatePatient({ params: { id: String(mockId) }, body: { name: '   ' } }, emptyNameRes, () => {});
    assert.equal(emptyNameRes.statusCode, 400);
    assert.match(emptyNameRes.body.message, /Name is required/);

    // 2. Negative age
    const negAgeRes = mockRes();
    await updatePatient({ params: { id: String(mockId) }, body: { age: -5 } }, negAgeRes, () => {});
    assert.equal(negAgeRes.statusCode, 400);
    assert.match(negAgeRes.body.message, /between 0 and 150/);

    // 3. Age > 150
    const overAgeRes = mockRes();
    await updatePatient({ params: { id: String(mockId) }, body: { age: 151 } }, overAgeRes, () => {});
    assert.equal(overAgeRes.statusCode, 400);

    // 4. Invalid gender
    const badGenderRes = mockRes();
    await updatePatient({ params: { id: String(mockId) }, body: { gender: 'Unknown' } }, badGenderRes, () => {});
    assert.equal(badGenderRes.statusCode, 400);
    assert.match(badGenderRes.body.message, /Gender must be Male, Female, or Other/);

    // 5. Malformed email
    const badEmailRes = mockRes();
    await updatePatient({ params: { id: String(mockId) }, body: { email: 'not-an-email' } }, badEmailRes, () => {});
    assert.equal(badEmailRes.statusCode, 400);
    assert.match(badEmailRes.body.message, /valid email address/);
  } finally {
    Patient.findById = originalFindById;
  }
});

await runAsyncTest('11c. updatePatient returns HTTP 404 when patient does not exist', async () => {
  const originalFindById = Patient.findById;
  const originalFindOne = Patient.findOne;
  try {
    Patient.findById = () => Promise.resolve(null);
    Patient.findOne = () => Promise.resolve(null);

    const res = mockRes();
    await updatePatient({ params: { id: 'PAT-9999-NONEXISTENT' }, body: { name: 'Any Name' } }, res, () => {});
    assert.equal(res.statusCode, 404);
    assert.equal(res.body.message, 'Patient not found');
  } finally {
    Patient.findById = originalFindById;
    Patient.findOne = originalFindOne;
  }
});

await runAsyncTest('11d. protect middleware rejects unauthorized requests without valid token with HTTP 401', async () => {
  // Missing Authorization header
  const noTokenRes = mockRes();
  let noTokenNext = false;
  await protect({ headers: {} }, noTokenRes, () => { noTokenNext = true; });
  assert.equal(noTokenNext, false);
  assert.equal(noTokenRes.statusCode, 401);
  assert.equal(noTokenRes.body.message, 'Not authenticated.');

  // Malformed token
  const malformedRes = mockRes();
  let malformedNext = false;
  await protect({ headers: { authorization: 'Bearer bogus.token.xyz' } }, malformedRes, () => { malformedNext = true; });
  assert.equal(malformedNext, false);
  assert.equal(malformedRes.statusCode, 401);
  assert.equal(malformedRes.body.message, 'Not authenticated.');
});

runTest('11e. restrictTo authorizes Technician and Clinician roles and rejects unauthorized roles with HTTP 403', () => {
  const patientRoleGuard = restrictTo('Technician', 'Clinician');

  // Technician allowed
  let techNextCalled = false;
  patientRoleGuard({ user: { role: 'Technician' } }, mockRes(), () => { techNextCalled = true; });
  assert.equal(techNextCalled, true);

  // Clinician allowed
  let clinicianNextCalled = false;
  patientRoleGuard({ user: { role: 'Clinician' } }, mockRes(), () => { clinicianNextCalled = true; });
  assert.equal(clinicianNextCalled, true);

  // Unauthorized role rejected
  const guestRes = mockRes();
  let guestNextCalled = false;
  patientRoleGuard({ user: { role: 'Guest' } }, guestRes, () => { guestNextCalled = true; });
  assert.equal(guestNextCalled, false);
  assert.equal(guestRes.statusCode, 403);
  assert.match(guestRes.body.message, /permission/);
});

// --- 12. Admin Role & Idempotent Seed Contracts ---
runTest('12a. User model role enum includes Admin', () => {
  const roleField = User.schema.path('role');
  assert.ok(roleField.enumValues.includes('Admin'), 'User role enum must include Admin');
  assert.ok(roleField.enumValues.includes('Technician'), 'User role enum must include Technician');
  assert.ok(roleField.enumValues.includes('Clinician'), 'User role enum must include Clinician');
  assert.equal(roleField.options.immutable, true, 'User role must be immutable');
});

runTest('12b. MOCK_USERS contains dev Admin account with email admin@cura.lab and role Admin', () => {
  const adminUser = MOCK_USERS.find((u) => u.email.toLowerCase() === 'admin@cura.lab');
  assert.ok(adminUser, 'Admin user must exist in MOCK_USERS');
  assert.equal(adminUser.role, 'Admin');
  assert.equal(adminUser.password, 'password123');
});

await runAsyncTest('12c. localApi mock mode initializes and logs in with seeded Admin user', async () => {
  if (typeof globalThis.localStorage === 'undefined') {
    const memoryStore = new Map();
    globalThis.localStorage = {
      getItem: (k) => memoryStore.get(k) || null,
      setItem: (k, v) => memoryStore.set(k, String(v)),
      removeItem: (k) => memoryStore.delete(k),
      clear: () => memoryStore.clear()
    };
  }
  // Initialize storage with MOCK_USERS
  globalThis.localStorage.setItem('cura_users', JSON.stringify(MOCK_USERS));
  const account = await localApi.login('admin@cura.lab', 'password123');
  assert.equal(account.email, 'admin@cura.lab');
  assert.equal(account.role, 'Admin');
});

await runAsyncTest('12d. localApi mock signup blocks role: Admin from public self-registration', async () => {
  let errorCaught = false;
  try {
    await localApi.signup({
      name: 'Unauthorized Admin',
      email: 'badadmin@cura.lab',
      password: 'password123',
      role: 'Admin'
    });
  } catch (err) {
    errorCaught = true;
    assert.equal(err.message, 'Role must be Technician or Clinician.');
  }
  assert.ok(errorCaught, 'localApi.signup must reject role: Admin');
});

await runAsyncTest('12e. authController.getMe returns authenticated user preserving Admin role', async () => {
  const adminUser = {
    _id: 'admin_mock_id_999',
    name: 'Hospital Lab Administrator',
    email: 'admin@cura.lab',
    role: 'Admin',
    designation: 'Laboratory Director',
    department: 'Pathology Management'
  };
  const req = { user: adminUser };
  const res = mockRes();
  await getMe(req, res, () => {});
  assert.equal(res.body?.role, 'Admin');
  assert.equal(res.body?.email, 'admin@cura.lab');
  assert.equal(res.body?.name, 'Hospital Lab Administrator');
});

// --- 13. Inventory Service Contracts & Mock Authorization ---
runTest('13a. apiClient, api, and localApi define all required inventory methods', () => {
  const methods = ['getInventory', 'getInventoryById', 'createInventoryBatch', 'updateInventoryBatch', 'deleteInventoryBatch'];
  for (const m of methods) {
    assert.equal(typeof apiClient[m], 'function', `apiClient.${m} must be a function`);
    assert.equal(typeof api[m], 'function', `api.${m} must be a function`);
    assert.equal(typeof localApi[m], 'function', `localApi.${m} must be a function`);
  }
});

runTest('13b. MOCK_INVENTORY has valid batches matching STRIP_BRANDS', () => {
  assert.ok(Array.isArray(MOCK_INVENTORY) && MOCK_INVENTORY.length >= 4);
  for (const item of MOCK_INVENTORY) {
    assert.ok(item.brandId);
    assert.ok(item.brandName);
    assert.ok(item.batchNumber);
    assert.ok(item.manufactureDate);
    assert.ok(item.expiryDate);
    assert.ok(typeof item.quantity === 'number');
    assert.ok(Array.isArray(item.panels) && item.panels.length > 0);
  }
});

await runAsyncTest('13c. localApi.getInventory requires authentication and allows Technician', async () => {
  globalThis.localStorage.removeItem('cura_session');
  let unauthError = null;
  try {
    await localApi.getInventory();
  } catch (err) {
    unauthError = err;
  }
  assert.ok(unauthError, 'Unauthenticated getInventory must throw error');
  assert.equal(unauthError.status, 401);

  const tech = MOCK_USERS.find(u => u.role === 'Technician');
  globalThis.localStorage.setItem('cura_session', JSON.stringify(tech));
  globalThis.localStorage.setItem('cura_inventory', JSON.stringify(MOCK_INVENTORY));

  const items = await localApi.getInventory();
  assert.ok(Array.isArray(items));
  assert.ok(items.length >= 4);
});

await runAsyncTest('13d. localApi inventory mutations reject Technician and Clinician with 403', async () => {
  const tech = MOCK_USERS.find(u => u.role === 'Technician');
  globalThis.localStorage.setItem('cura_session', JSON.stringify(tech));

  let createError = null;
  try {
    await localApi.createInventoryBatch({
      brandId: 'brand_cura14',
      brandName: 'CuraStrip Pro 14',
      manufacturer: 'Cura Diagnostics',
      panels: ['14-panel'],
      batchNumber: 'TECH-MUT-01',
      manufactureDate: '2026-05-01',
      expiryDate: '2027-05-01',
      quantity: 50
    });
  } catch (err) {
    createError = err;
  }
  assert.ok(createError);
  assert.equal(createError.status, 403);
  assert.equal(createError.message, 'You do not have permission to do this.');

  let updateError = null;
  try {
    await localApi.updateInventoryBatch('inv_01', { quantity: 999 });
  } catch (err) {
    updateError = err;
  }
  assert.ok(updateError);
  assert.equal(updateError.status, 403);

  let deleteError = null;
  try {
    await localApi.deleteInventoryBatch('inv_01');
  } catch (err) {
    deleteError = err;
  }
  assert.ok(deleteError);
  assert.equal(deleteError.status, 403);
});

await runAsyncTest('13e. localApi inventory mutations allow Admin and enforce uniqueness and validation', async () => {
  const admin = MOCK_USERS.find(u => u.role === 'Admin');
  globalThis.localStorage.setItem('cura_session', JSON.stringify(admin));
  globalThis.localStorage.setItem('cura_inventory', JSON.stringify(MOCK_INVENTORY));

  const newBatch = await localApi.createInventoryBatch({
    brandId: 'brand_cura14',
    brandName: 'CuraStrip Pro 14',
    manufacturer: 'Cura Diagnostics',
    panels: ['10-panel', '14-panel'],
    batchNumber: 'CUR-TEST-99',
    manufactureDate: '2026-05-01',
    expiryDate: '2027-05-01',
    quantity: 100
  });
  assert.equal(newBatch.batchNumber, 'CUR-TEST-99');
  assert.equal(newBatch.quantity, 100);

  let dupError = null;
  try {
    await localApi.createInventoryBatch({
      brandId: 'brand_cura14',
      brandName: 'CuraStrip Pro 14',
      manufacturer: 'Cura Diagnostics',
      panels: ['10-panel', '14-panel'],
      batchNumber: 'cur-test-99',
      manufactureDate: '2026-05-01',
      expiryDate: '2027-05-01',
      quantity: 50
    });
  } catch (err) {
    dupError = err;
  }
  assert.ok(dupError);
  assert.equal(dupError.status, 409);

  const updated = await localApi.updateInventoryBatch(newBatch.id, { quantity: 150 });
  assert.equal(updated.quantity, 150);

  const deleteResult = await localApi.deleteInventoryBatch(newBatch.id);
  assert.equal(deleteResult.id, newBatch.id);

  let notFoundError = null;
  try {
    await localApi.getInventoryById(newBatch.id);
  } catch (err) {
    notFoundError = err;
  }
  assert.ok(notFoundError);
  assert.equal(notFoundError.status, 404);
});

await runAsyncTest('13f. localApi inventory creation validates dates, panel requirements, and non-negative integer quantity', async () => {
  const admin = MOCK_USERS.find(u => u.role === 'Admin');
  globalThis.localStorage.setItem('cura_session', JSON.stringify(admin));

  // Reject future manufacture date
  await assert.rejects(
    () => localApi.createInventoryBatch({
      brandId: 'brand_cura14',
      brandName: 'CuraStrip Pro 14',
      manufacturer: 'Cura Diagnostics',
      panels: ['14-panel'],
      batchNumber: 'FUT-MFG-01',
      manufactureDate: '2099-01-01',
      expiryDate: '2099-12-31',
      quantity: 50
    }),
    (err) => err.status === 400 && err.message.includes('future')
  );

  // Reject expiry date before manufacture date
  await assert.rejects(
    () => localApi.createInventoryBatch({
      brandId: 'brand_cura14',
      brandName: 'CuraStrip Pro 14',
      manufacturer: 'Cura Diagnostics',
      panels: ['14-panel'],
      batchNumber: 'INV-EXP-01',
      manufactureDate: '2026-05-01',
      expiryDate: '2026-04-30',
      quantity: 50
    }),
    (err) => err.status === 400 && err.message.includes('precede')
  );

  // Reject negative quantity
  await assert.rejects(
    () => localApi.createInventoryBatch({
      brandId: 'brand_cura14',
      brandName: 'CuraStrip Pro 14',
      manufacturer: 'Cura Diagnostics',
      panels: ['14-panel'],
      batchNumber: 'NEG-QTY-01',
      manufactureDate: '2026-05-01',
      expiryDate: '2027-05-01',
      quantity: -5
    }),
    (err) => err.status === 400 && err.message.includes('non-negative integer')
  );

  // Reject empty panels
  await assert.rejects(
    () => localApi.createInventoryBatch({
      brandId: 'brand_cura14',
      brandName: 'CuraStrip Pro 14',
      manufacturer: 'Cura Diagnostics',
      panels: [],
      batchNumber: 'NO-PANEL-01',
      manufactureDate: '2026-05-01',
      expiryDate: '2027-05-01',
      quantity: 50
    }),
    (err) => err.status === 400 && err.message.includes('panel type')
  );
});

console.log(`\n=== SAFE CONTRACT TESTS COMPLETE: ${passedTests}/${totalTests} PASSED ===`);
if (passedTests !== totalTests) {
  process.exit(1);
}
