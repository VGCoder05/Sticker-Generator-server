import mongoose from 'mongoose';

const templateElementSchema = new mongoose.Schema({
  id: { type: String, required: true },
  type: { type: String, enum: ['text', 'dynamicText', 'barcode', 'image', 'line', 'rectangle'], required: true },
  name: { type: String, default: '' },
  x: { type: Number, default: 8 },
  y: { type: Number, default: 8 },
  width: { type: Number, default: 80 },
  height: { type: Number, default: 20 },
  rotation: { type: Number, default: 0 },
  content: { type: String, default: '' },
  fieldKey: { type: String, default: '' },
  barcodeFormat: { type: String, enum: ['CODE128', 'EAN13'], default: 'CODE128' },
  barcodeFieldKey: { type: String, default: 'uniqueCode' },
  showBarcodeValue: { type: Boolean, default: true },
  style: { type: mongoose.Schema.Types.Mixed, default: {} }
}, { _id: false });

const templateSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  width: { type: Number, required: true, min: 1 },
  height: { type: Number, required: true, min: 1 },
  unit: { type: String, enum: ['mm', 'cm', 'in'], default: 'mm' },
  elements: { type: [templateElementSchema], default: [] },
  version: { type: Number, default: 1 },
  saveType: { type: String, enum: ['independent', 'excel-linked'], default: 'independent' },
  mappingConfig: { type: mongoose.Schema.Types.Mixed, default: null },
  consolidationConfig: { type: mongoose.Schema.Types.Mixed, default: null }
}, { timestamps: true });

templateSchema.index({ name: 1 });
export default mongoose.model('Template', templateSchema);
