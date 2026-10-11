import { Router } from 'express';
import {
  createTest,
  listTests,
  getTest,
  batchLookup,
  reviewTest
} from '../controllers/testController.js';
import { protect, restrictTo } from '../middleware/auth.js';

const router = Router();

// 1. GET /api/tests — Query and list tests
router.get('/', protect, listTests);

// 2. POST /api/tests — Create a test (Technician only)
router.post('/', protect, restrictTo('Technician'), createTest);

// 3. GET /api/tests/batches/:batchNumber — Look up batch summary and tests
// Note: Register /batches/:batchNumber before /:id so it is not mistaken for a test ID.
router.get('/batches/:batchNumber', protect, batchLookup);

// 4. GET /api/tests/:id — Retrieve single test by ObjectId or testCode
router.get('/:id', protect, getTest);

// 5. PATCH /api/tests/:id/review — Review test (Clinician only)
router.patch('/:id/review', protect, restrictTo('Clinician'), reviewTest);

export { router };
export default router;
