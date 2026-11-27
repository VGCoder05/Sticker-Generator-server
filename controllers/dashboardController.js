import Product from '../models/Product.js';
import Template from '../models/Template.js';
import GeneratedSticker from '../models/GeneratedSticker.js';
import StockImportBatch from '../models/StockImportBatch.js';
import { buildDashboardSummary } from '../services/dashboardSummary.js';

export async function getDashboardSummary(_req, res, next) {
  try {
    const [products, templates, stickers, imports, generations, importBatches] = await Promise.all([
      Product.countDocuments(), Template.countDocuments(), GeneratedSticker.countDocuments(), StockImportBatch.countDocuments(),
      GeneratedSticker.aggregate([
        { $group: { _id: '$generationId', count: { $sum: 1 }, date: { $max: '$generatedAt' } } },
        { $sort: { date: -1 } }, { $limit: 8 }
      ]),
      StockImportBatch.find().sort({ createdAt: -1 }).limit(8).select('sourceFile status items createdAt').lean()
    ]);
    const recentGenerations = generations.map((item) => ({ generationId: item._id, count: item.count, date: item.date }));
    const recentImports = importBatches.map((item) => ({ sourceFile: item.sourceFile, status: item.status, count: item.items?.length || 0, date: item.createdAt }));
    res.json({ success: true, data: buildDashboardSummary({ products, templates, stickers, imports, recentGenerations, recentImports }) });
  } catch (error) { next(error); }
}
