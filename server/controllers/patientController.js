import mongoose from 'mongoose';
import { Patient } from '../models/Patient.js';
import { nextCode } from '../utils/codes.js';

export const getPatients = async (req, res, next) => {
  try {
    let query = {};
    if (req.query.search) {
      const escaped = req.query.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
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

    if (!name || age === undefined || age === null) {
      return res.status(400).json({ message: 'Name and age are required.' });
    }

    const patientId = await nextCode('PAT');

    const patient = await Patient.create({
      patientId,
      name,
      age: Number(age),
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
