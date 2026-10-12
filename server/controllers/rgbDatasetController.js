import { RgbDataset } from '../models/RgbDataset.js';

/**
 * GET /api/rgb-dataset
 * Retrieves all RGB reference dataset samples from MongoDB rgb_dataset collection.
 */
export const getRgbDataset = async (req, res, next) => {
  try {
    const dataset = await RgbDataset.find().sort({ _id: 1 });
    res.json(dataset);
  } catch (error) {
    next(error);
  }
};
