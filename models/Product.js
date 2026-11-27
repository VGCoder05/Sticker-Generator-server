import mongoose from 'mongoose';

const productSchema = new mongoose.Schema({
  productCode: { type: String, trim: true, default: '' },
  name: { type: String, required: true, trim: true },
  fields: { type: mongoose.Schema.Types.Mixed, default: {} },
  defaultTemplate: { type: mongoose.Schema.Types.ObjectId, ref: 'Template', default: null },
  codeGeneration: {
    mode: { type: String, enum: ['format', 'random'], default: 'format' },
    format: { type: String, default: 'YYMMDDCOUNT' },
    counterLength: { type: Number, default: 5 },
    reset: { type: String, enum: ['never', 'daily', 'monthly', 'yearly'], default: 'daily' }
  }
}, { timestamps: true });

// Empty product codes are allowed; only non-empty codes must be unique.
productSchema.index({ productCode: 1 }, { unique: true, partialFilterExpression: { productCode: { $type: 'string', $gt: '' } }, name: 'product_code_nonempty_unique' });
productSchema.index({ name: 1 });
export default mongoose.model('Product', productSchema);
