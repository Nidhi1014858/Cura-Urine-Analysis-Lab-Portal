import mongoose from 'mongoose';
import { Inventory } from '../models/Inventory.js';
import { todayIST } from '../utils/validation.js';

function isValidCalendarDate(dateString) {
  if (typeof dateString !== 'string') return false;
  const match = dateString.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return false;

  const year = parseInt(match[1], 10);
  const month = parseInt(match[2], 10);
  const day = parseInt(match[3], 10);

  if (month < 1 || month > 12) return false;

  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

/**
 * GET /api/inventory
 * Retrieves inventory batches.
 * Supports filters:
 * - panelType: '10-panel' | '14-panel'
 * - availableOnly: boolean string ('true' | 'false')
 * - search: query across batchNumber, brandName, manufacturer
 */
export const getInventory = async (req, res, next) => {
  try {
    const { panelType, availableOnly, search, format, includeBrands } = req.query || {};
    const query = {};
    const today = todayIST();

    if (panelType && panelType.trim() && panelType.trim().toLowerCase() !== 'all') {
      query.panels = panelType.trim();
    }

    if (availableOnly === true || availableOnly === 'true') {
      query.quantity = { $gt: 0 };
      query.expiryDate = { $gte: today };
    }

    if (search && search.trim()) {
      const q = search.trim();
      const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(escaped, 'i');
      query.$or = [
        { batchNumber: regex },
        { brandName: regex },
        { manufacturer: regex }
      ];
    }

    const items = await Inventory.find(query).sort({ createdAt: -1 });

    // If caller explicitly requested summary format with brand-level availability
    if (format === 'summary' || includeBrands === 'true') {
      const brandMap = new Map();
      for (const item of items) {
        const bId = item.brandId;
        if (!brandMap.has(bId)) {
          brandMap.set(bId, {
            brandId: item.brandId,
            brandName: item.brandName,
            manufacturer: item.manufacturer,
            panels: item.panels,
            totalQuantity: 0,
            usableQuantity: 0,
            hasUsableBatch: false,
            batches: []
          });
        }
        const brandSummary = brandMap.get(bId);
        const isUsable = Number(item.quantity) > 0 && item.expiryDate >= today;
        brandSummary.totalQuantity += Number(item.quantity);
        if (isUsable) {
          brandSummary.usableQuantity += Number(item.quantity);
          brandSummary.hasUsableBatch = true;
        }
        brandSummary.batches.push(item);
      }

      return res.json({
        items,
        brands: Array.from(brandMap.values())
      });
    }

    // Default returns array of inventory documents
    res.json(items);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/inventory/:id
 * Retrieve a single inventory batch record.
 */
export const getInventoryById = async (req, res, next) => {
  try {
    const { id } = req.params;

    let item = null;
    if (mongoose.isValidObjectId(id)) {
      item = await Inventory.findById(id);
    }
    if (!item) {
      item = await Inventory.findOne({
        $or: [{ _id: mongoose.isValidObjectId(id) ? id : null }, { batchNumber: id }]
      });
    }

    if (!item) {
      return res.status(404).json({ message: `Inventory batch with ID ${id} not found.` });
    }

    res.json(item);
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/inventory
 * Create a new inventory batch record.
 * Mutation route (Admin only).
 */
export const createInventoryBatch = async (req, res, next) => {
  try {
    const {
      brandId,
      brandName,
      manufacturer,
      panels,
      manufactureDate,
      expiryDate,
      quantity
    } = req.body || {};

    const batchNumber = req.body?.batchNumber?.trim();

    if (!brandId || !brandName || !manufacturer || !batchNumber || !manufactureDate || !expiryDate) {
      return res.status(400).json({ message: 'All inventory batch fields are required.' });
    }

    const panelList = Array.isArray(panels) ? panels : (panels ? [panels] : []);
    if (!panelList.length) {
      return res.status(400).json({ message: 'At least one compatible panel type must be specified.' });
    }

    for (const p of panelList) {
      if (!['10-panel', '14-panel'].includes(p)) {
        return res.status(400).json({ message: `Invalid panel type: ${p}. Must be 10-panel or 14-panel.` });
      }
    }

    const numQty = Number(quantity);
    if (!Number.isInteger(numQty) || numQty < 0) {
      return res.status(400).json({ message: 'Quantity must be a non-negative integer.' });
    }

    if (!isValidCalendarDate(manufactureDate)) {
      return res.status(400).json({ message: `Manufacture date "${manufactureDate}" is not a valid calendar date in YYYY-MM-DD format.` });
    }

    if (!isValidCalendarDate(expiryDate)) {
      return res.status(400).json({ message: `Expiry date "${expiryDate}" is not a valid calendar date in YYYY-MM-DD format.` });
    }

    const today = todayIST();
    if (manufactureDate > today) {
      return res.status(400).json({ message: 'Manufacture date cannot be in the future.' });
    }

    if (expiryDate < manufactureDate) {
      return res.status(400).json({ message: 'Expiry date cannot precede manufacture date.' });
    }

    // Check for duplicate batchNumber within this brand (case-insensitive)
    const normalizedBatch = batchNumber.toLowerCase();
    const existing = await Inventory.findOne({
      brandId: brandId.trim(),
      batchNumberNormalized: normalizedBatch
    });

    if (existing) {
      return res.status(409).json({ message: `A batch with number "${batchNumber}" already exists for this brand.` });
    }

    const batch = await Inventory.create({
      brandId: brandId.trim(),
      brandName: brandName.trim(),
      manufacturer: manufacturer.trim(),
      panels: panelList,
      batchNumber,
      batchNumberNormalized: normalizedBatch,
      manufactureDate,
      expiryDate,
      quantity: numQty
    });

    res.status(201).json(batch);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: 'A batch with this number already exists for this brand.' });
    }
    next(error);
  }
};

/**
 * PATCH /api/inventory/:id
 * Update an existing inventory batch record.
 * Mutation route (Admin only).
 */
export const updateInventoryBatch = async (req, res, next) => {
  try {
    const { id } = req.params;

    let item = null;
    if (mongoose.isValidObjectId(id)) {
      item = await Inventory.findById(id);
    }
    if (!item) {
      item = await Inventory.findOne({ _id: mongoose.isValidObjectId(id) ? id : null });
    }

    if (!item) {
      return res.status(404).json({ message: `Inventory batch with ID ${id} not found.` });
    }

    const updates = req.body || {};

    if (updates.quantity !== undefined) {
      const numQty = Number(updates.quantity);
      if (!Number.isInteger(numQty) || numQty < 0) {
        return res.status(400).json({ message: 'Quantity must be a non-negative integer.' });
      }
      item.quantity = numQty;
    }

    if (updates.batchNumber !== undefined) {
      const newBatch = updates.batchNumber.trim();
      if (!newBatch) {
        return res.status(400).json({ message: 'Batch number cannot be empty.' });
      }
      const targetBrandId = updates.brandId ? updates.brandId.trim() : item.brandId;
      const normalizedBatch = newBatch.toLowerCase();

      const duplicate = await Inventory.findOne({
        _id: { $ne: item._id },
        brandId: targetBrandId,
        batchNumberNormalized: normalizedBatch
      });

      if (duplicate) {
        return res.status(409).json({ message: `A batch with number "${newBatch}" already exists for this brand.` });
      }

      item.batchNumber = newBatch;
      item.batchNumberNormalized = normalizedBatch;
    }

    const effectiveMfd = updates.manufactureDate || item.manufactureDate;
    const effectiveExp = updates.expiryDate || item.expiryDate;
    const today = todayIST();

    if (updates.manufactureDate !== undefined) {
      if (!isValidCalendarDate(updates.manufactureDate)) {
        return res.status(400).json({ message: `Manufacture date "${updates.manufactureDate}" is not a valid calendar date.` });
      }
      if (effectiveMfd > today) {
        return res.status(400).json({ message: 'Manufacture date cannot be in the future.' });
      }
      item.manufactureDate = updates.manufactureDate;
    }

    if (updates.expiryDate !== undefined) {
      if (!isValidCalendarDate(updates.expiryDate)) {
        return res.status(400).json({ message: `Expiry date "${updates.expiryDate}" is not a valid calendar date.` });
      }
      item.expiryDate = updates.expiryDate;
    }

    if (effectiveExp < effectiveMfd) {
      return res.status(400).json({ message: 'Expiry date cannot precede manufacture date.' });
    }

    if (updates.brandName !== undefined) item.brandName = updates.brandName.trim();
    if (updates.brandId !== undefined) item.brandId = updates.brandId.trim();
    if (updates.manufacturer !== undefined) item.manufacturer = updates.manufacturer.trim();
    if (updates.panels !== undefined) {
      const panelList = Array.isArray(updates.panels) ? updates.panels : [updates.panels];
      if (!panelList.length) {
        return res.status(400).json({ message: 'At least one panel type must be specified.' });
      }
      for (const p of panelList) {
        if (!['10-panel', '14-panel'].includes(p)) {
          return res.status(400).json({ message: `Invalid panel type: ${p}. Must be 10-panel or 14-panel.` });
        }
      }
      item.panels = panelList;
    }

    await item.save();

    res.json(item);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: 'A batch with this number already exists for this brand.' });
    }
    next(error);
  }
};

/**
 * DELETE /api/inventory/:id
 * Delete an inventory batch record.
 * Mutation route (Admin only).
 */
export const deleteInventoryBatch = async (req, res, next) => {
  try {
    const { id } = req.params;

    let item = null;
    if (mongoose.isValidObjectId(id)) {
      item = await Inventory.findByIdAndDelete(id);
    }
    if (!item) {
      item = await Inventory.findOneAndDelete({ _id: mongoose.isValidObjectId(id) ? id : null });
    }

    if (!item) {
      return res.status(404).json({ message: `Inventory batch with ID ${id} not found.` });
    }

    res.json({
      message: 'Inventory batch deleted successfully.',
      id: item.id || id
    });
  } catch (error) {
    next(error);
  }
};
