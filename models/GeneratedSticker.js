import mongoose from 'mongoose';

const generatedStickerSchema = new mongoose.Schema({
  generationId: { type: String, required: true, index: true },
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', default: null },
  productName: { type: String, required: true },
  uniqueCode: { type: String, required: true, unique: true },
  barcodeFormat: { type: String, enum: ['CODE128', 'EAN13'], default: 'CODE128' },
  values: { type: mongoose.Schema.Types.Mixed, default: {} },
  templateSnapshot: { type: mongoose.Schema.Types.Mixed, default: {} },
  generatedAt: { type: Date, default: Date.now },
  printedAt: { type: Date, default: null }
}, { timestamps: true });

export default mongoose.model('GeneratedSticker', generatedStickerSchema);
