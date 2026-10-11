import mongoose from 'mongoose';
import { jsonTransform } from '../utils/jsonTransform.js';

const analyteSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: true
    },
    name: {
      type: String,
      required: true
    },
    unit: {
      type: String
    },
    refRange: {
      type: String
    },
    category: {
      type: String
    },
    rgbInput: {
      r: { type: Number },
      g: { type: Number },
      b: { type: Number }
    },
    value: {
      type: String
    },
    flag: {
      type: String
    },
    score: {
      type: Number
    },
    numeric: {
      type: Number
    }
  },
  { _id: false, id: false }
);

const clinicianReviewSchema = new mongoose.Schema(
  {
    reviewed: {
      type: Boolean,
      default: false
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'flagged_retest'],
      default: 'pending'
    },
    reviewedBy: {
      type: String,
      default: null
    },
    reviewerPhotoUrl: {
      type: String,
      default: null
    },
    reviewedAt: {
      type: Date,
      default: null
    },
    notes: {
      type: String,
      default: ''
    }
  },
  { _id: false }
);

const auditSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: true
    },
    action: {
      type: String,
      required: true
    },
    actor: {
      type: String,
      required: true
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    details: {
      type: String
    }
  },
  { _id: false, id: false }
);

const testSchema = new mongoose.Schema({
  testCode: {
    type: String,
    required: [true, 'Test code is required'],
    unique: true,
    index: true
  },
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient',
    required: [true, 'Patient ID is required']
  },
  patientCode: {
    type: String,
    required: [true, 'Patient code is required']
  },
  patientName: {
    type: String,
    required: [true, 'Patient name is required']
  },
  panelType: {
    type: String,
    enum: ['10-panel', '14-panel'],
    required: [true, 'Panel type is required']
  },
  stripBrand: {
    type: String,
    required: [true, 'Strip brand is required']
  },
  stripBatch: {
    type: String,
    required: [true, 'Strip batch is required']
  },
  manufactureDate: {
    type: String,
    required: [true, 'Manufacture date is required'],
    match: [/^\d{4}-\d{2}-\d{2}$/, 'Manufacture date must be in YYYY-MM-DD format']
  },
  expiryDate: {
    type: String,
    required: [true, 'Expiry date is required'],
    match: [/^\d{4}-\d{2}-\d{2}$/, 'Expiry date must be in YYYY-MM-DD format']
  },
  reportDestination: {
    type: String,
    required: [true, 'Report destination is required']
  },
  submittedBy: {
    type: String,
    required: [true, 'Submitted by is required']
  },
  submittedByPhotoUrl: {
    type: String,
    default: null
  },
  submittedAt: {
    type: Date,
    default: Date.now
  },
  technicianNotes: {
    type: String,
    default: ''
  },
  stripImageUrl: {
    type: String,
    default: null
  },
  overallStatus: {
    type: String,
    enum: ['normal', 'abnormal', 'trace'],
    required: [true, 'Overall status is required']
  },
  analytes: {
    type: [analyteSchema],
    default: []
  },
  clinicianReview: {
    type: clinicianReviewSchema,
    default: () => ({})
  },
  auditTrail: {
    type: [auditSchema],
    default: []
  }
});

testSchema.plugin(jsonTransform);

export const Test = mongoose.model('Test', testSchema);
export default Test;
