import mongoose from 'mongoose';
import { Test } from '../models/Test.js';
import { Patient } from '../models/Patient.js';
import { Inventory } from '../models/Inventory.js';
import { nextCode } from '../utils/codes.js';
import {
  validateInventoryStock,
  recalculateAnalytes
} from '../utils/validation.js';

export const notImplemented = (req, res) => {
  res.status(501).json({ message: 'Not implemented yet' });
};

/**
 * POST /api/tests
 * Create a new urinalysis test record.
 * Only authenticated Technicians can create tests.
 * Enforces database inventory reload, unexpired stock > 0 verification,
 * and atomic stock consumption.
 */
export const createTest = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authenticated.' });
    }

    if (req.user.role !== 'Technician') {
      return res.status(403).json({ message: 'You do not have permission to do this.' });
    }

    const {
      inventoryId,
      patientId,
      panelType,
      stripBrand,
      stripBatch,
      manufactureDate,
      expiryDate,
      reportDestination,
      technicianNotes,
      stripImageUrl,
      analytes: submittedAnalytes
    } = req.body || {};

    if (!patientId) {
      return res.status(400).json({ message: 'Patient ID is required.' });
    }

    if (!reportDestination) {
      return res.status(400).json({ message: 'Report destination is required.' });
    }

    if (!inventoryId) {
      return res.status(400).json({ message: 'Inventory ID is required.' });
    }

    // 1. Reload authoritative inventory record from database
    let inventory = null;
    if (mongoose.isValidObjectId(inventoryId)) {
      inventory = await Inventory.findById(inventoryId);
    }
    if (!inventory) {
      inventory = await Inventory.findOne({
        $or: [
          { _id: mongoose.isValidObjectId(inventoryId) ? inventoryId : null },
          { batchNumber: inventoryId }
        ]
      });
    }

    if (!inventory) {
      return res.status(404).json({ message: 'Inventory batch not found.' });
    }

    // 2. Validate inventory stock, expiry relative to IST, panel compatibility, and non-tampered metadata
    validateInventoryStock(inventory, {
      panelType,
      stripBrand,
      stripBatch,
      manufactureDate,
      expiryDate
    });

    // 3. Load target Patient
    let patient = null;
    if (mongoose.isValidObjectId(patientId)) {
      patient = await Patient.findById(patientId);
    }
    if (!patient) {
      patient = await Patient.findOne({ patientId });
    }

    if (!patient) {
      return res.status(404).json({ message: 'Patient not found.' });
    }

    // 4. Server-side RGB recalculation
    const { analytes, overallStatus } = recalculateAnalytes(panelType, submittedAnalytes);

    // 5. Atomic conditional stock consumption + Test creation
    // Attempts multi-document transaction when MongoDB replica set topology is available.
    // Gracefully falls back to atomic conditional update with compensating rollback on standalone topologies.
    let session = null;
    let useTransaction = false;

    try {
      session = await mongoose.startSession();
      session.startTransaction();
      useTransaction = true;
    } catch (_err) {
      if (session) {
        try {
          await session.endSession();
        } catch (_cleanupErr) {
          // Ignore session cleanup error on standalone topology
        }
        session = null;
      }
      useTransaction = false;
    }

    let test = null;
    let stockDecremented = false;

    if (useTransaction) {
      try {
        const updatedInventory = await Inventory.findOneAndUpdate(
          { _id: inventory._id, quantity: { $gt: 0 } },
          { $inc: { quantity: -1 } },
          { new: true, session }
        );

        if (!updatedInventory) {
          await session.abortTransaction();
          await session.endSession();
          return res.status(409).json({ message: 'The last strip in this batch was already consumed. Please select another batch.' });
        }

        const testCode = await nextCode('TEST');

        const [createdTest] = await Test.create(
          [
            {
              testCode,
              patientId: patient._id,
              patientCode: patient.patientId,
              patientName: patient.name,
              panelType,
              inventoryId: inventory._id,
              stripBrand: inventory.brandName,
              stripBatch: inventory.batchNumber,
              manufactureDate: inventory.manufactureDate,
              expiryDate: inventory.expiryDate,
              reportDestination,
              submittedBy: req.user.name,
              submittedByPhotoUrl: req.user.photoUrl || null,
              technicianNotes: technicianNotes || '',
              stripImageUrl: stripImageUrl || null,
              overallStatus,
              analytes,
              clinicianReview: {
                reviewed: false,
                status: 'pending',
                reviewedBy: null,
                reviewerPhotoUrl: null,
                reviewedAt: null,
                notes: ''
              },
              auditTrail: [
                {
                  id: `aud_${Date.now()}`,
                  action: 'Test Submitted',
                  actor: req.user.name,
                  timestamp: new Date(),
                  details: `Submitted ${panelType} test for ${reportDestination}`
                }
              ]
            }
          ],
          { session }
        );

        await session.commitTransaction();
        await session.endSession();
        test = createdTest;
      } catch (txnError) {
        if (session) {
          try {
            await session.abortTransaction();
            await session.endSession();
          } catch (_abortErr) {
            // Ignore abort error
          }
        }
        throw txnError;
      }
    } else {
      // Standalone topology fallback: atomic conditional decrement with compensating rollback
      const updatedInventory = await Inventory.findOneAndUpdate(
        { _id: inventory._id, quantity: { $gt: 0 } },
        { $inc: { quantity: -1 } },
        { new: true }
      );

      if (!updatedInventory) {
        return res.status(409).json({ message: 'The last strip in this batch was already consumed. Please select another batch.' });
      }

      stockDecremented = true;

      try {
        const testCode = await nextCode('TEST');

        test = await Test.create({
          testCode,
          patientId: patient._id,
          patientCode: patient.patientId,
          patientName: patient.name,
          panelType,
          inventoryId: inventory._id,
          stripBrand: inventory.brandName,
          stripBatch: inventory.batchNumber,
          manufactureDate: inventory.manufactureDate,
          expiryDate: inventory.expiryDate,
          reportDestination,
          submittedBy: req.user.name,
          submittedByPhotoUrl: req.user.photoUrl || null,
          technicianNotes: technicianNotes || '',
          stripImageUrl: stripImageUrl || null,
          overallStatus,
          analytes,
          clinicianReview: {
            reviewed: false,
            status: 'pending',
            reviewedBy: null,
            reviewerPhotoUrl: null,
            reviewedAt: null,
            notes: ''
          },
          auditTrail: [
            {
              id: `aud_${Date.now()}`,
              action: 'Test Submitted',
              actor: req.user.name,
              timestamp: new Date(),
              details: `Submitted ${panelType} test for ${reportDestination}`
            }
          ]
        });
      } catch (creationError) {
        if (stockDecremented) {
          try {
            await Inventory.findByIdAndUpdate(inventory._id, { $inc: { quantity: 1 } });
          } catch (rollbackErr) {
            console.error('Failed to compensate inventory decrement:', rollbackErr);
          }
        }
        throw creationError;
      }
    }

    res.status(201).json(test);
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ message: error.message });
    }
    next(error);
  }
};

/**
 * GET /api/tests
 * Query and filter list of urinalysis tests.
 * Supports: search, panelType, reportDestination, reviewStatus, overallStatus.
 * Treats empty filters and 'all' as no filter.
 * Sorts by submittedAt descending.
 */
export const listTests = async (req, res, next) => {
  try {
    const {
      search,
      panelType,
      reportDestination,
      reviewStatus,
      overallStatus
    } = req.query || {};

    const query = {};

    if (search && search.trim() && search.trim().toLowerCase() !== 'all') {
      const escaped = search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(escaped, 'i');
      query.$or = [
        { testCode: regex },
        { patientName: regex },
        { patientCode: regex },
        { reportDestination: regex },
        { stripBatch: regex }
      ];
    }

    if (panelType && panelType.trim() && panelType.trim().toLowerCase() !== 'all') {
      query.panelType = panelType.trim();
    }

    if (reportDestination && reportDestination.trim() && reportDestination.trim().toLowerCase() !== 'all') {
      query.reportDestination = reportDestination.trim();
    }

    if (reviewStatus && reviewStatus.trim() && reviewStatus.trim().toLowerCase() !== 'all') {
      query['clinicianReview.status'] = reviewStatus.trim();
    }

    if (overallStatus && overallStatus.trim() && overallStatus.trim().toLowerCase() !== 'all') {
      query.overallStatus = overallStatus.trim();
    }

    const tests = await Test.find(query).sort({ submittedAt: -1 });

    res.json(tests);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/tests/:id
 * Retrieve a single test by either its MongoDB _id or testCode.
 * Returns 404 if not found.
 */
export const getTest = async (req, res, next) => {
  try {
    const { id } = req.params;

    let test = null;
    if (mongoose.isValidObjectId(id)) {
      test = await Test.findById(id);
    }

    if (!test) {
      test = await Test.findOne({ testCode: id });
    }

    if (!test) {
      return res.status(404).json({ message: `Test with ID ${id} not found.` });
    }

    res.json(test);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/tests/batches/:batchNumber
 * Look up strip batch summary and history.
 * Case-insensitive exact match on stripBatch.
 * Returns null (HTTP 200) if no matches found.
 * Status rules:
 * - daysUntilExpiry < 0: 'Expired'
 * - daysUntilExpiry 0 through 7: 'Expiring soon'
 * - daysUntilExpiry > 7: 'Active'
 */
export const batchLookup = async (req, res, next) => {
  try {
    const { batchNumber } = req.params;

    if (!batchNumber || !batchNumber.trim()) {
      return res.status(200).json(null);
    }

    const escaped = batchNumber.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`^${escaped}$`, 'i');

    const tests = await Test.find({ stripBatch: regex }).sort({ submittedAt: -1 });

    if (!tests || tests.length === 0) {
      return res.status(200).json(null);
    }

    const firstTest = tests[0];

    let status = 'Unknown';
    if (firstTest.expiryDate) {
      const expiry = new Date(`${firstTest.expiryDate}T23:59:59+05:30`);
      const now = new Date();
      const daysUntilExpiry = Math.ceil((expiry.getTime() - now.getTime()) / 86400000);

      if (daysUntilExpiry < 0 || expiry < now) {
        status = 'Expired';
      } else if (daysUntilExpiry <= 7) {
        status = 'Expiring soon';
      } else {
        status = 'Active';
      }
    }

    res.json({
      batchNumber: firstTest.stripBatch,
      manufactureDate: firstTest.manufactureDate,
      expiryDate: firstTest.expiryDate,
      stripBrand: firstTest.stripBrand,
      status,
      tests
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/tests/:id/review
 * Update clinician review status for a test.
 * Allowed statuses: 'approved' | 'flagged_retest'
 */
export const reviewTest = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body || {};

    if (!status || !['approved', 'flagged_retest'].includes(status)) {
      return res.status(400).json({
        message: 'Invalid review status. Status must be either "approved" or "flagged_retest".'
      });
    }

    let test = null;
    if (mongoose.isValidObjectId(id)) {
      test = await Test.findById(id);
    }

    if (!test) {
      test = await Test.findOne({ testCode: id });
    }

    if (!test) {
      return res.status(404).json({ message: `Test with ID ${id} not found.` });
    }

    if (!req.user) {
      return res.status(401).json({ message: 'Not authenticated.' });
    }

    if (req.user.role && req.user.role !== 'Clinician') {
      return res.status(403).json({ message: 'You do not have permission to do this.' });
    }

    const reviewNotes = (typeof notes === 'string' ? notes.trim() : notes) || '';
    const now = new Date();

    test.clinicianReview = {
      reviewed: true,
      status,
      reviewedBy: req.user.name,
      reviewerPhotoUrl: req.user.photoUrl || null,
      reviewedAt: now,
      notes: reviewNotes
    };

    const action = status === 'approved' ? 'Report Approved' : 'Flagged for Retest';
    const details = reviewNotes ? `Notes: ${reviewNotes}` : `Decision: ${action}`;

    test.auditTrail.push({
      id: `aud_${Date.now()}`,
      action,
      actor: req.user.name,
      timestamp: now,
      details
    });

    await test.save();

    res.json(test);
  } catch (error) {
    next(error);
  }
};
