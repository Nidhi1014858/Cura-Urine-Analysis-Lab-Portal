import mongoose from 'mongoose';

const rgbDatasetSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: true
    },
    label: {
      type: String,
      required: true,
      trim: true
    },
    status: {
      type: String,
      required: true
    },
    rgbReadings: {
      type: mongoose.Schema.Types.Mixed,
      required: true
    }
  },
  {
    collection: 'rgb_dataset',
    timestamps: false
  }
);

rgbDatasetSchema.set('toJSON', {
  transform: (doc, ret) => {
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

export const RgbDataset = mongoose.model('RgbDataset', rgbDatasetSchema, 'rgb_dataset');
export default RgbDataset;
