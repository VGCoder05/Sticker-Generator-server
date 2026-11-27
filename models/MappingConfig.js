import mongoose from 'mongoose';

const mappingConfigSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 80 },
  headers: { type: [String], required: true },
  mappings: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  sourceSheetName: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now }
}, { timestamps: true });

mappingConfigSchema.index({ name: 1 }, { unique: true });
export default mongoose.model('MappingConfig', mappingConfigSchema);
