import { Router } from 'express';
import { getPatients, createPatient, getPatientById, updatePatient } from '../controllers/patientController.js';
import { protect, restrictTo } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

router.use(protect);

router.get('/', asyncHandler(getPatients));
router.post('/', asyncHandler(createPatient));
router.get('/:id', asyncHandler(getPatientById));
router.patch('/:id', restrictTo('Technician', 'Clinician'), asyncHandler(updatePatient));
router.put('/:id', restrictTo('Technician', 'Clinician'), asyncHandler(updatePatient));

export default router;
