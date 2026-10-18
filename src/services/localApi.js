/**
 * Mock Data Service for Cura Urinalysis Portal
 * Stores data in localStorage, isolated behind asynchronous functions.
 */
import { MOCK_USERS, MOCK_PATIENTS, MOCK_TESTS, MOCK_INVENTORY } from './seedData.js';
import { getSampleRGBReadings } from './predictionEngine.js';
import {
  cleanPatientForStorage,
  patientDetailsMatch
} from '../utils/patientNormalization.js';
import { getTodayIST } from '../utils/formatters.js';

const KEYS = {
  USERS: 'cura_users',
  PATIENTS: 'cura_patients',
  TESTS: 'cura_tests',
  SESSION: 'cura_session',
  INVENTORY: 'cura_inventory'
};

// Initialize localStorage with seed data if empty
function initializeStorage() {
  if (typeof localStorage === 'undefined') return;
  const storedUsers = localStorage.getItem(KEYS.USERS);
  if (!storedUsers) {
    localStorage.setItem(KEYS.USERS, JSON.stringify(MOCK_USERS));
  } else {
    const users = JSON.parse(storedUsers || '[]');
    let updated = false;
    for (const seedUser of MOCK_USERS) {
      if (!users.some(u => u.email.toLowerCase() === seedUser.email.toLowerCase())) {
        users.push(seedUser);
        updated = true;
      }
    }
    if (updated) {
      localStorage.setItem(KEYS.USERS, JSON.stringify(users));
    }
  }
  if (!localStorage.getItem(KEYS.PATIENTS)) {
    localStorage.setItem(KEYS.PATIENTS, JSON.stringify(MOCK_PATIENTS));
  }
  if (!localStorage.getItem(KEYS.TESTS)) {
    localStorage.setItem(KEYS.TESTS, JSON.stringify(MOCK_TESTS));
  }
  if (!localStorage.getItem(KEYS.INVENTORY)) {
    localStorage.setItem(KEYS.INVENTORY, JSON.stringify(MOCK_INVENTORY));
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

function isValidCalendarDate(value) {
  if (typeof value !== 'string') return false;
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return false;
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  return date.getUTCFullYear() === Number(match[1]) &&
    date.getUTCMonth() === Number(match[2]) - 1 &&
    date.getUTCDate() === Number(match[3]);
}

function hasValidPanels(panels) {
  return Array.isArray(panels) &&
    panels.length > 0 &&
    panels.every((panel) => ['10-panel', '14-panel'].includes(panel));
}

function requireAuthUser() {
  if (typeof localStorage === 'undefined') {
    const error = new Error('Not authenticated.');
    error.status = 401;
    throw error;
  }
  const session = localStorage.getItem(KEYS.SESSION);
  if (!session) {
    const error = new Error('Not authenticated.');
    error.status = 401;
    throw error;
  }
  const sessionUser = JSON.parse(session);
  const users = JSON.parse(localStorage.getItem(KEYS.USERS) || '[]');
  const currentUser = users.find((u) => u.id === sessionUser.id || u.email?.toLowerCase() === sessionUser.email?.toLowerCase()) || sessionUser;
  return currentUser;
}

function requireAdminUser() {
  const user = requireAuthUser();
  if (user?.role !== 'Admin') {
    const error = new Error('You do not have permission to do this.');
    error.status = 403;
    throw error;
  }
  return user;
}

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
    if (role !== undefined && role !== 'Technician' && role !== 'Clinician') {
      throw new Error('Role must be Technician or Clinician.');
    }
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
    const currentUser = requireAuthUser();
    if (currentUser?.role !== 'Technician') {
      const error = new Error('You do not have permission to do this.');
      error.status = 403;
      throw error;
    }

    if (!testData) {
      const error = new Error('Test data is required.');
      error.status = 400;
      throw error;
    }

    if (!testData.patientId) {
      const error = new Error('Patient ID is required.');
      error.status = 400;
      throw error;
    }

    if (!testData.reportDestination) {
      const error = new Error('Report destination is required.');
      error.status = 400;
      throw error;
    }

    if (!testData.inventoryId) {
      const error = new Error('Inventory ID is required.');
      error.status = 400;
      throw error;
    }

    // Reload authoritative inventory from local storage
    const inventoryList = JSON.parse(localStorage.getItem(KEYS.INVENTORY) || '[]');
    const batchIndex = inventoryList.findIndex(
      (b) => b.id === testData.inventoryId || b._id === testData.inventoryId || b.batchNumber === testData.inventoryId
    );

    if (batchIndex === -1) {
      const error = new Error('Inventory batch not found.');
      error.status = 404;
      throw error;
    }

    const batch = inventoryList[batchIndex];

    if (Number(batch.quantity) <= 0) {
      const error = new Error('The selected strip batch is out of stock. Please select an available batch.');
      error.status = 409;
      error.statusCode = 409;
      throw error;
    }

    const today = getTodayIST ? getTodayIST() : new Date().toISOString().slice(0, 10);
    if (batch.expiryDate < today) {
      const error = new Error(`This strip batch expired on ${batch.expiryDate} — testing with an expired strip may produce unreliable results. Submission blocked.`);
      error.status = 400;
      throw error;
    }

    if (batch.manufactureDate > today || batch.manufactureDate > batch.expiryDate) {
      const error = new Error('Manufacture date must not be in the future or after the expiry date.');
      error.status = 400;
      throw error;
    }

    if (testData.panelType && (!batch.panels || !batch.panels.includes(testData.panelType))) {
      const error = new Error(`The selected strip batch does not support ${testData.panelType}.`);
      error.status = 400;
      throw error;
    }

    const submittedTraceability = {
      stripBrand: batch.brandName,
      stripBatch: batch.batchNumber,
      manufactureDate: batch.manufactureDate,
      expiryDate: batch.expiryDate
    };
    for (const [field, authoritativeValue] of Object.entries(submittedTraceability)) {
      if (testData[field] && testData[field] !== authoritativeValue) {
        const error = new Error(`Submitted ${field} does not match the selected inventory batch.`);
        error.status = 400;
        throw error;
      }
    }

    if (!Array.isArray(testData.analytes) || testData.analytes.length === 0) {
      const error = new Error('Analyte readings are required.');
      error.status = 400;
      throw error;
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
      inventoryId: batch.id || batch._id,
      stripBrand: batch.brandName,
      stripBatch: batch.batchNumber,
      manufactureDate: batch.manufactureDate,
      expiryDate: batch.expiryDate,
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
          actor: testData.submittedBy || currentUser.name || 'Technician',
          timestamp: new Date().toISOString(),
          details: `Submitted ${testData.panelType} test for ${testData.reportDestination}`
        }
      ]
    };

    // Commit the inventory decrement and test record together as closely as localStorage
    // permits. If the test write fails, restore the original inventory snapshot.
    const originalInventoryJson = JSON.stringify(inventoryList);
    batch.quantity = Number(batch.quantity) - 1;
    batch.updatedAt = new Date().toISOString();
    inventoryList[batchIndex] = batch;
    tests.unshift(newTest);

    localStorage.setItem(KEYS.INVENTORY, JSON.stringify(inventoryList));
    try {
      localStorage.setItem(KEYS.TESTS, JSON.stringify(tests));
    } catch (error) {
      localStorage.setItem(KEYS.INVENTORY, originalInventoryJson);
      throw error;
    }
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

  async updatePatient(id, patientUpdates) {
    await delay();
    const patients = JSON.parse(localStorage.getItem(KEYS.PATIENTS) || '[]');
    const index = patients.findIndex(p => p.id === id || p.patientId === id);
    if (index === -1) throw new Error('Patient not found');

    const existing = patients[index];
    const numAge = patientUpdates.age !== undefined ? Number(patientUpdates.age) : existing.age;
    if (patientUpdates.name !== undefined && !patientUpdates.name.trim()) {
      throw new Error('Name is required and cannot be empty.');
    }
    if (patientUpdates.age !== undefined && (isNaN(numAge) || numAge < 0 || numAge > 150)) {
      throw new Error('Age must be between 0 and 150.');
    }
    if (patientUpdates.email && patientUpdates.email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(patientUpdates.email.trim())) {
        throw new Error('Please provide a valid email address.');
      }
    }

    const mergedPatient = cleanPatientForStorage({
      ...existing,
      ...patientUpdates,
      age: numAge,
      gender: patientUpdates.gender || existing.gender
    });

    if (!/^\+\d{7,15}$/.test(mergedPatient.phone)) {
      throw new Error('Phone number must include a valid country code and 7 to 15 digits.');
    }

    if (patients.some((candidate, candidateIndex) => (
      candidateIndex !== index && patientDetailsMatch(candidate, mergedPatient)
    ))) {
      const error = new Error('A patient with all the same details already exists.');
      error.status = 409;
      throw error;
    }

    const updated = {
      ...mergedPatient,
      id: existing.id,
      patientId: existing.patientId,
      registeredAt: existing.registeredAt
    };

    patients[index] = updated;
    localStorage.setItem(KEYS.PATIENTS, JSON.stringify(patients));

    if (patientUpdates.name && patientUpdates.name.trim() !== existing.name) {
      const tests = JSON.parse(localStorage.getItem(KEYS.TESTS) || '[]');
      const updatedTests = tests.map(t => {
        if (t.patientId === existing.id || t.patientCode === existing.patientId) {
          return { ...t, patientName: updated.name };
        }
        return t;
      });
      localStorage.setItem(KEYS.TESTS, JSON.stringify(updatedTests));
    }

    const tests = JSON.parse(localStorage.getItem(KEYS.TESTS) || '[]');
    const patientTests = tests
      .filter(t => t.patientId === updated.id || t.patientCode === updated.patientId)
      .sort((a, b) => new Date(a.submittedAt) - new Date(b.submittedAt));

    return {
      ...updated,
      tests: patientTests
    };
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
  },

  // --- INVENTORY MANAGEMENT (Rimjhim API Contract) ---
  async getInventory(filters = {}) {
    await delay();
    requireAuthUser();
    let items = JSON.parse(localStorage.getItem(KEYS.INVENTORY) || '[]');
    const today = getTodayIST ? getTodayIST() : new Date().toISOString().slice(0, 10);

    if (filters.panelType && filters.panelType !== 'all') {
      items = items.filter((item) => Array.isArray(item.panels) && item.panels.includes(filters.panelType));
    }

    if (filters.availableOnly === true || filters.availableOnly === 'true') {
      items = items.filter((item) => Number(item.quantity) > 0 && item.expiryDate >= today);
    }

    if (filters.search) {
      const q = String(filters.search).toLowerCase().trim();
      items = items.filter((item) =>
        item.batchNumber?.toLowerCase().includes(q) ||
        item.brandName?.toLowerCase().includes(q) ||
        item.manufacturer?.toLowerCase().includes(q)
      );
    }

    return items;
  },

  async getInventoryById(id) {
    await delay();
    requireAuthUser();
    const items = JSON.parse(localStorage.getItem(KEYS.INVENTORY) || '[]');
    const item = items.find((it) => it.id === id || it._id === id);
    if (!item) {
      const error = new Error(`Inventory batch with ID ${id} not found.`);
      error.status = 404;
      throw error;
    }
    return item;
  },

  async createInventoryBatch(batchData) {
    await delay();
    requireAdminUser();

    if (!batchData) {
      const error = new Error('Batch data is required.');
      error.status = 400;
      throw error;
    }

    const {
      brandId,
      brandName,
      manufacturer,
      panels,
      manufactureDate,
      expiryDate,
      quantity
    } = batchData;

    const batchNumber = batchData.batchNumber?.trim();

    if (!brandId || !brandName || !manufacturer || !batchNumber || !manufactureDate || !expiryDate) {
      const error = new Error('All inventory batch fields are required.');
      error.status = 400;
      throw error;
    }

    const panelList = Array.isArray(panels) ? panels : (panels ? [panels] : []);
    if (!hasValidPanels(panelList)) {
      const error = new Error('At least one compatible panel type must be specified, using only 10-panel or 14-panel.');
      error.status = 400;
      throw error;
    }

    const numQty = Number(quantity);
    if (!Number.isInteger(numQty) || numQty < 0) {
      const error = new Error('Quantity must be a non-negative integer.');
      error.status = 400;
      throw error;
    }

    const today = getTodayIST ? getTodayIST() : new Date().toISOString().slice(0, 10);
    if (!isValidCalendarDate(manufactureDate) || !isValidCalendarDate(expiryDate)) {
      const error = new Error('Manufacture and expiry dates must be valid calendar dates in YYYY-MM-DD format.');
      error.status = 400;
      throw error;
    }
    if (manufactureDate > today) {
      const error = new Error('Manufacture date cannot be in the future.');
      error.status = 400;
      throw error;
    }

    if (expiryDate < manufactureDate) {
      const error = new Error('Expiry date cannot precede manufacture date.');
      error.status = 400;
      throw error;
    }

    const normalizedBrandId = brandId.trim().toLowerCase();
    const items = JSON.parse(localStorage.getItem(KEYS.INVENTORY) || '[]');
    const duplicate = items.find(
      (it) => it.brandId?.trim().toLowerCase() === normalizedBrandId && it.batchNumber?.trim().toLowerCase() === batchNumber.toLowerCase()
    );
    if (duplicate) {
      const error = new Error(`A batch with number "${batchNumber}" already exists for this brand.`);
      error.status = 409;
      throw error;
    }

    const now = new Date().toISOString();
    const newItem = {
      id: `inv_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      brandId: normalizedBrandId,
      brandName,
      manufacturer,
      panels: panelList,
      batchNumber,
      manufactureDate,
      expiryDate,
      quantity: numQty,
      createdAt: now,
      updatedAt: now
    };

    items.push(newItem);
    localStorage.setItem(KEYS.INVENTORY, JSON.stringify(items));
    return newItem;
  },

  async updateInventoryBatch(id, updates = {}) {
    await delay();
    requireAdminUser();

    const items = JSON.parse(localStorage.getItem(KEYS.INVENTORY) || '[]');
    const index = items.findIndex((it) => it.id === id || it._id === id);
    if (index === -1) {
      const error = new Error(`Inventory batch with ID ${id} not found.`);
      error.status = 404;
      throw error;
    }

    const existing = items[index];

    if (updates.quantity !== undefined) {
      const numQty = Number(updates.quantity);
      if (!Number.isInteger(numQty) || numQty < 0) {
        const error = new Error('Quantity must be a non-negative integer.');
        error.status = 400;
        throw error;
      }
      existing.quantity = numQty;
    }

    if (updates.batchNumber !== undefined) {
      const newBatchNumber = updates.batchNumber.trim();
      if (!newBatchNumber) {
        const error = new Error('Batch number cannot be empty.');
        error.status = 400;
        throw error;
      }
      const targetBrandId = (updates.brandId || existing.brandId).trim().toLowerCase();
      const duplicate = items.find(
        (it) => (it.id !== id && it._id !== id) &&
                it.brandId?.trim().toLowerCase() === targetBrandId &&
                it.batchNumber?.trim().toLowerCase() === newBatchNumber.toLowerCase()
      );
      if (duplicate) {
        const error = new Error(`A batch with number "${newBatchNumber}" already exists for this brand.`);
        error.status = 409;
        throw error;
      }
      existing.batchNumber = newBatchNumber;
    }

    const effectiveMfd = updates.manufactureDate || existing.manufactureDate;
    const effectiveExp = updates.expiryDate || existing.expiryDate;
    const today = getTodayIST ? getTodayIST() : new Date().toISOString().slice(0, 10);

    if (!isValidCalendarDate(effectiveMfd) || !isValidCalendarDate(effectiveExp)) {
      const error = new Error('Manufacture and expiry dates must be valid calendar dates in YYYY-MM-DD format.');
      error.status = 400;
      throw error;
    }

    if (updates.manufactureDate !== undefined && effectiveMfd > today) {
      const error = new Error('Manufacture date cannot be in the future.');
      error.status = 400;
      throw error;
    }

    if ((updates.manufactureDate !== undefined || updates.expiryDate !== undefined) && effectiveExp < effectiveMfd) {
      const error = new Error('Expiry date cannot precede manufacture date.');
      error.status = 400;
      throw error;
    }

    if (updates.manufactureDate !== undefined) existing.manufactureDate = updates.manufactureDate;
    if (updates.expiryDate !== undefined) existing.expiryDate = updates.expiryDate;
    if (updates.brandName !== undefined) existing.brandName = updates.brandName;
    if (updates.brandId !== undefined) existing.brandId = updates.brandId.trim().toLowerCase();
    if (updates.manufacturer !== undefined) existing.manufacturer = updates.manufacturer;
    if (updates.panels !== undefined) {
      const panelList = Array.isArray(updates.panels) ? updates.panels : [updates.panels];
      if (!hasValidPanels(panelList)) {
        const error = new Error('At least one compatible panel type must be specified, using only 10-panel or 14-panel.');
        error.status = 400;
        throw error;
      }
      existing.panels = panelList;
    }

    existing.updatedAt = new Date().toISOString();
    items[index] = existing;
    localStorage.setItem(KEYS.INVENTORY, JSON.stringify(items));
    return existing;
  },

  async deleteInventoryBatch(id) {
    await delay();
    requireAdminUser();

    const items = JSON.parse(localStorage.getItem(KEYS.INVENTORY) || '[]');
    const index = items.findIndex((it) => it.id === id || it._id === id);
    if (index === -1) {
      const error = new Error(`Inventory batch with ID ${id} not found.`);
      error.status = 404;
      throw error;
    }

    const removed = items.splice(index, 1)[0];
    localStorage.setItem(KEYS.INVENTORY, JSON.stringify(items));
    return { message: 'Inventory batch deleted successfully.', id: removed.id || id };
  }
};
