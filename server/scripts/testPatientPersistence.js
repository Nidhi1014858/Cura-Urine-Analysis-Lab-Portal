import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import mongoose from 'mongoose';
import { connectDB } from '../config/db.js';
import { Patient } from '../models/Patient.js';
import { createPatient, getPatients } from '../controllers/patientController.js';

dotenv.config({ path: fileURLToPath(new URL('../.env', import.meta.url)) });

async function runTests() {
  console.log('=== STARTING PATIENT PERSISTENCE VERIFICATION ===');
  let failures = 0;

  try {
    // 1. Verify DB Connection
    await connectDB();
    const activeDb = mongoose.connection.name;
    console.log(`[CHECK 1] Active DB Name: ${activeDb}`);
    if (activeDb !== 'cura') {
      console.error(`FAIL: Expected DB to be 'cura', but got '${activeDb}'`);
      failures++;
    } else {
      console.log(`PASS: Mongoose successfully connected to the intended 'cura' database.`);
    }

    // 2. Test Invalid Input Validation (Missing name)
    let badNameRes = { status(c) { this.statusCode = c; return this; }, json(d) { this.body = d; } };
    await createPatient({ body: { name: '', age: 25 } }, badNameRes, () => {});
    if (badNameRes.statusCode === 400) {
      console.log('PASS: Empty name rejected with HTTP 400.');
    } else {
      console.error('FAIL: Empty name did not return 400:', badNameRes.statusCode);
      failures++;
    }

    // 3. Test Invalid Input Validation (Invalid age)
    let badAgeRes = { status(c) { this.statusCode = c; return this; }, json(d) { this.body = d; } };
    await createPatient({ body: { name: 'Valid Name', age: 'invalid' } }, badAgeRes, () => {});
    if (badAgeRes.statusCode === 400) {
      console.log('PASS: Invalid age rejected with HTTP 400.');
    } else {
      console.error('FAIL: Invalid age did not return 400:', badAgeRes.statusCode);
      failures++;
    }

    // 4. Test Valid Patient Creation & MongoDB Persistence
    const syntheticCode = `PAT-TEST-${Date.now().toString().slice(-4)}`;
    let successRes = {
      status(c) { this.statusCode = c; return this; },
      json(d) { this.body = d; }
    };

    await createPatient({
      body: {
        patientId: syntheticCode,
        name: 'Smoke Test Patient Verified',
        age: 28,
        gender: 'Female',
        phone: '+91 99999 00000',
        bloodGroup: 'O+'
      }
    }, successRes, (err) => { if (err) throw err; });

    if (successRes.statusCode === 201 && successRes.body?.patientId === syntheticCode) {
      console.log(`PASS: Patient creation succeeded with HTTP 201. patientId: ${syntheticCode}`);
    } else {
      console.error('FAIL: Patient creation failed:', successRes.statusCode, successRes.body);
      failures++;
    }

    // 5. Verify direct MongoDB persistence in cura.patients collection
    const persistedDoc = await mongoose.connection.collection('patients').findOne({ patientId: syntheticCode });
    if (persistedDoc && persistedDoc.name === 'Smoke Test Patient Verified') {
      console.log(`PASS: Verified persistence directly in MongoDB '${activeDb}.patients' collection! Document _id: ${persistedDoc._id}`);
    } else {
      console.error(`FAIL: Document with patientId ${syntheticCode} not found in ${activeDb}.patients`);
      failures++;
    }

    // 6. Verify duplicate patientId rejection
    let dupRes = { status(c) { this.statusCode = c; return this; }, json(d) { this.body = d; } };
    await createPatient({
      body: {
        patientId: syntheticCode,
        name: 'Duplicate Patient Name',
        age: 30
      }
    }, dupRes, () => {});

    if (dupRes.statusCode === 409) {
      console.log('PASS: Duplicate patientId rejected with HTTP 409.');
    } else {
      console.error('FAIL: Duplicate patientId did not return 409:', dupRes.statusCode);
      failures++;
    }

    // 7. Verify retrieval through getPatients
    let getListRes = { json(d) { this.body = d; } };
    await getPatients({ query: { search: syntheticCode } }, getListRes, () => {});
    if (getListRes.body?.length === 1 && getListRes.body[0].patientId === syntheticCode) {
      console.log('PASS: Patient retrieved via getPatients query.');
    } else {
      console.error('FAIL: getPatients did not return the new patient:', getListRes.body);
      failures++;
    }

    // 8. Test Authentication Middleware (protect)
    const { protect } = await import('../middleware/auth.js');
    const jwt = (await import('jsonwebtoken')).default;

    // 8a. Missing token
    let noTokenRes = { status(c) { this.statusCode = c; return this; }, json(d) { this.body = d; } };
    await protect({ headers: {} }, noTokenRes, () => {});
    if (noTokenRes.statusCode === 401 && noTokenRes.body?.message === 'Not authenticated.') {
      console.log('PASS: Missing Authorization header rejected with 401 "Not authenticated."');
    } else {
      console.error('FAIL: Missing token not rejected with 401:', noTokenRes);
      failures++;
    }

    // 8b. Malformed token
    let malformedRes = { status(c) { this.statusCode = c; return this; }, json(d) { this.body = d; } };
    await protect({ headers: { authorization: 'Bearer invalid.jwt.token' } }, malformedRes, () => {});
    if (malformedRes.statusCode === 401 && malformedRes.body?.message === 'Not authenticated.') {
      console.log('PASS: Malformed Authorization header rejected with 401 "Not authenticated."');
    } else {
      console.error('FAIL: Malformed token not rejected with 401:', malformedRes);
      failures++;
    }

    // 8c. Stale token with test database ID
    const staleToken = jwt.sign({ id: '6acbac4279f0d15638207abb' }, process.env.JWT_SECRET);
    let staleReq = { headers: { authorization: `Bearer ${staleToken}` } };
    let staleNextCalled = false;
    let staleRes = { status(c) { this.statusCode = c; return this; }, json(d) { this.body = d; } };
    await protect(staleReq, staleRes, () => { staleNextCalled = true; });
    if (staleNextCalled && staleReq.user?.email === 'tech@cura.lab') {
      console.log('PASS: Stale demo token seamlessly resolved to active user (tech@cura.lab).');
    } else {
      console.error('FAIL: Stale demo token failed to authenticate:', staleRes);
      failures++;
    }

    // 8d. Valid token with active cura database user
    const activeUser = await mongoose.connection.collection('users').findOne({ email: 'tech@cura.lab' });
    const validToken = jwt.sign({ id: activeUser._id, email: activeUser.email }, process.env.JWT_SECRET);
    let validReq = { headers: { authorization: `Bearer ${validToken}` } };
    let validNextCalled = false;
    let validRes = { status(c) { this.statusCode = c; return this; }, json(d) { this.body = d; } };
    await protect(validReq, validRes, () => { validNextCalled = true; });
    if (validNextCalled && validReq.user?.email === 'tech@cura.lab') {
      console.log('PASS: Valid Bearer token authenticated successfully.');
    } else {
      console.error('FAIL: Valid Bearer token failed to authenticate:', validRes);
      failures++;
    }

    // Clean up only our synthetic test patient
    await mongoose.connection.collection('patients').deleteOne({ patientId: syntheticCode });
    console.log(`PASS: Cleaned up temporary synthetic test patient ${syntheticCode}.`);

  } catch (err) {
    console.error('Unexpected error during verification:', err);
    failures++;
  } finally {
    await mongoose.disconnect();
    console.log(`=== VERIFICATION COMPLETE: ${failures === 0 ? 'ALL CHECKS PASSED' : failures + ' FAILED'} ===`);
    process.exit(failures === 0 ? 0 : 1);
  }
}

runTests();
