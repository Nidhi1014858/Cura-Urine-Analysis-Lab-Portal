import mongoose from 'mongoose';
import { Test } from '../models/Test.js';
import { Patient } from '../models/Patient.js';
import { nextCode } from '../utils/codes.js';
import {
  validateBatch,
  validateBrandPanel,
  recalculateAnalytes
} from '../utils/validation.js';

export const notImplemented = (req, res) => {
  res.status(501).json({ message: 'Not implemented yet' });
};

/**
 * POST /api/tests
 * Create a new urinalysis test record.
 * Only authenticated Technicians can create tests.
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
    } = req.body;

    if (!patientId) {
      return res.status(400).json({ message: 'Patient ID is required.' });
    }

    if (!reportDestination) {
      return res.status(400).json({ message: 'Report destination is required.' });
    }

    // 1. Validate batch details
    validateBatch({ stripBatch, manufactureDate, expiryDate });

    // 2. Validate brand and panel compatibility
    validateBrandPanel(stripBrand, panelType);

    // 3. Load Patient
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

    // 5. Generate unique test code
    const testCode = await nextCode('TEST');

    // 6. Create Test document
    const test = await Test.create({
      testCode,
      patientId: patient._id,
      patientCode: patient.patientId,
      patientName: patient.name,
      panelType,
      stripBrand,
      stripBatch,
      manufactureDate,
      expiryDate,
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

    res.status(201).json(test);
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ message: error.message });
    }
    next(error);
  }
};
