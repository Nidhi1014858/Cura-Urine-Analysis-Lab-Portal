import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { User } from '../models/User.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const protect = asyncHandler(async (req, res, next) => {
  const authorization = req.headers.authorization;
  const match = authorization?.match(/^Bearer\s+(\S+)$/i);
  const token = match?.[1];

  if (!token) {
    return res.status(401).json({ message: 'Not authenticated.' });
  }

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    if (error.statusCode) {
      throw error;
    }
    return res.status(401).json({ message: 'Not authenticated.' });
  }

  if (!decoded?.id || !mongoose.Types.ObjectId.isValid(decoded.id)) {
    return res.status(401).json({ message: 'Not authenticated.' });
  }

  const user = await User.findById(decoded.id);

  if (!user) {
    return res.status(401).json({ message: 'Not authenticated.' });
  }

  req.user = user;
  next();
});

export const restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'You do not have permission to do this.' });
    }
    next();
  };
};
