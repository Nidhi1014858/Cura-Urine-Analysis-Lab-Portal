import { Router } from 'express';
import { protect } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { getRgbDataset } from '../controllers/rgbDatasetController.js';

const router = Router();

// GET /api/rgb-dataset — Authenticated personnel can fetch reference RGB samples
router.get('/', protect, asyncHandler(getRgbDataset));

export default router;
