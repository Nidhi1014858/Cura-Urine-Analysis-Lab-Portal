import mongoose from 'mongoose';
import { Patient } from '../models/Patient.js';
import { nextCode } from '../utils/codes.js';
import {
  cleanPatientForStorage,
  createPatientFingerprint
} from '../utils/patientNormalization.js';

const DUPLICATE_MESSAGE = 'A patient with all the same details already exists.';

export const getPatients = async (req, res, next) => {
  try {
    let query = {};
    const search = req.query.search;
    if (typeof search === 'string' && search.trim()) {
      const escaped = search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(escaped, 'i');
      query = {
        $or: [
          { name: regex },
          { patientId: regex },
          { phone: regex }
        ]
      };
    }

    const patients = await Patient.find(query).sort({ registeredAt: -1 });
    res.json(patients);
  } catch (error) {
    next(error);
  }
};

export const createPatient = async (req, res, next) => {
  try {
    const { name, age, gender, phone, email, bloodGroup, address } = req.body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ message: 'Name is required.' });
    }

    if (age === undefined || age === null || age === '' || !Number.isInteger(Number(age))) {
      return res.status(400).json({ message: 'Age is required and must be a whole number.' });
    }

    const numAge = Number(age);
    if (numAge < 0 || numAge > 150) {
      return res.status(400).json({ message: 'Age must be between 0 and 150.' });
    }

    let normalizedGender = 'Other';
    if (gender) {
      const g = String(gender).trim().toLowerCase();
      if (g === 'male') normalizedGender = 'Male';
      else if (g === 'female') normalizedGender = 'Female';
      else if (g === 'other') normalizedGender = 'Other';
      else {
        return res.status(400).json({ message: 'Gender must be Male, Female, or Other.' });
      }
    }

    if (!phone) {
      return res.status(400).json({ message: 'Phone number is required.' });
    }

    const patientData = cleanPatientForStorage({
      name,
      age: numAge,
      gender: normalizedGender,
      phone,
      email,
      bloodGroup,
      address
    });

    if (!/^\+\d{7,15}$/.test(patientData.phone)) {
      return res.status(400).json({ message: 'Phone number must include a valid country code and 7 to 15 digits.' });
    }

    if (patientData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(patientData.email)) {
      return res.status(400).json({ message: 'Please provide a valid email address.' });
    }

    const duplicateFingerprint = createPatientFingerprint(patientData);
    const candidates = await Patient.find({ age: patientData.age }).select('+duplicateFingerprint');
    const duplicate = candidates.some((candidate) => (
      candidate.duplicateFingerprint === duplicateFingerprint ||
      createPatientFingerprint(candidate) === duplicateFingerprint
    ));

    if (duplicate) {
      return res.status(409).json({ message: DUPLICATE_MESSAGE });
    }

    let patientId = req.body.patientId;
    if (patientId) {
      const existing = await Patient.findOne({ patientId });
      if (existing) {
        return res.status(409).json({ message: 'Patient with this ID already exists.' });
      }
    } else {
      patientId = await nextCode('PAT');
    }

    const patient = await Patient.create({
      patientId,
      ...patientData,
      duplicateFingerprint
    });

    res.status(201).json(patient);
  } catch (error) {
    if (
      error.code === 11000 &&
      (error.keyPattern?.duplicateFingerprint || error.keyValue?.duplicateFingerprint)
    ) {
      return res.status(409).json({ message: DUPLICATE_MESSAGE });
    }
    next(error);
  }
};

export const getPatientById = async (req, res, next) => {
  try {
    const { id } = req.params;

    let patient;
    if (mongoose.isValidObjectId(id)) {
      patient = await Patient.findById(id);
    }
    if (!patient) {
      patient = await Patient.findOne({ patientId: id });
    }

    if (!patient) {
      return res.status(404).json({ message: 'Patient not found' });
    }

    const patientObj = patient.toJSON();

    let tests = [];
    if (mongoose.models.Test) {
      const Test = mongoose.models.Test;
      const rawTests = await Test.find({
        $or: [
          { patientId: patient._id },
          { patientCode: patient.patientId }
        ]
      }).sort({ submittedAt: 1, createdAt: 1 });
      tests = rawTests.map(t => (typeof t.toJSON === 'function' ? t.toJSON() : t));
    }

    res.json({
      ...patientObj,
      tests
    });
  } catch (error) {
    next(error);
  }
};
