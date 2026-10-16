/**
 * Seed data for Cura Point-of-Care Urinalysis Portal
 */

export const MOCK_USERS = [
  {
    id: 'usr_tech_01',
    email: 'tech@cura.lab',
    password: 'password123',
    name: 'Ananya Deshmukh',
    role: 'Technician',
    designation: 'Senior Pathology Technician',
    department: 'Point-of-Care Testing (POCT)',
    photoUrl: 'https://images.unsplash.com/photo-1594824813566-8185b9b18365?auto=format&fit=crop&q=80&w=200'
  },
  {
    id: 'usr_clin_01',
    email: 'clinician@cura.lab',
    password: 'password123',
    name: 'Dr. Rajesh V. Kulkarni',
    role: 'Clinician',
    designation: 'Consultant Nephrologist & Clinical Pathologist',
    department: 'Department of Clinical Pathology',
    photoUrl: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&q=80&w=200'
  },
  {
    id: 'usr_admin_01',
    email: 'admin@cura.lab',
    password: 'password123',
    name: 'Dev Admin',
    role: 'Admin',
    designation: 'Laboratory Systems Administrator',
    department: 'Clinical Pathology IT & Administration',
    photoUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200'
  }
];

export const PATHOLOGY_DESTINATIONS = [
  'In-house / K J Somaiya Hospital',
  'Metropolis Healthcare',
  'Dr Lal PathLabs',
  'SRL Diagnostics',
  'Thyrocare Laboratories'
];

export const MOCK_PATIENTS = [
  {
    id: 'pat_101',
    patientId: 'PAT-2026-8812',
    name: 'Ramesh Shah',
    age: 58,
    gender: 'Male',
    phone: '+91 98201 44321',
    email: 'ramesh.shah@example.com',
    bloodGroup: 'B+',
    address: 'Vidyavihar East, Mumbai',
    registeredAt: '2026-08-10T09:30:00.000Z'
  },
  {
    id: 'pat_102',
    patientId: 'PAT-2026-9045',
    name: 'Priya Sharma',
    age: 34,
    gender: 'Female',
    phone: '+91 97690 12345',
    email: 'priya.s@example.com',
    bloodGroup: 'O+',
    address: 'Ghatkopar West, Mumbai',
    registeredAt: '2026-08-12T11:15:00.000Z'
  },
  {
    id: 'pat_103',
    patientId: 'PAT-2026-9110',
    name: 'Vikramaditya Mehta',
    age: 67,
    gender: 'Male',
    phone: '+91 98199 87654',
    email: 'v.mehta@example.com',
    bloodGroup: 'A+',
    address: 'Chembur Naka, Mumbai',
    registeredAt: '2026-08-14T14:20:00.000Z'
  },
  {
    id: 'pat_104',
    patientId: 'PAT-2026-9288',
    name: 'Sunita Patil',
    age: 45,
    gender: 'Female',
    phone: '+91 99304 55432',
    email: 'sunita.patil@example.com',
    bloodGroup: 'AB+',
    address: 'Sion East, Mumbai',
    registeredAt: '2026-08-16T10:00:00.000Z'
  },
  {
    id: 'pat_105',
    patientId: 'PAT-2026-9350',
    name: 'Arjun Nair',
    age: 28,
    gender: 'Male',
    phone: '+91 98920 66789',
    email: 'arjun.nair@example.com',
    bloodGroup: 'O-',
    address: 'Kurla West, Mumbai',
    registeredAt: '2026-08-18T16:45:00.000Z'
  }
];

export const STRIP_BRANDS = [
  { id: 'brand_multistix', name: 'Siemens Multistix 10SG', panels: ['10-panel'], manufacturer: 'Siemens Healthineers' },
  { id: 'brand_roche', name: 'Roche Combur-Test 10', panels: ['10-panel'], manufacturer: 'Roche Diagnostics' },
  { id: 'brand_cura14', name: 'CuraStrip Pro 14', panels: ['10-panel', '14-panel'], manufacturer: 'Cura Diagnostics' },
  { id: 'brand_dirui14', name: 'Dirui H14-MA', panels: ['14-panel'], manufacturer: 'Dirui Industrial' }
];

export const MOCK_INVENTORY = [
  {
    id: 'inv_01',
    brandId: 'brand_cura14',
    brandName: 'CuraStrip Pro 14',
    manufacturer: 'Cura Diagnostics',
    panels: ['10-panel', '14-panel'],
    batchNumber: 'CUR-14-2401',
    manufactureDate: '2026-05-01',
    expiryDate: '2027-05-01',
    quantity: 120,
    createdAt: '2026-05-01T08:00:00.000Z',
    updatedAt: '2026-05-01T08:00:00.000Z'
  },
  {
    id: 'inv_02',
    brandId: 'brand_multistix',
    brandName: 'Siemens Multistix 10SG',
    manufacturer: 'Siemens Healthineers',
    panels: ['10-panel'],
    batchNumber: 'MS10-2408',
    manufactureDate: '2026-04-15',
    expiryDate: '2027-04-15',
    quantity: 85,
    createdAt: '2026-04-15T08:00:00.000Z',
    updatedAt: '2026-04-15T08:00:00.000Z'
  },
  {
    id: 'inv_03',
    brandId: 'brand_roche',
    brandName: 'Roche Combur-Test 10',
    manufacturer: 'Roche Diagnostics',
    panels: ['10-panel'],
    batchNumber: 'RC10-2402',
    manufactureDate: '2026-03-01',
    expiryDate: '2027-03-01',
    quantity: 40,
    createdAt: '2026-03-01T08:00:00.000Z',
    updatedAt: '2026-03-01T08:00:00.000Z'
  },
  {
    id: 'inv_04',
    brandId: 'brand_dirui14',
    brandName: 'Dirui H14-MA',
    manufacturer: 'Dirui Industrial',
    panels: ['14-panel'],
    batchNumber: 'DH14-2403',
    manufactureDate: '2025-06-01',
    expiryDate: '2026-07-31',
    quantity: 15,
    createdAt: '2025-06-01T08:00:00.000Z',
    updatedAt: '2025-06-01T08:00:00.000Z'
  }
];

export const MOCK_TESTS = [
  {
    id: 'tst_9001',
    testCode: 'TEST-2026-0801',
    patientId: 'pat_101',
    patientName: 'Ramesh Shah',
    patientCode: 'PAT-2026-8812',
    panelType: '14-panel',
    stripBrand: 'CuraStrip Pro 14',
    reportDestination: 'Metropolis Healthcare',
    submittedBy: 'Ananya Deshmukh',
    submittedAt: '2026-08-19T08:30:00.000Z',
    technicianNotes: 'Patient reported mild dysuria and urgency for 2 days. Fasting morning specimen.',
    overallStatus: 'abnormal', // abnormal | normal | trace
    stripImageUrl: 'https://images.unsplash.com/photo-1579154204601-01588f351e67?auto=format&fit=crop&q=80&w=400',
    analytes: [
      { id: 'glucose', name: 'Glucose', unit: 'mg/dL', refRange: 'Negative (<50 mg/dL)', value: '250 (+)', flag: 'abnormal', score: 96, numeric: 250 },
      { id: 'protein', name: 'Protein', unit: 'mg/dL', refRange: 'Negative (<15 mg/dL)', value: '100 mg/dL (++)', flag: 'abnormal', score: 95, numeric: 100 },
      { id: 'ph', name: 'pH', unit: 'pH units', refRange: '4.5 - 8.0', value: '6.5', flag: 'normal', score: 98, numeric: 6.5 },
      { id: 'ketones', name: 'Ketones', unit: 'mg/dL', refRange: 'Negative (<5 mg/dL)', value: 'Negative', flag: 'normal', score: 99, numeric: 0 },
      { id: 'blood', name: 'Blood', unit: 'cells/µL', refRange: 'Negative (<5 cells/µL)', value: 'Trace non-hemolyzed', flag: 'trace', score: 94, numeric: 10 },
      { id: 'bilirubin', name: 'Bilirubin', unit: 'mg/dL', refRange: 'Negative (<0.2 mg/dL)', value: 'Negative', flag: 'normal', score: 98, numeric: 0 },
      { id: 'urobilinogen', name: 'Urobilinogen', unit: 'mg/dL', refRange: '0.2 - 1.0 mg/dL', value: '0.2 mg/dL (Normal)', flag: 'normal', score: 97, numeric: 0.2 },
      { id: 'nitrite', name: 'Nitrite', unit: 'Qualitative', refRange: 'Negative', value: 'Positive (UTI indicated)', flag: 'abnormal', score: 97, numeric: 1 },
      { id: 'leucocytes', name: 'Leucocytes', unit: 'cells/µL', refRange: 'Negative (<15 cells/µL)', value: '125 cells/µL (++)', flag: 'abnormal', score: 95, numeric: 125 },
      { id: 'sg', name: 'Specific Gravity', unit: 'ratio', refRange: '1.005 - 1.030', value: '1.020', flag: 'normal', score: 98, numeric: 1.020 },
      { id: 'ascorbic', name: 'Ascorbic Acid', unit: 'mg/dL', refRange: '0 - 10 mg/dL', value: '0 mg/dL', flag: 'normal', score: 98, numeric: 0 },
      { id: 'calcium', name: 'Calcium', unit: 'mg/dL', refRange: '1.0 - 10.0 mg/dL', value: '5.0 mg/dL (Normal)', flag: 'normal', score: 96, numeric: 5.0 },
      { id: 'creatinine', name: 'Creatinine', unit: 'mg/dL', refRange: '10 - 300 mg/dL', value: '200 mg/dL (High)', flag: 'abnormal', score: 94, numeric: 200 },
      { id: 'microalbumin', name: 'Microalbumin', unit: 'mg/L', refRange: '<20 mg/L', value: '50 mg/L (Abnormal)', flag: 'abnormal', score: 96, numeric: 50 }
    ],
    clinicianReview: {
      reviewed: false,
      status: 'pending', // pending | approved | flagged_retest
      reviewedBy: null,
      reviewedAt: null,
      notes: ''
    },
    auditTrail: [
      { id: 'aud_1', action: 'Test Submitted', actor: 'Ananya Deshmukh', timestamp: '2026-08-19T08:30:00.000Z', details: 'Initial POCT strip scan & submission for Metropolis Healthcare' }
    ]
  },
  {
    id: 'tst_9002',
    testCode: 'TEST-2026-0802',
    patientId: 'pat_102',
    patientName: 'Priya Sharma',
    patientCode: 'PAT-2026-9045',
    panelType: '10-panel',
    stripBrand: 'Siemens Multistix 10SG',
    reportDestination: 'Dr Lal PathLabs',
    submittedBy: 'Ananya Deshmukh',
    submittedAt: '2026-08-19T09:15:00.000Z',
    technicianNotes: 'Routine antenatal checkup. Clear midstream urine.',
    overallStatus: 'normal',
    stripImageUrl: 'https://images.unsplash.com/photo-1579154204601-01588f351e67?auto=format&fit=crop&q=80&w=400',
    analytes: [
      { id: 'glucose', name: 'Glucose', unit: 'mg/dL', refRange: 'Negative (<50 mg/dL)', value: 'Negative', flag: 'normal', score: 99, numeric: 0 },
      { id: 'protein', name: 'Protein', unit: 'mg/dL', refRange: 'Negative (<15 mg/dL)', value: 'Negative', flag: 'normal', score: 99, numeric: 0 },
      { id: 'ph', name: 'pH', unit: 'pH units', refRange: '4.5 - 8.0', value: '6.0', flag: 'normal', score: 98, numeric: 6.0 },
      { id: 'ketones', name: 'Ketones', unit: 'mg/dL', refRange: 'Negative (<5 mg/dL)', value: 'Negative', flag: 'normal', score: 99, numeric: 0 },
      { id: 'blood', name: 'Blood', unit: 'cells/µL', refRange: 'Negative (<5 cells/µL)', value: 'Negative', flag: 'normal', score: 99, numeric: 0 },
      { id: 'bilirubin', name: 'Bilirubin', unit: 'mg/dL', refRange: 'Negative (<0.2 mg/dL)', value: 'Negative', flag: 'normal', score: 98, numeric: 0 },
      { id: 'urobilinogen', name: 'Urobilinogen', unit: 'mg/dL', refRange: '0.2 - 1.0 mg/dL', value: '0.2 mg/dL (Normal)', flag: 'normal', score: 97, numeric: 0.2 },
      { id: 'nitrite', name: 'Nitrite', unit: 'Qualitative', refRange: 'Negative', value: 'Negative', flag: 'normal', score: 99, numeric: 0 },
      { id: 'leucocytes', name: 'Leucocytes', unit: 'cells/µL', refRange: 'Negative (<15 cells/µL)', value: 'Negative', flag: 'normal', score: 98, numeric: 0 },
      { id: 'sg', name: 'Specific Gravity', unit: 'ratio', refRange: '1.005 - 1.030', value: '1.015', flag: 'normal', score: 98, numeric: 1.015 }
    ],
    clinicianReview: {
      reviewed: true,
      status: 'approved',
      reviewedBy: 'Dr. Rajesh V. Kulkarni',
      reviewedAt: '2026-08-19T10:00:00.000Z',
      notes: 'Normal physiological urinalysis. No action required.'
    },
    auditTrail: [
      { id: 'aud_1', action: 'Test Submitted', actor: 'Ananya Deshmukh', timestamp: '2026-08-19T09:15:00.000Z', details: 'Submitted to Dr Lal PathLabs' },
      { id: 'aud_2', action: 'Report Approved', actor: 'Dr. Rajesh V. Kulkarni', timestamp: '2026-08-19T10:00:00.000Z', details: 'Approved without retest requirement.' }
    ]
  },
  {
    id: 'tst_9003',
    testCode: 'TEST-2026-0803',
    patientId: 'pat_103',
    patientName: 'Vikramaditya Mehta',
    patientCode: 'PAT-2026-9110',
    panelType: '14-panel',
    stripBrand: 'Dirui H14-MA',
    reportDestination: 'SRL Diagnostics',
    submittedBy: 'Ananya Deshmukh',
    submittedAt: '2026-08-18T14:30:00.000Z',
    technicianNotes: 'Diabetic kidney disease monitoring. Slight cloudiness noted.',
    overallStatus: 'abnormal',
    stripImageUrl: 'https://images.unsplash.com/photo-1579154204601-01588f351e67?auto=format&fit=crop&q=80&w=400',
    analytes: [
      { id: 'glucose', name: 'Glucose', unit: 'mg/dL', refRange: 'Negative (<50 mg/dL)', value: '500 (++)', flag: 'abnormal', score: 95, numeric: 500 },
      { id: 'protein', name: 'Protein', unit: 'mg/dL', refRange: 'Negative (<15 mg/dL)', value: '300+ mg/dL (+++)', flag: 'abnormal', score: 92, numeric: 300 },
      { id: 'ph', name: 'pH', unit: 'pH units', refRange: '4.5 - 8.0', value: '5.5', flag: 'normal', score: 97, numeric: 5.5 },
      { id: 'ketones', name: 'Ketones', unit: 'mg/dL', refRange: 'Negative (<5 mg/dL)', value: '15 mg/dL (+)', flag: 'abnormal', score: 96, numeric: 15 },
      { id: 'blood', name: 'Blood', unit: 'cells/µL', refRange: 'Negative (<5 cells/µL)', value: 'Negative', flag: 'normal', score: 98, numeric: 0 },
      { id: 'bilirubin', name: 'Bilirubin', unit: 'mg/dL', refRange: 'Negative (<0.2 mg/dL)', value: 'Negative', flag: 'normal', score: 98, numeric: 0 },
      { id: 'urobilinogen', name: 'Urobilinogen', unit: 'mg/dL', refRange: '0.2 - 1.0 mg/dL', value: '0.2 mg/dL (Normal)', flag: 'normal', score: 97, numeric: 0.2 },
      { id: 'nitrite', name: 'Nitrite', unit: 'Qualitative', refRange: 'Negative', value: 'Negative', flag: 'normal', score: 99, numeric: 0 },
      { id: 'leucocytes', name: 'Leucocytes', unit: 'cells/µL', refRange: 'Negative (<15 cells/µL)', value: 'Negative', flag: 'normal', score: 98, numeric: 0 },
      { id: 'sg', name: 'Specific Gravity', unit: 'ratio', refRange: '1.005 - 1.030', value: '1.025', flag: 'normal', score: 97, numeric: 1.025 },
      { id: 'ascorbic', name: 'Ascorbic Acid', unit: 'mg/dL', refRange: '0 - 10 mg/dL', value: '0 mg/dL', flag: 'normal', score: 98, numeric: 0 },
      { id: 'calcium', name: 'Calcium', unit: 'mg/dL', refRange: '1.0 - 10.0 mg/dL', value: '10.0 mg/dL (Borderline)', flag: 'trace', score: 94, numeric: 10.0 },
      { id: 'creatinine', name: 'Creatinine', unit: 'mg/dL', refRange: '10 - 300 mg/dL', value: '300+ mg/dL (Very High)', flag: 'abnormal', score: 91, numeric: 300 },
      { id: 'microalbumin', name: 'Microalbumin', unit: 'mg/L', refRange: '<20 mg/L', value: '150+ mg/L (Severe)', flag: 'abnormal', score: 92, numeric: 150 }
    ],
    clinicianReview: {
      reviewed: true,
      status: 'flagged_retest',
      reviewedBy: 'Dr. Rajesh V. Kulkarni',
      reviewedAt: '2026-08-18T16:00:00.000Z',
      notes: 'High glycosuria and severe microalbuminuria detected. Please collect 24h spot UACR ratio sample and flag for quantitative lab assay.'
    },
    auditTrail: [
      { id: 'aud_1', action: 'Test Submitted', actor: 'Ananya Deshmukh', timestamp: '2026-08-18T14:30:00.000Z', details: 'Submitted to SRL Diagnostics' },
      { id: 'aud_2', action: 'Flagged for Retest', actor: 'Dr. Rajesh V. Kulkarni', timestamp: '2026-08-18T16:00:00.000Z', details: 'Flagged: 24h spot UACR requested due to high microalbumin/protein.' }
    ]
  },
  {
    id: 'tst_9004',
    testCode: 'TEST-2026-0804',
    patientId: 'pat_101',
    patientName: 'Ramesh Shah',
    patientCode: 'PAT-2026-8812',
    panelType: '14-panel',
    stripBrand: 'CuraStrip Pro 14',
    reportDestination: 'In-house / K J Somaiya Hospital',
    submittedBy: 'Ananya Deshmukh',
    submittedAt: '2026-08-12T10:00:00.000Z',
    technicianNotes: 'Previous baseline visit test.',
    overallStatus: 'trace',
    stripImageUrl: 'https://images.unsplash.com/photo-1579154204601-01588f351e67?auto=format&fit=crop&q=80&w=400',
    analytes: [
      { id: 'glucose', name: 'Glucose', unit: 'mg/dL', refRange: 'Negative (<50 mg/dL)', value: '100 (Trace)', flag: 'trace', score: 94, numeric: 100 },
      { id: 'protein', name: 'Protein', unit: 'mg/dL', refRange: 'Negative (<15 mg/dL)', value: '30 mg/dL (+)', flag: 'abnormal', score: 96, numeric: 30 },
      { id: 'ph', name: 'pH', unit: 'pH units', refRange: '4.5 - 8.0', value: '6.0', flag: 'normal', score: 98, numeric: 6.0 },
      { id: 'ketones', name: 'Ketones', unit: 'mg/dL', refRange: 'Negative (<5 mg/dL)', value: 'Negative', flag: 'normal', score: 99, numeric: 0 },
      { id: 'blood', name: 'Blood', unit: 'cells/µL', refRange: 'Negative (<5 cells/µL)', value: 'Negative', flag: 'normal', score: 98, numeric: 0 },
      { id: 'bilirubin', name: 'Bilirubin', unit: 'mg/dL', refRange: 'Negative (<0.2 mg/dL)', value: 'Negative', flag: 'normal', score: 98, numeric: 0 },
      { id: 'urobilinogen', name: 'Urobilinogen', unit: 'mg/dL', refRange: '0.2 - 1.0 mg/dL', value: '0.2 mg/dL (Normal)', flag: 'normal', score: 97, numeric: 0.2 },
      { id: 'nitrite', name: 'Nitrite', unit: 'Qualitative', refRange: 'Negative', value: 'Negative', flag: 'normal', score: 99, numeric: 0 },
      { id: 'leucocytes', name: 'Leucocytes', unit: 'cells/µL', refRange: 'Negative (<15 cells/µL)', value: 'Trace (15 cells/µL)', flag: 'trace', score: 94, numeric: 15 },
      { id: 'sg', name: 'Specific Gravity', unit: 'ratio', refRange: '1.005 - 1.030', value: '1.018', flag: 'normal', score: 98, numeric: 1.018 },
      { id: 'ascorbic', name: 'Ascorbic Acid', unit: 'mg/dL', refRange: '0 - 10 mg/dL', value: '0 mg/dL', flag: 'normal', score: 98, numeric: 0 },
      { id: 'calcium', name: 'Calcium', unit: 'mg/dL', refRange: '1.0 - 10.0 mg/dL', value: '5.0 mg/dL (Normal)', flag: 'normal', score: 96, numeric: 5.0 },
      { id: 'creatinine', name: 'Creatinine', unit: 'mg/dL', refRange: '10 - 300 mg/dL', value: '100 mg/dL (Normal)', flag: 'normal', score: 97, numeric: 100 },
      { id: 'microalbumin', name: 'Microalbumin', unit: 'mg/L', refRange: '<20 mg/L', value: '20 mg/L (Borderline)', flag: 'trace', score: 95, numeric: 20 }
    ],
    clinicianReview: {
      reviewed: true,
      status: 'approved',
      reviewedBy: 'Dr. Rajesh V. Kulkarni',
      reviewedAt: '2026-08-12T11:30:00.000Z',
      notes: 'Slight trace protein. Advised increased fluid intake.'
    },
    auditTrail: [
      { id: 'aud_1', action: 'Test Submitted', actor: 'Ananya Deshmukh', timestamp: '2026-08-12T10:00:00.000Z', details: 'Submitted to K J Somaiya Hospital' },
      { id: 'aud_2', action: 'Report Approved', actor: 'Dr. Rajesh V. Kulkarni', timestamp: '2026-08-12T11:30:00.000Z', details: 'Approved with hydration advice.' }
    ]
  }
];
