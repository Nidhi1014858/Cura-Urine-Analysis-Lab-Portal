import mongoose from 'mongoose';
import { jsonTransform } from '../utils/jsonTransform.js';

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    select: false
  },
  role: {
    type: String,
    enum: {
      values: ['Technician', 'Clinician', 'Admin'],
      message: 'Role must be Technician, Clinician, or Admin'
    },
    required: [true, 'Role is required'],
    immutable: true
  },
  designation: {
    type: String
  },
  department: {
    type: String
  },
  photoUrl: {
    type: String,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

userSchema.plugin(jsonTransform);

export const User = mongoose.model('User', userSchema);
