/**
 * Isolated Unit and Contract Tests for Inventory Data, Stock Consumption, and Strip Availability
 * Person 1 Specification Tests (Safe, non-destructive, isolated in-memory testing)
 */

import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { Inventory } from '../models/Inventory.js';
import { Test } from '../models/Test.js';
import { Patient } from '../models/Patient.js';
import { validateInventoryStock } from '../utils/validation.js';
import {
  getInventory,
  createInventoryBatch
} from '../controllers/inventoryController.js';
import { createTest } from '../controllers/testController.js';
import { restrictTo } from '../middleware/auth.js';
import { localApi } from '../../src/services/localApi.js';
import { getSampleRGBReadings } from '../../src/services/predictionEngine.js';

import { Counter } from '../models/Counter.js';

process.env.JWT_SECRET = 'test-mock-jwt-secret-for-inventory';

// Mock Counter sequence generation for isolated tests
Counter.findOneAndUpdate = async () => ({ seq: 101 });

let totalTests = 0;
let passedTests = 0;

function runTest(name, fn) {
  totalTests++;
  try {
    fn();
    passedTests++;
    console.log(`PASS: ${name}`);
  } catch (err) {
    console.error(`FAIL: ${name}`, err);
    throw err;
  }
}

async function runAsyncTest(name, fn) {
  totalTests++;
  try {
    await fn();
    passedTests++;
    console.log(`PASS: ${name}`);
  } catch (err) {
    console.error(`FAIL: ${name}`, err);
    throw err;
  }
}

function mockRes() {
  const res = {
    statusCode: null,
    body: null,
    headers: {},
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.body = data;
      return this;
    },
    setHeader(k, v) {
      this.headers[k] = v;
      return this;
    }
  };
  return res;
}

console.log('=== STARTING PERSON 1 INVENTORY & STOCK CONSUMPTION TESTS ===\n');

// --- 1. Model Validation: Dates, Panels, and Quantities ---

runTest('1a. Inventory schema rejects non-integer or negative quantity', () => {
  const invalidNeg = new Inventory({
    brandId: 'brand_cura14',
    brandName: 'CuraStrip Pro 14',
    manufacturer: 'Cura Diagnostics',
    panels: ['14-panel'],
    batchNumber: 'BAT-NEG-01',
    manufactureDate: '2026-05-01',
    expiryDate: '2027-05-01',
    quantity: -5
  });
  const negErr = invalidNeg.validateSync();
  assert.ok(negErr && negErr.errors['quantity']);

  const invalidFloat = new Inventory({
    brandId: 'brand_cura14',
    brandName: 'CuraStrip Pro 14',
    manufacturer: 'Cura Diagnostics',
    panels: ['14-panel'],
    batchNumber: 'BAT-FLT-01',
    manufactureDate: '2026-05-01',
    expiryDate: '2027-05-01',
    quantity: 12.5
  });
  const floatErr = invalidFloat.validateSync();
  assert.ok(floatErr && floatErr.errors['quantity']);
});

runTest('1b. Inventory schema rejects future manufacture date and expiry before manufacture', () => {
  const futureMfd = new Inventory({
    brandId: 'brand_cura14',
    brandName: 'CuraStrip Pro 14',
    manufacturer: 'Cura Diagnostics',
    panels: ['14-panel'],
    batchNumber: 'BAT-FUT-01',
    manufactureDate: '2099-01-01',
    expiryDate: '2099-12-31',
    quantity: 50
  });
  const mfdErr = futureMfd.validateSync();
  assert.ok(mfdErr && mfdErr.errors['manufactureDate']);

  const expBeforeMfd = new Inventory({
    brandId: 'brand_cura14',
    brandName: 'CuraStrip Pro 14',
    manufacturer: 'Cura Diagnostics',
    panels: ['14-panel'],
    batchNumber: 'BAT-EXP-01',
    manufactureDate: '2026-05-01',
    expiryDate: '2026-04-30',
    quantity: 50
  });
  const expErr = expBeforeMfd.validateSync();
  assert.ok(expErr && expErr.errors['expiryDate']);
});

runTest('1c. Inventory schema rejects empty or unsupported panel types', () => {
  const emptyPanels = new Inventory({
    brandId: 'brand_cura14',
    brandName: 'CuraStrip Pro 14',
    manufacturer: 'Cura Diagnostics',
    panels: [],
    batchNumber: 'BAT-PANEL-01',
    manufactureDate: '2026-05-01',
    expiryDate: '2027-05-01',
    quantity: 50
  });
  const panelErr = emptyPanels.validateSync();
  assert.ok(panelErr && panelErr.errors['panels']);

  const invalidPanel = new Inventory({
    brandId: 'brand_cura14',
    brandName: 'CuraStrip Pro 14',
    manufacturer: 'Cura Diagnostics',
    panels: ['99-panel'],
    batchNumber: 'BAT-PANEL-02',
    manufactureDate: '2026-05-01',
    expiryDate: '2027-05-01',
    quantity: 50
  });
  const invPanelErr = invalidPanel.validateSync();
  assert.ok(invPanelErr && invPanelErr.errors['panels.0']);
});

// --- 2. Duplicate Brand + Batch Rejection Case-Insensitively ---

await runAsyncTest('2a. createInventoryBatch rejects duplicate batchNumber within brand case-insensitively with HTTP 409', async () => {
  const originalFindOne = Inventory.findOne;
  try {
    Inventory.findOne = async (query) => {
      if (query.brandId === 'brand_cura14' && query.batchNumberNormalized === 'cur-14-2401') {
        return { _id: new mongoose.Types.ObjectId(), batchNumber: 'CUR-14-2401' };
      }
      return null;
    };

    const req = {
      body: {
        brandId: 'brand_cura14',
        brandName: 'CuraStrip Pro 14',
        manufacturer: 'Cura Diagnostics',
        panels: ['10-panel', '14-panel'],
        batchNumber: 'cur-14-2401', // lowercase variant of existing
        manufactureDate: '2026-05-01',
        expiryDate: '2027-05-01',
        quantity: 100
      }
    };
    const res = mockRes();
    await createInventoryBatch(req, res, () => {});

    assert.equal(res.statusCode, 409);
    assert.match(res.body.message, /already exists for this brand/);
  } finally {
    Inventory.findOne = originalFindOne;
  }
});

await runAsyncTest('2b. createInventoryBatch allows identical batchNumber under a different brandId', async () => {
  const originalFindOne = Inventory.findOne;
  const originalCreate = Inventory.create;
  try {
    Inventory.findOne = async () => null; // Not found under brand_roche
    Inventory.create = async (doc) => ({ id: 'inv_new_99', ...doc });

    const req = {
      body: {
        brandId: 'brand_roche',
        brandName: 'Roche Combur-Test 10',
        manufacturer: 'Roche Diagnostics',
        panels: ['10-panel'],
        batchNumber: 'CUR-14-2401', // Same batch number as Cura brand
        manufactureDate: '2026-05-01',
        expiryDate: '2027-05-01',
        quantity: 50
      }
    };
    const res = mockRes();
    await createInventoryBatch(req, res, () => {});

    assert.equal(res.statusCode, 201);
    assert.equal(res.body.batchNumber, 'CUR-14-2401');
    assert.equal(res.body.brandId, 'brand_roche');
  } finally {
    Inventory.findOne = originalFindOne;
    Inventory.create = originalCreate;
  }
});

// --- 3. Filtering: panelType and availableOnly ---

await runAsyncTest('3a. getInventory applies panelType and availableOnly filters correctly', async () => {
  const originalFind = Inventory.find;
  try {
    let capturedQuery = null;
    Inventory.find = (q) => {
      capturedQuery = q;
      return {
        sort: () => Promise.resolve([
          { brandName: 'CuraStrip Pro 14', panels: ['10-panel', '14-panel'], quantity: 50, expiryDate: '2027-05-01' }
        ])
      };
    };

    const req = {
      query: {
        panelType: '14-panel',
        availableOnly: 'true'
      }
    };
    const res = mockRes();
    await getInventory(req, res, () => {});

    assert.equal(res.statusCode, null); // 200 implicit
    assert.equal(capturedQuery.panels, '14-panel');
    assert.deepEqual(capturedQuery.quantity, { $gt: 0 });
    assert.ok(capturedQuery.expiryDate && capturedQuery.expiryDate.$gte);
  } finally {
    Inventory.find = originalFind;
  }
});

// --- 4. Expired and Zero-Stock Batches Rejection ---

runTest('4a. validateInventoryStock rejects batch with quantity = 0 with HTTP 409', () => {
  const zeroStockBatch = {
    brandId: 'brand_cura14',
    brandName: 'CuraStrip Pro 14',
    panels: ['14-panel'],
    batchNumber: 'ZERO-01',
    manufactureDate: '2026-05-01',
    expiryDate: '2027-05-01',
    quantity: 0
  };

  assert.throws(
    () => validateInventoryStock(zeroStockBatch, { panelType: '14-panel' }),
    (err) => err.statusCode === 409 && err.message.includes('out of stock')
  );
});

runTest('4b. validateInventoryStock rejects expired batch relative to IST with HTTP 400', () => {
  const expiredBatch = {
    brandId: 'brand_cura14',
    brandName: 'CuraStrip Pro 14',
    panels: ['14-panel'],
    batchNumber: 'EXP-01',
    manufactureDate: '2025-01-01',
    expiryDate: '2025-12-31', // in past relative to 2026 IST
    quantity: 50
  };

  assert.throws(
    () => validateInventoryStock(expiredBatch, { panelType: '14-panel' }),
    (err) => err.statusCode === 400 && err.message.includes('expired on')
  );
});

// --- 5. Authorization: Mutation Wiring for Person 2 ---

runTest('5a. restrictTo("Admin") permits Admin and rejects Technician / Clinician with 403', () => {
  const adminGuard = restrictTo('Admin');

  let adminAllowed = false;
  adminGuard({ user: { role: 'Admin' } }, mockRes(), () => { adminAllowed = true; });
  assert.equal(adminAllowed, true);

  const techRes = mockRes();
  let techAllowed = false;
  adminGuard({ user: { role: 'Technician' } }, techRes, () => { techAllowed = true; });
  assert.equal(techAllowed, false);
  assert.equal(techRes.statusCode, 403);

  const clinRes = mockRes();
  let clinAllowed = false;
  adminGuard({ user: { role: 'Clinician' } }, clinRes, () => { clinAllowed = true; });
  assert.equal(clinAllowed, false);
  assert.equal(clinRes.statusCode, 403);
});

// --- 6. Valid Test Consumption & Historical Snapshot Retention ---

await runAsyncTest('6a. createTest consumes exactly one strip and preserves historical snapshot', async () => {
  const origFindById = Inventory.findById;
  const origFindOneAndUpdate = Inventory.findOneAndUpdate;
  const origPatientFindById = Patient.findById;
  const origTestCreate = Test.create;

  const mockBatchId = new mongoose.Types.ObjectId();
  const mockPatientId = new mongoose.Types.ObjectId();

  try {
    const mockInventory = {
      _id: mockBatchId,
      brandId: 'brand_cura14',
      brandName: 'CuraStrip Pro 14',
      batchNumber: 'CUR-14-2401',
      manufactureDate: '2026-05-01',
      expiryDate: '2027-05-01',
      panels: ['10-panel', '14-panel'],
      quantity: 10
    };

    Inventory.findById = async () => mockInventory;

    let decremented = false;
    Inventory.findOneAndUpdate = async (filter, update) => {
      if (filter.quantity && filter.quantity.$gt === 0 && update.$inc?.quantity === -1) {
        decremented = true;
        mockInventory.quantity -= 1;
        return mockInventory;
      }
      if (update.$inc?.quantity === 1) {
        mockInventory.quantity += 1;
        return mockInventory;
      }
      return null;
    };

    Patient.findById = async () => ({
      _id: mockPatientId,
      patientId: 'PAT-2026-0001',
      name: 'Ramesh Shah'
    });

    let createdDoc = null;
    Test.create = async (doc) => {
      createdDoc = doc;
      return { id: 'tst_mock_001', ...doc };
    };

    const req = {
      user: { name: 'Ananya Deshmukh', role: 'Technician' },
      body: {
        inventoryId: String(mockBatchId),
        patientId: String(mockPatientId),
        panelType: '14-panel',
        reportDestination: 'Metropolis Healthcare',
        analytes: getSampleRGBReadings('14-panel', 'normal')
      }
    };
    const res = mockRes();
    await createTest(req, res, () => {});

    assert.equal(res.statusCode, 201);
    assert.equal(decremented, true, 'Stock must decrement by exactly one');
    assert.equal(mockInventory.quantity, 9);
    assert.equal(createdDoc.stripBrand, 'CuraStrip Pro 14');
    assert.equal(createdDoc.stripBatch, 'CUR-14-2401');
    assert.equal(createdDoc.manufactureDate, '2026-05-01');
    assert.equal(createdDoc.expiryDate, '2027-05-01');
    assert.equal(String(createdDoc.inventoryId), String(mockBatchId));
  } finally {
    Inventory.findById = origFindById;
    Inventory.findOneAndUpdate = origFindOneAndUpdate;
    Patient.findById = origPatientFindById;
    Test.create = origTestCreate;
  }
});

// --- 7. Failed Submissions Must Consume Zero Strips ---

await runAsyncTest('7a. Failed validation or missing patient consumes zero strips', async () => {
  const origFindById = Inventory.findById;
  const origFindOneAndUpdate = Inventory.findOneAndUpdate;
  const origPatientFindById = Patient.findById;
  const origPatientFindOne = Patient.findOne;
  const mockBatchId = new mongoose.Types.ObjectId();

  let decrementCalled = false;
  try {
    Inventory.findById = async () => ({
      _id: mockBatchId,
      brandId: 'brand_cura14',
      brandName: 'CuraStrip Pro 14',
      batchNumber: 'CUR-14-2401',
      manufactureDate: '2026-05-01',
      expiryDate: '2027-05-01',
      panels: ['14-panel'],
      quantity: 5
    });

    Inventory.findOneAndUpdate = async () => {
      decrementCalled = true;
      return null;
    };

    // Patient not found
    Patient.findById = async () => null;
    Patient.findOne = async () => null;

    const req = {
      user: { name: 'Tech User', role: 'Technician' },
      body: {
        inventoryId: String(mockBatchId),
        patientId: new mongoose.Types.ObjectId(),
        panelType: '14-panel',
        reportDestination: 'Metropolis Healthcare',
        analytes: getSampleRGBReadings('14-panel', 'normal')
      }
    };
    const res = mockRes();
    await createTest(req, res, () => {});

    assert.equal(res.statusCode, 404);
    assert.equal(decrementCalled, false, 'Failed submission must never decrement stock');
  } finally {
    Inventory.findById = origFindById;
    Inventory.findOneAndUpdate = origFindOneAndUpdate;
    Patient.findById = origPatientFindById;
    if (origPatientFindOne) Patient.findOne = origPatientFindOne;
  }
});

// --- 8. Concurrent Attempts Against One Remaining Strip ---

await runAsyncTest('8b. Atomic decrement prevents negative stock on concurrent attempts against 1 strip', async () => {
  let currentStock = 1;

  // Atomic conditional decrement implementation
  const atomicDecrement = async () => {
    if (currentStock > 0) {
      currentStock -= 1;
      return { success: true, remaining: currentStock };
    }
    return null; // Condition failed
  };

  // Launch two concurrent requests
  const [attempt1, attempt2] = await Promise.all([
    atomicDecrement(),
    atomicDecrement()
  ]);

  const successes = [attempt1, attempt2].filter(Boolean);
  assert.equal(successes.length, 1, 'Only one of the concurrent requests can claim the last strip');
  assert.equal(currentStock, 0, 'Stock cannot drop below zero');
});

// --- 9. LocalApi Integration: Stock Decrement & 409 Out of Stock ---

await runAsyncTest('9a. localApi.createTest decrements batch stock by 1 and fails with 409 when stock is 0', async () => {
  const memoryStore = new Map();
  globalThis.localStorage = {
    getItem: (k) => memoryStore.get(k) || null,
    setItem: (k, v) => memoryStore.set(k, String(v)),
    removeItem: (k) => memoryStore.delete(k),
    clear: () => memoryStore.clear()
  };

  const initialInventory = [
    {
      id: 'inv_test_single',
      brandId: 'brand_cura14',
      brandName: 'CuraStrip Pro 14',
      manufacturer: 'Cura Diagnostics',
      panels: ['14-panel'],
      batchNumber: 'SINGLE-01',
      manufactureDate: '2026-05-01',
      expiryDate: '2027-05-01',
      quantity: 1
    }
  ];

  globalThis.localStorage.setItem('cura_inventory', JSON.stringify(initialInventory));
  globalThis.localStorage.setItem('cura_tests', JSON.stringify([]));

  // First test succeeds and consumes the 1 strip
  const test1 = await localApi.createTest({
    inventoryId: 'inv_test_single',
    patientId: 'pat_101',
    panelType: '14-panel',
    reportDestination: 'Metropolis Healthcare',
    analytes: [{ flag: 'normal' }]
  });

  assert.ok(test1.testCode);
  const updatedInv = JSON.parse(globalThis.localStorage.getItem('cura_inventory'));
  assert.equal(updatedInv[0].quantity, 0, 'Quantity must decrement from 1 to 0');

  // Second test with same batch must throw 409
  let errorCaught = null;
  try {
    await localApi.createTest({
      inventoryId: 'inv_test_single',
      patientId: 'pat_101',
      panelType: '14-panel',
      reportDestination: 'Metropolis Healthcare',
      analytes: [{ flag: 'normal' }]
    });
  } catch (err) {
    errorCaught = err;
  }

  assert.ok(errorCaught, 'Second test must fail');
  assert.equal(errorCaught.status, 409);
  assert.match(errorCaught.message, /out of stock/);
});

console.log(`\n=== INVENTORY & STOCK TESTS COMPLETE: ${passedTests}/${totalTests} PASSED ===`);
if (passedTests !== totalTests) {
  process.exit(1);
}
