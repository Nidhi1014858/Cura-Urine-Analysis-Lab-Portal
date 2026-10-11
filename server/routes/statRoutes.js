import { Router } from 'express';
import { protect } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { getDashboardStats } from '../controllers/statController.js';

const router = Router();

router.get('/dashboard', protect, asyncHandler(getDashboardStats));

export default router;
