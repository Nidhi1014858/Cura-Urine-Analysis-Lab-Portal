import bcrypt from 'bcryptjs';
import { User } from '../models/User.js';
import { Patient } from '../models/Patient.js';
import Test from '../models/Test.js';
import { MOCK_USERS, MOCK_PATIENTS, MOCK_TESTS } from '../../src/services/seedData.js';

export async function seedIfEmpty() {
  const userCount = await User.countDocuments();

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

  if (userCount > 0) {
    return;
  }

  const patientIdMap = {};
  for (const { id, ...patient } of MOCK_PATIENTS) {
    const created = await Patient.create(patient);
    patientIdMap[id] = created._id;
  }

  const tests = MOCK_TESTS.map(({ id, patientId, ...test }, index) => ({
    ...test,
    patientId: patientIdMap[patientId],
    stripBatch: test.stripBatch || `CUR-${test.stripBrand?.includes('Cura') ? '14' : '10'}-${String(2401 + (index % 3)).padStart(4, '0')}`,
    manufactureDate: test.manufactureDate || (index === 3 ? '2025-06-01' : '2026-05-01'),
    expiryDate: test.expiryDate || (index === 3 ? '2026-07-31' : '2027-05-01')
  }));

  await Test.insertMany(tests);
  console.log('Seeded demo data');
}
