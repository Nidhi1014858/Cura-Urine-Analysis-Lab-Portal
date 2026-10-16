import mongoose from 'mongoose';
import { jsonTransform } from '../utils/jsonTransform.js';
import { createPatientFingerprint } from '../utils/patientNormalization.js';

const patientSchema = new mongoose.Schema({
  patientId: {
    type: String,
    unique: true,
    required: true
  },
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true
  },
  age: {
    type: Number,
    required: [true, 'Age is required'],
    min: [0, 'Age must be at least 0'],
    max: [150, 'Age must be 150 or less']
  },
  gender: {
    type: String,
    enum: {
      values: ['Male', 'Female', 'Other'],
      message: 'Gender must be Male, Female, or Other'
    },
    default: 'Other'
  },
  phone: {
    type: String,
    trim: true,
    required: [true, 'Phone number is required']
  },
  email: {
    type: String,
    trim: true,
    lowercase: true
  },
  bloodGroup: {
    type: String,
    trim: true
  },
  address: {
    type: String,
    trim: true
  },
  duplicateFingerprint: {
    type: String,
    required: true,
    unique: true,
    sparse: true,
    select: false
  },
  registeredAt: {
    type: Date,
    default: Date.now
  }
});

patientSchema.pre('validate', function setDuplicateFingerprint(next) {
  this.duplicateFingerprint = createPatientFingerprint(this);
  next();
});

patientSchema.plugin(jsonTransform);

export const Patient = mongoose.model('Patient', patientSchema);
