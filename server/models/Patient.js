import mongoose from 'mongoose';
import { jsonTransform } from '../utils/jsonTransform.js';

const patientSchema = new mongoose.Schema({
  patientId: {
    type: String,
    unique: true,
    required: true
  },
  name: {
    type: String,
    required: [true, 'Name is required']
  },
  age: {
    type: Number,
    required: [true, 'Age is required']
  },
  gender: {
    type: String,
    enum: ['Male', 'Female', 'Other']
  },
  phone: {
    type: String
  },
  email: {
    type: String
  },
  bloodGroup: {
    type: String
  },
  address: {
    type: String
  },
  registeredAt: {
    type: Date,
    default: Date.now
  }
});

patientSchema.plugin(jsonTransform);

export const Patient = mongoose.model('Patient', patientSchema);
