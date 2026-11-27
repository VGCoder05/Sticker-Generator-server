import mongoose from 'mongoose';

const stockMovementSchema = new mongoose.Schema({
  type: { type: String, enum: ['opening', 'received', 'sold', 'adjustment'], required: true },
  quantityChange: { type: Number, required: true },
  quantityAfter: { type: Number, required: true },
  note: { type: String, trim: true, default: '' },
  reference: { type: String, trim: true, default: '' },
  createdAt: { type: Date, default: Date.now }
}, { _id: true });

const variantSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
  mrp: { type: Number, default: null, min: 0 },
  batchCode: { type: String, trim: true, default: '' },
  attributes: { type: mongoose.Schema.Types.Mixed, default: {} },
  stockOnHand: { type: Number, default: 0, min: 0 },
  stockMovements: { type: [stockMovementSchema], default: [] },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

// Variant identity is user-controlled: identical MRP/batch details may intentionally be kept separate.
variantSchema.index({ product: 1, isActive: 1 });
export default mongoose.model('ProductVariant', variantSchema);
