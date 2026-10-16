import express from 'express';
import { protect, restrictTo } from '../middleware/auth.js';
import {
  getInventory,
  getInventoryById,
  createInventoryBatch,
  updateInventoryBatch,
  deleteInventoryBatch
} from '../controllers/inventoryController.js';

const router = express.Router();

/**
 * Authorization contract:
 * - All /api/inventory endpoints require an authenticated session (`protect`).
 * - GET reads are permitted for Technicians, Clinicians, and Admins.
 * - POST, PATCH, and DELETE mutations are restricted strictly to `Admin` (`restrictTo('Admin')`).
 *   Person 2 manages the Admin role and frontend inventory management interface.
 */
router.use(protect);

// --- READ ROUTES (Technician, Clinician, Admin) ---
router.get('/', getInventory);
router.get('/:id', getInventoryById);

// --- MUTATION ROUTES (Admin Only — Wired for Person 2) ---
router.post('/', restrictTo('Admin'), createInventoryBatch);
router.patch('/:id', restrictTo('Admin'), updateInventoryBatch);
router.delete('/:id', restrictTo('Admin'), deleteInventoryBatch);

export default router;
