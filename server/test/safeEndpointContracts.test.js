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
import { restrictTo } from '../middleware/auth.js';
import { signup } from '../controllers/authController.js';
import { RgbDataset } from '../models/RgbDataset.js';
import { getRgbDataset } from '../controllers/rgbDatasetController.js';

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

console.log(`\n=== SAFE CONTRACT TESTS COMPLETE: ${passedTests}/${totalTests} PASSED ===`);
if (passedTests !== totalTests) {
  process.exit(1);
}
