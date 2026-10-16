import mongoose from 'mongoose';
import { Patient } from '../models/Patient.js';
import { nextCode } from '../utils/codes.js';

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

    if (age === undefined || age === null || age === '' || isNaN(Number(age))) {
      return res.status(400).json({ message: 'Age is required and must be a valid number.' });
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

    const trimmedName = name.trim();
    const trimmedPhone = phone ? String(phone).trim() : '';

    // Idempotency: prevent duplicate patient creation from quick retries within 30s
    if (trimmedPhone) {
      const recentDuplicate = await Patient.findOne({
        name: trimmedName,
        phone: trimmedPhone,
        registeredAt: { $gte: new Date(Date.now() - 30000) }
      });
      if (recentDuplicate) {
        return res.status(200).json(recentDuplicate);
      }
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
      name: trimmedName,
      age: numAge,
      gender: normalizedGender,
      phone: trimmedPhone || undefined,
      email: email ? String(email).trim().toLowerCase() : undefined,
      bloodGroup: bloodGroup ? String(bloodGroup).trim() : undefined,
      address: address ? String(address).trim() : undefined
    });

    res.status(201).json(patient);
  } catch (error) {
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

export const updatePatient = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, age, gender, phone, email, bloodGroup, address } = req.body;

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

    if (name !== undefined) {
      if (typeof name !== 'string' || !name.trim()) {
        return res.status(400).json({ message: 'Name is required and cannot be empty.' });
      }
      patient.name = name.trim();
    }

    if (age !== undefined) {
      if (age === null || age === '' || isNaN(Number(age))) {
        return res.status(400).json({ message: 'Age is required and must be a valid number.' });
      }
      const numAge = Number(age);
      if (numAge < 0 || numAge > 150) {
        return res.status(400).json({ message: 'Age must be between 0 and 150.' });
      }
      patient.age = numAge;
    }

    if (gender !== undefined) {
      const g = String(gender).trim().toLowerCase();
      if (g === 'male') patient.gender = 'Male';
      else if (g === 'female') patient.gender = 'Female';
      else if (g === 'other') patient.gender = 'Other';
      else {
        return res.status(400).json({ message: 'Gender must be Male, Female, or Other.' });
      }
    }

    if (phone !== undefined) {
      patient.phone = phone ? String(phone).trim() : '';
    }

    if (email !== undefined) {
      const trimmedEmail = String(email).trim().toLowerCase();
      if (trimmedEmail) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(trimmedEmail)) {
          return res.status(400).json({ message: 'Please provide a valid email address.' });
        }
        patient.email = trimmedEmail;
      } else {
        patient.email = '';
      }
    }

    if (bloodGroup !== undefined) {
      patient.bloodGroup = bloodGroup ? String(bloodGroup).trim() : '';
    }

    if (address !== undefined) {
      patient.address = address ? String(address).trim() : '';
    }

    // Patient ID is immutable and strictly preserved
    await patient.save();

    // Update patientName on associated tests if name changed
    if (name !== undefined && mongoose.models.Test) {
      const Test = mongoose.models.Test;
      await Test.updateMany(
        {
          $or: [
            { patientId: patient._id },
            { patientCode: patient.patientId }
          ]
        },
        { $set: { patientName: patient.name } }
      );
    }

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

    const patientObj = typeof patient.toJSON === 'function' ? patient.toJSON() : patient;
    res.json({
      ...patientObj,
      tests
    });
  } catch (error) {
    next(error);
  }
};
