import crypto from 'crypto';

const collapseWhitespace = (value) => String(value ?? '').trim().replace(/\s+/g, ' ');

const normalizeGenderForStorage = (value) => {
  const normalized = collapseWhitespace(value).toLocaleLowerCase('en-US');
  return normalized ? `${normalized[0].toUpperCase()}${normalized.slice(1)}` : '';
};

export const normalizePhone = (value) => {
  const digits = String(value ?? '').replace(/\D/g, '');
  return digits ? `+${digits}` : '';
};

export const normalizePatientDetails = (patient = {}) => ({
  name: collapseWhitespace(patient.name).toLocaleLowerCase('en-US'),
  age: patient.age === '' || patient.age === null || patient.age === undefined
    ? null
    : Number(patient.age),
  gender: collapseWhitespace(patient.gender).toLocaleLowerCase('en-US'),
  phone: normalizePhone(patient.phone),
  email: collapseWhitespace(patient.email).toLocaleLowerCase('en-US'),
  bloodGroup: collapseWhitespace(patient.bloodGroup).toUpperCase(),
  address: collapseWhitespace(patient.address).toLocaleLowerCase('en-US')
});

export const createPatientFingerprint = (patient) => {
  const normalized = normalizePatientDetails(patient);
  const canonical = JSON.stringify([
    normalized.name,
    normalized.age,
    normalized.gender,
    normalized.phone,
    normalized.email,
    normalized.bloodGroup,
    normalized.address
  ]);

  return crypto.createHash('sha256').update(canonical).digest('hex');
};

export const cleanPatientForStorage = (patient = {}) => ({
  name: collapseWhitespace(patient.name),
  age: Number(patient.age),
  gender: normalizeGenderForStorage(patient.gender),
  phone: normalizePhone(patient.phone),
  email: collapseWhitespace(patient.email).toLocaleLowerCase('en-US'),
  bloodGroup: collapseWhitespace(patient.bloodGroup).toUpperCase(),
  address: collapseWhitespace(patient.address)
});
