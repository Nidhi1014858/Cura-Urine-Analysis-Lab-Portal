import { Router } from 'express';
import { protect } from '../middleware/auth.js';
import { getDashboardStats } from '../controllers/statController.js';

const router = Router();

router.get('/dashboard', protect, getDashboardStats);

export default router;
