import mongoose from 'mongoose';
const schema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 80 },
  groupBy: { type: [String], default: [] },
  aggregations: { type: mongoose.Schema.Types.Mixed, default: {} },
  createdAt: { type: Date, default: Date.now }
}, { timestamps: true });
schema.index({ name: 1 }, { unique: true });
export default mongoose.model('ConsolidationConfig', schema);
