import assert from 'node:assert/strict';
import {
  buildInternationalPhone,
  patientDetailsMatch
} from '../../src/utils/patientNormalization.js';

const memoryStore = new Map();
globalThis.localStorage = {
  getItem: (key) => memoryStore.get(key) || null,
  setItem: (key, value) => memoryStore.set(key, String(value)),
  removeItem: (key) => memoryStore.delete(key),
  clear: () => memoryStore.clear()
};

const { localApi } = await import('../../src/services/localApi.js');

const basePatient = {
  name: 'Priya Sharma',
  age: 34,
  gender: 'Female',
  phone: '+919820012345',
  email: 'priya@example.com',
  bloodGroup: 'B+',
  address: 'Mumbai West'
};

assert.equal(
  buildInternationalPhone('+91', '(+91) 98200-12345'),
  '+919820012345',
  'A pasted international number must not receive the selected dial code twice.'
);

assert.equal(
  patientDetailsMatch(basePatient, {
    ...basePatient,
    name: '  priya   sharma ',
    phone: '(+91) 98200-12345',
    email: 'PRIYA@EXAMPLE.COM',
    address: '  mumbai   west '
  }),
  true,
  'Case, whitespace, and phone punctuation variants must be exact duplicates.'
);

globalThis.localStorage.setItem('cura_patients', JSON.stringify([]));
const first = await localApi.createPatient(basePatient);
assert.ok(first.patientId);

let duplicateError = null;
try {
  await localApi.createPatient({
    ...basePatient,
    name: '  priya   sharma ',
    phone: '(+91) 98200-12345',
    email: 'PRIYA@EXAMPLE.COM'
  });
} catch (error) {
  duplicateError = error;
}
assert.equal(duplicateError?.status, 409);
assert.match(duplicateError?.message || '', /all the same details/i);

const sameNameDifferentAge = await localApi.createPatient({ ...basePatient, age: 35 });
assert.ok(sameNameDifferentAge.patientId, 'The same name must be allowed when another detail differs.');

const differentNameSameContact = await localApi.createPatient({ ...basePatient, name: 'Another Person' });
assert.ok(differentNameSameContact.patientId, 'A different name must be allowed with the same email and phone.');

console.log('PASS: patient duplicate and international phone contracts');
