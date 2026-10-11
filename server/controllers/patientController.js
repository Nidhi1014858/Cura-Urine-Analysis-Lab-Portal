import mongoose from 'mongoose';
import { Patient } from '../models/Patient.js';
import { nextCode } from '../utils/codes.js';

export const getPatients = async (req, res, next) => {
  try {
    let query = {};
    const search = req.query.search;
    if (typeof search === 'string' && search) {
      const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
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
    const trimmedName = typeof name === 'string' ? name.trim() : '';
    const numAge = Number(age);

    if (!trimmedName || age === undefined || age === null || isNaN(numAge) || numAge < 0) {
      return res.status(400).json({ message: 'Name and a valid age are required.' });
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
      gender,
      phone,
      email,
      bloodGroup,
      address
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
    } else if (/^PAT-\d{4}-\d{4}$/.test(id)) {
      patient = await Patient.findOne({ patientId: id });
    }

    if (!patient) {
      return res.status(404).json({ message: 'Patient not found' });
    }

    const patientObj = patient.toJSON();

    let tests = [];
    if (mongoose.models.Test) {
      const Test = mongoose.models.Test;
      tests = await Test.find({ patientId: patient._id }).sort({ submittedAt: 1, createdAt: 1 });
    }

    res.json({
      ...patientObj,
      tests
    });
  } catch (error) {
    next(error);
  }
};
