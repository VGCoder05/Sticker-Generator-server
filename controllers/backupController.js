import mongoose from 'mongoose';
import Product from '../models/Product.js';
import ProductVariant from '../models/ProductVariant.js';
import Template from '../models/Template.js';
import GeneratedSticker from '../models/GeneratedSticker.js';
import StockImportBatch from '../models/StockImportBatch.js';
import MappingConfig from '../models/MappingConfig.js';
import ConsolidationConfig from '../models/ConsolidationConfig.js';
import AppSettings from '../models/AppSettings.js';

const COLLECTIONS = { products: Product, variants: ProductVariant, templates: Template, stickers: GeneratedSticker, stockImportBatches: StockImportBatch, mappingConfigs: MappingConfig, consolidationConfigs: ConsolidationConfig, appSettings: AppSettings };
const BACKUP_VERSION = 1;

export async function exportBackup(_req, res, next) {
  try {
    const data = {};
    for (const [key, Model] of Object.entries(COLLECTIONS)) data[key] = await Model.find({}).lean();
    const backup = { app: 'Sticker Studio', backupVersion: BACKUP_VERSION, createdAt: new Date().toISOString(), data };
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="sticker-studio-backup-${new Date().toISOString().slice(0, 10)}.json"`);
    res.send(JSON.stringify(backup, null, 2));
  } catch (error) { next(error); }
}

export async function restoreBackup(req, res, next) {
  try {
    const backup = req.body;
    if (!backup || backup.app !== 'Sticker Studio' || backup.backupVersion !== BACKUP_VERSION || !backup.data || typeof backup.data !== 'object') {
      return res.status(400).json({ success: false, message: 'This is not a supported Sticker Studio backup file.' });
    }
    const summary = {};
    for (const [key, Model] of Object.entries(COLLECTIONS)) {
      const documents = backup.data[key] ?? [];
      if (!Array.isArray(documents)) return res.status(400).json({ success: false, message: `Invalid backup section: ${key}.` });
      let inserted = 0, skipped = 0;
      for (const document of documents) {
        if (!document || !mongoose.isValidObjectId(document._id)) { skipped++; continue; }
        try {
          const result = await Model.updateOne({ _id: document._id }, { $setOnInsert: document }, { upsert: true, runValidators: true });
          if (result.upsertedCount) inserted++; else skipped++;
        } catch { skipped++; }
      }
      summary[key] = { inserted, skipped };
    }
    res.json({ success: true, message: 'Backup merged. Existing records were preserved; matching IDs and conflicting unique values were skipped.', summary });
  } catch (error) { next(error); }
}
