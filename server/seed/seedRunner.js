import bcrypt from 'bcryptjs';
import { User } from '../models/User.js';
import { Patient } from '../models/Patient.js';
import Test from '../models/Test.js';
import { MOCK_USERS, MOCK_PATIENTS, MOCK_TESTS } from '../../src/services/seedData.js';
import { createPatientFingerprint } from '../utils/patientNormalization.js';

export async function seedIfEmpty() {
  await Promise.all(
    MOCK_USERS.map(async ({ id, password, ...user }) => {
      const email = user.email.toLowerCase();
      await User.updateOne(
        { email },
        {
          $setOnInsert: {
            ...user,
            email,
            password: await bcrypt.hash(password, 10)
          }
        },
        { upsert: true }
      );
    })
  );

  const patientIdMap = {};
  let seededAny = false;

  for (const { id, ...patient } of MOCK_PATIENTS) {
    let existingPatient = await Patient.findOne({ patientId: patient.patientId }).select('+duplicateFingerprint');
    if (!existingPatient) {
      existingPatient = await Patient.create(patient);
      seededAny = true;
    } else if (!existingPatient.duplicateFingerprint) {
      existingPatient.duplicateFingerprint = createPatientFingerprint(existingPatient);
      await existingPatient.save();
    }
    patientIdMap[id] = existingPatient._id;
  }

  const existingCodes = new Set(
    (await Test.find({ testCode: { $in: MOCK_TESTS.map((t) => t.testCode) } }, 'testCode'))
      .map((t) => t.testCode)
  );

  const testsToInsert = MOCK_TESTS
    .filter((test) => !existingCodes.has(test.testCode))
    .map(({ id, patientId, ...test }, index) => {
      const mappedPatientId = patientIdMap[patientId];
      if (!mappedPatientId) {
        throw new Error(`Cannot seed test ${test.testCode}: patient ${patientId} not found in mapping.`);
      }
      return {
        ...test,
        patientId: mappedPatientId,
        stripBatch: test.stripBatch || `CUR-${test.stripBrand?.includes('Cura') ? '14' : '10'}-${String(2401 + (index % 3)).padStart(4, '0')}`,
        manufactureDate: test.manufactureDate || (index === 3 ? '2025-06-01' : '2026-05-01'),
        expiryDate: test.expiryDate || (index === 3 ? '2026-07-31' : '2027-05-01')
      };
    });

  if (testsToInsert.length > 0) {
    await Test.insertMany(testsToInsert);
    seededAny = true;
  }

  if (seededAny) {
    console.log('Seeded demo data');
  }
}
