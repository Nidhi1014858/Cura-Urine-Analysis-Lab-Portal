import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { fileURLToPath } from 'node:url';
import { connectDB } from '../config/db.js';
import { User } from '../models/User.js';
import { Patient } from '../models/Patient.js';
import Test from '../models/Test.js';

dotenv.config({ path: fileURLToPath(new URL('../.env', import.meta.url)) });

const confirmed = process.argv.includes('--confirm');
const smokeEmailPattern = /^smoke-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}@example\.com$/;
const smokePatientNamePattern = /^Smoke Patient/;

const printMatches = (collection, documents, describe) => {
  for (const document of documents) {
    console.log(`MATCH ${collection}: ${describe(document)}`);
  }
  console.log(`${collection}: ${documents.length} match(es)`);
};

try {
  await connectDB();

  const [patients, users] = await Promise.all([
    Patient.find({ name: smokePatientNamePattern }).select('_id name patientId').lean(),
    User.find({ email: smokeEmailPattern }).select('_id name email').lean()
  ]);

  const patientIds = patients.map(({ _id }) => _id);
  const smokeUserNames = [...new Set(users.map(({ name }) => name))];
  const identifiableSmokeUserNames = smokeUserNames.filter((name) => name !== 'X');
  const testAssociations = [];
  if (patientIds.length > 0) {
    testAssociations.push({ patientId: { $in: patientIds } });
  }
  if (smokeUserNames.length > 0) {
    testAssociations.push({ submittedBy: { $in: smokeUserNames } });
  }
  const tests = testAssociations.length > 0
    ? await Test.find({ $or: testAssociations }).select('_id testCode patientId submittedBy').lean()
    : [];
  const smokePatientIdSet = new Set(patientIds.map(String));
  const deletableTests = tests.filter(({ patientId, submittedBy }) => (
    smokePatientIdSet.has(String(patientId)) ||
    identifiableSmokeUserNames.includes(submittedBy)
  ));
  const ambiguousTests = tests.filter((test) => !deletableTests.includes(test));

  printMatches('users', users, ({ _id, name, email }) => `id=${_id} name=${name} email=${email}`);
  printMatches('patients', patients, ({ _id, name, patientId }) => `id=${_id} name=${name} code=${patientId}`);
  printMatches('tests eligible for deletion', deletableTests, ({ _id, testCode, patientId, submittedBy }) => (
    `id=${_id} code=${testCode} patientId=${patientId} submittedBy=${submittedBy}`
  ));
  printMatches('ambiguous tests not eligible for deletion', ambiguousTests, ({ _id, testCode, patientId, submittedBy }) => (
    `id=${_id} code=${testCode} patientId=${patientId} submittedBy=${submittedBy}`
  ));

  if (users.some(({ name }) => name === 'X')) {
    console.log('Tests associated only by submittedBy="X" are reported as ambiguous and never deleted.');
  }

  console.log(`Total eligible: ${users.length + patients.length + deletableTests.length} document(s).`);

  if (!confirmed) {
    console.log('DRY RUN: no documents deleted. Re-run with --confirm to delete these matches.');
  } else {
    const testConditions = [];
    if (patientIds.length > 0) {
      testConditions.push({ patientId: { $in: patientIds } });
    }
    if (identifiableSmokeUserNames.length > 0) {
      testConditions.push({ submittedBy: { $in: identifiableSmokeUserNames } });
    }

    const [testDeletion, patientDeletion, userDeletion] = await Promise.all([
      deletableTests.length > 0
        ? Test.deleteMany({ _id: { $in: deletableTests.map(({ _id }) => _id) }, $or: testConditions })
        : { deletedCount: 0 },
      patients.length > 0
        ? Patient.deleteMany({
            _id: { $in: patientIds },
            name: smokePatientNamePattern
          })
        : { deletedCount: 0 },
      users.length > 0
        ? User.deleteMany({
            _id: { $in: users.map(({ _id }) => _id) },
            email: smokeEmailPattern
          })
        : { deletedCount: 0 }
    ]);

    console.log(`DELETED tests: ${testDeletion.deletedCount}`);
    console.log(`DELETED patients: ${patientDeletion.deletedCount}`);
    console.log(`DELETED users: ${userDeletion.deletedCount}`);
  }
} catch (error) {
  console.error(`Cleanup failed: ${error.message}`);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
