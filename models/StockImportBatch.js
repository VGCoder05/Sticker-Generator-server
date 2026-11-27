import mongoose from 'mongoose';

const stockImportItemSchema = new mongoose.Schema({
  sourceIndex: { type: Number, required: true },
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', default: null },
  productName: { type: String, default: '' },
  productCode: { type: String, default: '' },
  mrp: { type: Number, default: null },
  batchCode: { type: String, default: '' },
  quantity: { type: Number, default: 0 },
  existingVariantId: { type: mongoose.Schema.Types.ObjectId, ref: 'ProductVariant', default: null },
  availableVariants: { type: [mongoose.Schema.Types.Mixed], default: [] },
  attributes: { type: mongoose.Schema.Types.Mixed, default: {} },
  matchMethod: { type: String, default: '' },
  suggestedAction: { type: String, enum: ['receive', 'createVariant', 'allocate', 'skip'], default: 'skip' },
  action: { type: String, enum: ['receive', 'createVariant', 'allocate', 'skip'], default: 'skip' },
  status: { type: String, enum: ['pending', 'completed', 'skipped'], default: 'pending' },
  allocations: { type: [mongoose.Schema.Types.Mixed], default: [] },
  message: { type: String, default: '' }
}, { _id: true });

const stockImportBatchSchema = new mongoose.Schema({
  sourceFile: { type: String, trim: true, default: '' },
  status: { type: String, enum: ['pending', 'processing', 'completed', 'partial'], default: 'pending' },
  items: { type: [stockImportItemSchema], default: [] },
  summary: { type: mongoose.Schema.Types.Mixed, default: {} },
  committedAt: { type: Date, default: null }
}, { timestamps: true });

export default mongoose.model('StockImportBatch', stockImportBatchSchema);
