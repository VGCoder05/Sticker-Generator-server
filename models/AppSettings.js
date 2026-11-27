import mongoose from 'mongoose';

const appSettingsSchema = new mongoose.Schema({
  key: { type: String, default: 'workspace', unique: true },
  businessName: { type: String, default: 'Sticker Studio', trim: true },
  codePrefix: { type: String, default: 'STK', trim: true, uppercase: true },
  codeDateFormat: { type: String, enum: ['YYMMDD', 'YYYYMMDD', 'NONE'], default: 'YYMMDD' },
  codeRandomLength: { type: Number, default: 8, min: 4, max: 20 },
  defaultBarcodeFormat: { type: String, enum: ['CODE128', 'EAN13'], default: 'CODE128' },
  defaultPaper: { type: String, enum: ['A4', 'A5', 'Letter', 'Legal', 'Custom'], default: 'A4' },
  defaultOrientation: { type: String, enum: ['Portrait', 'Landscape'], default: 'Portrait' },
  defaultMargin: { type: Number, default: 5, min: 0, max: 50 }
}, { timestamps: true });

export default mongoose.model('AppSettings', appSettingsSchema);
