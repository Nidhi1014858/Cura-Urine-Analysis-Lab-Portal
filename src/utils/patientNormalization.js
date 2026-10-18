const collapseWhitespace = (value) => String(value ?? '').trim().replace(/\s+/g, ' ');

const normalizeGenderForStorage = (value) => {
  const normalized = collapseWhitespace(value).toLocaleLowerCase('en-US');
  return normalized ? `${normalized[0].toUpperCase()}${normalized.slice(1)}` : '';
};

export function normalizePhone(value) {
  const digits = String(value ?? '').replace(/\D/g, '');
  return digits ? `+${digits}` : '';
}

export function buildInternationalPhone(dialCode, nationalNumber) {
  const dialDigits = String(dialCode ?? '').replace(/\D/g, '');
  const rawNationalNumber = String(nationalNumber ?? '').trim();
  const nationalDigits = rawNationalNumber.replace(/\D/g, '');

  // A user may paste a complete international number into the national-number
  // field. Preserve that number instead of prefixing the selected dial code twice.
  if (rawNationalNumber.includes('+')) {
    return nationalDigits ? `+${nationalDigits}` : '';
  }
  if (rawNationalNumber.startsWith('00')) {
    const internationalDigits = nationalDigits.slice(2);
    return internationalDigits ? `+${internationalDigits}` : '';
  }

  return dialDigits && nationalDigits ? `+${dialDigits}${nationalDigits}` : '';
}

export function normalizePatientDetails(patient = {}) {
  return {
    name: collapseWhitespace(patient.name).toLocaleLowerCase('en-US'),
    age: patient.age === '' || patient.age === null || patient.age === undefined
      ? null
      : Number(patient.age),
    gender: collapseWhitespace(patient.gender).toLocaleLowerCase('en-US'),
    phone: normalizePhone(patient.phone),
    email: collapseWhitespace(patient.email).toLocaleLowerCase('en-US'),
    bloodGroup: collapseWhitespace(patient.bloodGroup).toUpperCase(),
    address: collapseWhitespace(patient.address).toLocaleLowerCase('en-US')
  };
}

export function patientDetailsMatch(left, right) {
  const a = normalizePatientDetails(left);
  const b = normalizePatientDetails(right);
  return Object.keys(a).every((key) => a[key] === b[key]);
}

export function cleanPatientForStorage(patient = {}) {
  return {
    ...patient,
    name: collapseWhitespace(patient.name),
    age: Number(patient.age),
    gender: normalizeGenderForStorage(patient.gender),
    phone: normalizePhone(patient.phone),
    email: collapseWhitespace(patient.email).toLocaleLowerCase('en-US'),
    bloodGroup: collapseWhitespace(patient.bloodGroup).toUpperCase(),
    address: collapseWhitespace(patient.address)
  };
}
