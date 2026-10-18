import mongoose from 'mongoose';
import { jsonTransform } from '../utils/jsonTransform.js';
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

const inventorySchema = new mongoose.Schema(
  {
    brandId: {
      type: String,
      required: [true, 'Brand ID is required'],
      trim: true,
      lowercase: true
    },
    brandName: {
      type: String,
      required: [true, 'Brand name is required'],
      trim: true
    },
    manufacturer: {
      type: String,
      required: [true, 'Manufacturer is required'],
      trim: true
    },
    panels: {
      type: [{
        type: String,
        enum: ['10-panel', '14-panel']
      }],
      required: [true, 'At least one panel type is required'],
      validate: {
        validator: function (val) {
          return Array.isArray(val) && val.length > 0;
        },
        message: 'At least one compatible panel type must be specified'
      }
    },
    batchNumber: {
      type: String,
      required: [true, 'Batch number is required'],
      trim: true
    },
    batchNumberNormalized: {
      type: String,
      trim: true,
      lowercase: true,
      index: true
    },
    manufactureDate: {
      type: String,
      required: [true, 'Manufacture date is required'],
      validate: [
        {
          validator: isValidCalendarDate,
          message: 'Manufacture date must be a valid calendar date in YYYY-MM-DD format'
        },
        {
          validator: function (val) {
            const today = todayIST();
            return val <= today;
          },
          message: 'Manufacture date cannot be in the future'
        }
      ]
    },
    expiryDate: {
      type: String,
      required: [true, 'Expiry date is required'],
      validate: [
        {
          validator: isValidCalendarDate,
          message: 'Expiry date must be a valid calendar date in YYYY-MM-DD format'
        },
        {
          validator: function (val) {
            if (!this.manufactureDate) return true;
            return val >= this.manufactureDate;
          },
          message: 'Expiry date cannot precede manufacture date'
        }
      ]
    },
    quantity: {
      type: Number,
      required: [true, 'Quantity is required'],
      min: [0, 'Quantity must be a non-negative integer'],
      validate: {
        validator: Number.isInteger,
        message: 'Quantity must be a whole integer'
      }
    }
  },
  {
    timestamps: true
  }
);

// Pre-save hook to populate normalized batch number
inventorySchema.pre('save', function (next) {
  if (this.batchNumber) {
    this.batchNumberNormalized = this.batchNumber.trim().toLowerCase();
  }
  if (this.brandId) {
    this.brandId = this.brandId.trim().toLowerCase();
  }
  next();
});

// Pre-validate hook for findOneAndUpdate / update queries
inventorySchema.pre('findOneAndUpdate', function (next) {
  const update = this.getUpdate();
  if (update) {
    if (update.batchNumber) {
      update.batchNumberNormalized = update.batchNumber.trim().toLowerCase();
    }
    if (update.$set?.batchNumber) {
      update.$set.batchNumberNormalized = update.$set.batchNumber.trim().toLowerCase();
    }
    if (update.brandId) {
      update.brandId = update.brandId.trim().toLowerCase();
    }
    if (update.$set?.brandId) {
      update.$set.brandId = update.$set.brandId.trim().toLowerCase();
    }
  }
  next();
});

// Compound unique index on brandId + normalized batchNumber (case-insensitive for batchNumber within brand)
inventorySchema.index({ brandId: 1, batchNumberNormalized: 1 }, { unique: true });

inventorySchema.plugin(jsonTransform);

export const Inventory = mongoose.model('Inventory', inventorySchema);
export default Inventory;
