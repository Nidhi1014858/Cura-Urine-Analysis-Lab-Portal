import { predictAnalytes, getSampleRGBReadings } from '../../src/services/predictionEngine.js';

/**
 * Generates an example request payload for creating a 10-panel test.
 * Server-controlled fields (testCode, submittedBy, submittedAt, clinicianReview,
 * auditTrail, overallStatus) are intentionally omitted.
 *
 * @returns {Object} Sample test submission payload
 */
export function generateSamplePayload() {
  const panelType = '10-panel';
  const rgbReadings = getSampleRGBReadings(panelType, 'normal');
  const analytes = predictAnalytes(panelType, rgbReadings);

  return {
    patientId: 'REPLACE_WITH_PATIENT_OBJECT_ID', // Placeholder: Real Patient MongoDB ObjectId
    panelType,
    stripBrand: 'Siemens Multistix 10SG',
    stripBatch: 'CUR-10-2401',
    manufactureDate: '2026-05-01',
    expiryDate: '2027-05-01',
    reportDestination: 'Metropolis Healthcare',
    technicianNotes: 'Routine morning fasting specimen. Clear appearance with no visible sediment.',
    analytes
  };
}

const payload = generateSamplePayload();
console.log(JSON.stringify(payload, null, 2));
