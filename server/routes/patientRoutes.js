import { Router } from 'express';
import { getPatients, createPatient, getPatientById } from '../controllers/patientController.js';
import { protect } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

router.use(protect);

router.get('/', asyncHandler(getPatients));
router.post('/', asyncHandler(createPatient));
router.get('/:id', asyncHandler(getPatientById));

export default router;
