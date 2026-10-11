import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { User } from '../models/User.js';

const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  });
};

const isDuplicateEmail = (error) => (
  error.code === 11000 &&
  (error.keyPattern?.email || error.keyValue?.email)
);

export const signup = async (req, res, next) => {
  try {
    const { name, email, password, role, designation, department } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Please provide name, email, and password.' });
    }

    if (role !== undefined && !['Technician', 'Clinician'].includes(role)) {
      return res.status(400).json({ message: 'Role must be Technician or Clinician.' });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(409).json({ message: 'An account with this email already exists.' });
    }

    const userRole = role || 'Technician';
    const defaultDesignation = designation || (userRole === 'Clinician' ? 'Consultant Pathologist' : 'POCT Technician');
    const defaultDepartment = department || 'Clinical Pathology';

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
      role: userRole,
      designation: defaultDesignation,
      department: defaultDepartment
    });

    const token = signToken(user._id);

    res.status(201).json({
      token,
      user
    });
  } catch (error) {
    if (isDuplicateEmail(error)) {
      return res.status(409).json({ message: 'An account with this email already exists.' });
    }
    next(error);
  }
};

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Please provide email and password.' });
    }

    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
    if (!user) {
      return res.status(400).json({ message: 'No user found with this email address.' });
    }

    const isCorrect = await bcrypt.compare(password, user.password);
    if (!isCorrect) {
      return res.status(400).json({ message: 'Invalid password.' });
    }

    const token = signToken(user._id);

    res.json({
      token,
      user
    });
  } catch (error) {
    next(error);
  }
};

export const getMe = async (req, res, next) => {
  try {
    res.json(req.user);
  } catch (error) {
    next(error);
  }
};

export const updatePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Please provide currentPassword and newPassword.' });
    }

    const user = await User.findById(req.user._id).select('+password');
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    const isCorrect = await bcrypt.compare(currentPassword, user.password);
    if (!isCorrect) {
      return res.status(400).json({ message: 'Current password is incorrect.' });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    res.json(user);
  } catch (error) {
    next(error);
  }
};

export const updateProfile = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (id !== String(req.user._id)) {
      return res.status(403).json({ message: 'You do not have permission to do this.' });
    }

    const { name, email, designation, department, photoUrl } = req.body;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    if (email && email.toLowerCase() !== user.email.toLowerCase()) {
      const emailExists = await User.findOne({ email: email.toLowerCase() });
      if (emailExists) {
        return res.status(409).json({ message: 'An account with this email already exists.' });
      }
      user.email = email.toLowerCase();
    }

    if (name !== undefined) user.name = name;
    if (designation !== undefined) user.designation = designation;
    if (department !== undefined) user.department = department;
    if (photoUrl !== undefined) user.photoUrl = photoUrl;

    await user.save();

    if (photoUrl !== undefined && mongoose.models.Test) {
      const Test = mongoose.models.Test;
      await Test.updateMany(
        { submittedBy: user.name },
        { $set: { submittedByPhotoUrl: photoUrl } }
      );
      await Test.updateMany(
        { 'clinicianReview.reviewedBy': user.name },
        { $set: { 'clinicianReview.reviewerPhotoUrl': photoUrl } }
      );
    }

    res.json(user);
  } catch (error) {
    if (isDuplicateEmail(error)) {
      return res.status(409).json({ message: 'An account with this email already exists.' });
    }
    next(error);
  }
};
