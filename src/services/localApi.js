/**
 * Mock Data Service for Cura Urinalysis Portal
 * Stores data in localStorage, isolated behind asynchronous functions.
 */
import { MOCK_USERS, MOCK_PATIENTS, MOCK_TESTS } from './seedData.js';
import { getSampleRGBReadings } from './predictionEngine.js';
import {
  cleanPatientForStorage,
  patientDetailsMatch
} from '../utils/patientNormalization.js';

const KEYS = {
  USERS: 'cura_users',
  PATIENTS: 'cura_patients',
  TESTS: 'cura_tests',
  SESSION: 'cura_session'
};

// Initialize localStorage with seed data if empty
function initializeStorage() {
  if (!localStorage.getItem(KEYS.USERS)) {
    localStorage.setItem(KEYS.USERS, JSON.stringify(MOCK_USERS));
  }
  if (!localStorage.getItem(KEYS.PATIENTS)) {
    localStorage.setItem(KEYS.PATIENTS, JSON.stringify(MOCK_PATIENTS));
  }
  if (!localStorage.getItem(KEYS.TESTS)) {
    localStorage.setItem(KEYS.TESTS, JSON.stringify(MOCK_TESTS));
  }
  // Backfill traceability fields for existing demo/local records.
  const tests = JSON.parse(localStorage.getItem(KEYS.TESTS) || '[]');
  const enriched = tests.map((test, index) => test.stripBatch ? test : ({
    ...test,
    stripBatch: `CUR-${test.stripBrand?.includes('Cura') ? '14' : '10'}-${String(2401 + (index % 3)).padStart(4, '0')}`,
    manufactureDate: index === 3 ? '2025-06-01' : '2026-05-01',
    expiryDate: index === 3 ? '2026-07-31' : '2027-05-01'
  }));
  localStorage.setItem(KEYS.TESTS, JSON.stringify(enriched));
}

// Auto-initialize
initializeStorage();

const delay = (ms = 150) => new Promise((resolve) => setTimeout(resolve, ms));

export const localApi = {
  // --- AUTH & USER PROFILE ---
  async login(email, password) {
    await delay();
    const users = JSON.parse(localStorage.getItem(KEYS.USERS) || '[]');
    const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());

    if (!user) {
      throw new Error('No user found with this email address.');
    }
    if (user.password !== password) {
      throw new Error('Invalid password.');
    }

    // The account record is the sole authority for its role.
    localStorage.setItem(KEYS.SESSION, JSON.stringify(user));
    return user;
  },

  async signup({ name, email, password, role, designation, department }) {
    await delay();
    const users = JSON.parse(localStorage.getItem(KEYS.USERS) || '[]');
    const existing = users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (existing) {
      throw new Error('An account with this email already exists.');
    }

    const newUser = {
      id: `usr_${Date.now()}`,
      name,
      email,
      password,
      role: role || 'Technician',
      designation: designation || (role === 'Clinician' ? 'Consultant Pathologist' : 'POCT Technician'),
      department: department || 'Clinical Pathology',
      photoUrl: null
    };

    users.push(newUser);
    localStorage.setItem(KEYS.USERS, JSON.stringify(users));
    localStorage.setItem(KEYS.SESSION, JSON.stringify(newUser));
    return newUser;
  },

  async logout() {
    await delay(50);
    localStorage.removeItem(KEYS.SESSION);
    return true;
  },

  async getCurrentUser() {
    await delay(50);
    const session = localStorage.getItem(KEYS.SESSION);
    if (!session) {
      return null;
    }
    const sessionUser = JSON.parse(session);
    const users = JSON.parse(localStorage.getItem(KEYS.USERS) || '[]');
    // Refresh the session from its account record so a stale demo session cannot override role.
    const account = users.find((user) => user.id === sessionUser.id || user.email === sessionUser.email);
    if (account) {
      localStorage.setItem(KEYS.SESSION, JSON.stringify(account));
      return account;
    }
    return sessionUser;
  },

  async updateProfile(userId, updates) {
    await delay();
    const users = JSON.parse(localStorage.getItem(KEYS.USERS) || '[]');
    const index = users.findIndex(u => u.id === userId);
    if (index === -1) {
      throw new Error('User not found');
    }

    // Roles are assigned at account creation and are intentionally immutable.
    const { role: _ignoredRole, password: _ignoredPassword, ...profileUpdates } = updates;
    const updatedUser = {
      ...users[index],
      ...profileUpdates
    };

    users[index] = updatedUser;
    localStorage.setItem(KEYS.USERS, JSON.stringify(users));

    // Attribution avatars are stored with test records for display; keep them in sync
    // when the account photo is changed or removed.
    if (Object.prototype.hasOwnProperty.call(profileUpdates, 'photoUrl')) {
      const tests = JSON.parse(localStorage.getItem(KEYS.TESTS) || '[]').map((test) => ({
        ...test,
        submittedByPhotoUrl: test.submittedBy === updatedUser.name ? updatedUser.photoUrl : test.submittedByPhotoUrl,
        clinicianReview: test.clinicianReview?.reviewedBy === updatedUser.name
          ? { ...test.clinicianReview, reviewerPhotoUrl: updatedUser.photoUrl }
          : test.clinicianReview
      }));
      localStorage.setItem(KEYS.TESTS, JSON.stringify(tests));
    }

    // Update current session if matching
    const currentSession = JSON.parse(localStorage.getItem(KEYS.SESSION) || '{}');
    if (currentSession.id === userId) {
      localStorage.setItem(KEYS.SESSION, JSON.stringify({ ...currentSession, ...updatedUser }));
    }

    return updatedUser;
  },

  async changePassword(userId, currentPassword, newPassword) {
    await delay();
    const users = JSON.parse(localStorage.getItem(KEYS.USERS) || '[]');
    const index = users.findIndex((user) => user.id === userId);
    if (index === -1) throw new Error('User not found');
    if (users[index].password !== currentPassword) throw new Error('Current password is incorrect.');

    users[index] = { ...users[index], password: newPassword };
    localStorage.setItem(KEYS.USERS, JSON.stringify(users));

    const session = JSON.parse(localStorage.getItem(KEYS.SESSION) || '{}');
    if (session.id === userId) localStorage.setItem(KEYS.SESSION, JSON.stringify(users[index]));
    return users[index];
  },

  // --- TESTS ---
  async getTests(filters = {}) {
    await delay();
    let tests = JSON.parse(localStorage.getItem(KEYS.TESTS) || '[]');

    if (filters.search) {
      const q = filters.search.toLowerCase();
      tests = tests.filter(t => 
        t.testCode.toLowerCase().includes(q) ||
        t.patientName.toLowerCase().includes(q) ||
        t.patientCode.toLowerCase().includes(q) ||
        t.reportDestination.toLowerCase().includes(q) ||
        t.stripBatch?.toLowerCase().includes(q)
      );
    }

    if (filters.panelType && filters.panelType !== 'all') {
      tests = tests.filter(t => t.panelType === filters.panelType);
    }

    if (filters.reportDestination && filters.reportDestination !== 'all') {
      tests = tests.filter(t => t.reportDestination === filters.reportDestination);
    }

    if (filters.reviewStatus && filters.reviewStatus !== 'all') {
      tests = tests.filter(t => t.clinicianReview.status === filters.reviewStatus);
    }

    if (filters.overallStatus && filters.overallStatus !== 'all') {
      tests = tests.filter(t => t.overallStatus === filters.overallStatus);
    }

    // Sort newest first
    return tests.sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));
  },

  async getTestById(id) {
    await delay();
    const tests = JSON.parse(localStorage.getItem(KEYS.TESTS) || '[]');
    const test = tests.find(t => t.id === id);
    if (!test) throw new Error(`Test with ID ${id} not found.`);
    return test;
  },

  async createTest(testData) {
    await delay();
    const today = new Date().toISOString().slice(0, 10);
    if (!testData.stripBatch || !testData.manufactureDate || !testData.expiryDate) {
      throw new Error('Strip batch number, manufacture date, and expiry date are required.');
    }
    if (testData.expiryDate < today) {
      throw new Error(`This strip batch expired on ${testData.expiryDate} — testing with an expired strip may produce unreliable results. Submission blocked.`);
    }
    if (testData.manufactureDate > today || testData.manufactureDate > testData.expiryDate) {
      throw new Error('Manufacture date must not be in the future or after the expiry date.');
    }
    const tests = JSON.parse(localStorage.getItem(KEYS.TESTS) || '[]');

    // Calculate overall status based on analyte flags
    const hasAbnormal = testData.analytes.some(a => a.flag === 'abnormal');
    const hasTrace = testData.analytes.some(a => a.flag === 'trace');
    const overallStatus = hasAbnormal ? 'abnormal' : (hasTrace ? 'trace' : 'normal');

    const newTest = {
      id: `tst_${Date.now()}`,
      testCode: `TEST-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      submittedAt: new Date().toISOString(),
      overallStatus,
      ...testData,
      clinicianReview: {
        reviewed: false,
        status: 'pending',
        reviewedBy: null,
        reviewedAt: null,
        notes: ''
      },
      auditTrail: [
        {
          id: `aud_${Date.now()}`,
          action: 'Test Submitted',
          actor: testData.submittedBy || 'Technician',
          timestamp: new Date().toISOString(),
          details: `Submitted ${testData.panelType} test for ${testData.reportDestination}`
        }
      ]
    };

    tests.unshift(newTest);
    localStorage.setItem(KEYS.TESTS, JSON.stringify(tests));
    return newTest;
  },

  async updateClinicianReview(testId, { status, notes, reviewerName, reviewerPhotoUrl }) {
    await delay();
    const tests = JSON.parse(localStorage.getItem(KEYS.TESTS) || '[]');
    const index = tests.findIndex(t => t.id === testId);
    if (index === -1) throw new Error('Test not found');

    const test = tests[index];
    const now = new Date().toISOString();

    test.clinicianReview = {
      reviewed: true,
      status, // 'approved' | 'flagged_retest'
      reviewedBy: reviewerName || 'Dr. Reviewer',
      reviewerPhotoUrl: reviewerPhotoUrl || null,
      reviewedAt: now,
      notes: notes || ''
    };

    const actionText = status === 'approved' ? 'Report Approved' : 'Flagged for Retest';
    test.auditTrail.push({
      id: `aud_${Date.now()}`,
      action: actionText,
      actor: reviewerName || 'Dr. Reviewer',
      timestamp: now,
      details: notes ? `Notes: ${notes}` : `Decision: ${actionText}`
    });

    tests[index] = test;
    localStorage.setItem(KEYS.TESTS, JSON.stringify(tests));
    return test;
  },

  async getBatchSummary(batchNumber) {
    await delay();
    const normalised = batchNumber.trim().toLowerCase();
    const tests = JSON.parse(localStorage.getItem(KEYS.TESTS) || '[]').filter((test) => test.stripBatch?.toLowerCase() === normalised);
    if (!tests.length) return null;
    const batch = tests[0];
    const expiry = batch.expiryDate ? new Date(`${batch.expiryDate}T23:59:59`) : null;
    const daysUntilExpiry = expiry ? Math.ceil((expiry - new Date()) / 86400000) : null;
    const status = !expiry ? 'Unknown' : daysUntilExpiry < 0 ? 'Expired' : daysUntilExpiry <= 7 ? 'Expiring soon' : 'Active';
    return { batchNumber: batch.stripBatch, manufactureDate: batch.manufactureDate, expiryDate: batch.expiryDate, stripBrand: batch.stripBrand, status, tests };
  },

  // --- PATIENTS ---
  async getPatients(filters = {}) {
    await delay();
    let patients = JSON.parse(localStorage.getItem(KEYS.PATIENTS) || '[]');

    if (filters.search) {
      const q = filters.search.toLowerCase();
      patients = patients.filter(p => 
        p.name.toLowerCase().includes(q) ||
        p.patientId.toLowerCase().includes(q) ||
        p.phone?.includes(q)
      );
    }

    return patients.sort((a, b) => new Date(b.registeredAt) - new Date(a.registeredAt));
  },

  async getPatientById(id) {
    await delay();
    const patients = JSON.parse(localStorage.getItem(KEYS.PATIENTS) || '[]');
    const patient = patients.find(p => p.id === id || p.patientId === id);
    if (!patient) throw new Error('Patient not found');

    // Get all tests for this patient
    const tests = JSON.parse(localStorage.getItem(KEYS.TESTS) || '[]');
    const patientTests = tests
      .filter(t => t.patientId === patient.id || t.patientCode === patient.patientId)
      .sort((a, b) => new Date(a.submittedAt) - new Date(b.submittedAt)); // Oldest to newest for trend chart

    return {
      ...patient,
      tests: patientTests
    };
  },

  async createPatient(patientData) {
    await delay();
    const patients = JSON.parse(localStorage.getItem(KEYS.PATIENTS) || '[]');

    const cleaned = cleanPatientForStorage(patientData);
    if (!cleaned.name || !Number.isInteger(cleaned.age) || cleaned.age < 0 || cleaned.age > 150) {
      throw new Error('Name and a valid whole-number age between 0 and 150 are required.');
    }
    if (!/^\+\d{7,15}$/.test(cleaned.phone)) {
      throw new Error('Phone number must include a valid country code and 7 to 15 digits.');
    }
    if (cleaned.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleaned.email)) {
      throw new Error('Please provide a valid email address.');
    }

    if (patients.some((patient) => patientDetailsMatch(patient, cleaned))) {
      const error = new Error('A patient with all the same details already exists.');
      error.status = 409;
      throw error;
    }

    const newPatient = {
      id: `pat_${Date.now()}`,
      patientId: `PAT-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      registeredAt: new Date().toISOString(),
      ...cleaned
    };

    patients.unshift(newPatient);
    localStorage.setItem(KEYS.PATIENTS, JSON.stringify(patients));
    return newPatient;
  },

  // --- DASHBOARD STATS ---
  async getDashboardStats() {
    await delay();
    const tests = JSON.parse(localStorage.getItem(KEYS.TESTS) || '[]');
    const patients = JSON.parse(localStorage.getItem(KEYS.PATIENTS) || '[]');

    const todayStr = new Date().toISOString().split('T')[0];
    const todayTests = tests.filter(t => t.submittedAt.startsWith(todayStr));
    const pendingReviews = tests.filter(t => t.clinicianReview.status === 'pending');
    const abnormalTests = tests.filter(t => t.overallStatus === 'abnormal');

    return {
      totalTestsCount: tests.length,
      todayTestsCount: todayTests.length,
      pendingReviewsCount: pendingReviews.length,
      abnormalCount: abnormalTests.length,
      totalPatientsCount: patients.length,
      recentTests: tests.slice(0, 5),
      pendingReviewQueue: pendingReviews.sort((a, b) => {
        // Sort abnormal first in review queue
        if (a.overallStatus === 'abnormal' && b.overallStatus !== 'abnormal') return -1;
        if (a.overallStatus !== 'abnormal' && b.overallStatus === 'abnormal') return 1;
        return new Date(b.submittedAt) - new Date(a.submittedAt);
      })
    };
  },

  // --- RGB DATASET ---
  async getRgbDataset() {
    await delay();
    return [
      {
        id: 'normal-001',
        label: 'Normal hydration baseline',
        status: 'normal',
        rgbReadings: getSampleRGBReadings('14-panel', 'normal')
      },
      {
        id: 'abnormal-001',
        label: 'High glucose / protein clinical profile',
        status: 'abnormal',
        rgbReadings: getSampleRGBReadings('14-panel', 'abnormal')
      },
      {
        id: 'mixed-001',
        label: 'Suspected UTI & microalbuminuria profile',
        status: 'mixed',
        rgbReadings: getSampleRGBReadings('14-panel', 'mixed')
      }
    ];
  }
};
