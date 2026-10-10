import { Router } from 'express';
import { getPatients, createPatient, getPatientById } from '../controllers/patientController.js';
import { protect } from '../middleware/auth.js';

const router = Router();

router.use(protect);

router.get('/', getPatients);
router.post('/', createPatient);
router.get('/:id', getPatientById);

export default router;
