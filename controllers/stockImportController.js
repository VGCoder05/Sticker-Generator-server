import mongoose from 'mongoose';
import Product from '../models/Product.js';
import ProductVariant from '../models/ProductVariant.js';
import StockImportBatch from '../models/StockImportBatch.js';
import { buildStockReconciliation, validateStockAllocations } from '../services/stockReconciliation.js';

export async function previewStockImport(req, res, next) {
  try {
    const { records, sourceFile = '' } = req.body;
    const [products, variants] = await Promise.all([Product.find().lean(), ProductVariant.find().select('_id product mrp batchCode stockOnHand attributes').lean()]);
    const rows = buildStockReconciliation(records, products, variants);
    const batch = await StockImportBatch.create({ sourceFile: String(sourceFile).slice(0, 255), items: rows.map((row) => ({ ...row, action: row.suggestedAction, status: 'pending' })), summary: { total: rows.length, matched: rows.filter((row) => row.productId).length, needsProduct: rows.filter((row) => !row.productId).length, needsAllocation: rows.filter((row) => row.productId && !row.existingVariantId).length } });
    res.status(201).json({ success: true, data: { batchId: batch._id, sourceFile: batch.sourceFile, rows, summary: batch.summary } });
  } catch (error) { next(error); }
}

export async function commitStockImport(req, res, next) {
  try {
    const { batchId, allocations: submitted } = req.body;
    if (!mongoose.isValidObjectId(batchId)) return res.status(400).json({ success: false, message: 'Invalid import batch.' });
    if (!Array.isArray(submitted)) return res.status(400).json({ success: false, message: 'Stock allocations are required.' });
    const batch = await StockImportBatch.findById(batchId);
    if (!batch) return res.status(404).json({ success: false, message: 'Stock import batch not found.' });
    if (batch.status === 'completed') return res.status(409).json({ success: false, message: 'This import batch has already been committed.' });
    if (batch.status === 'processing') return res.status(409).json({ success: false, message: 'This import batch is already being processed.' });
    const allocationMap = new Map(submitted.map((entry) => [Number(entry.sourceIndex), entry.allocations]));
    for (const item of batch.items) {
      if (item.status === 'completed' || item.status === 'skipped') continue;
      const allocations = allocationMap.get(item.sourceIndex);
      const problem = validateStockAllocations(item.toObject(), allocations);
      if (problem) return res.status(400).json({ success: false, message: `Row ${item.sourceIndex + 1}: ${problem}` });
    }
    batch.status = 'processing'; await batch.save();
    let received = 0, variantsCreated = 0, skipped = 0;
    try {
      for (const item of batch.items) {
        if (item.status === 'completed' || item.status === 'skipped') continue;
        const allocations = allocationMap.get(item.sourceIndex) || [];
        for (let allocationIndex = 0; allocationIndex < allocations.length; allocationIndex += 1) {
          const allocation = allocations[allocationIndex];
          const quantity = Number(allocation.quantity);
          const reference = `${batch._id}:${item.sourceIndex}:${allocationIndex}`;
          if (allocation.variantId) {
            const variant = await ProductVariant.findOne({ _id: allocation.variantId, product: item.productId });
            if (!variant) throw new Error(`Selected variant for row ${item.sourceIndex + 1} no longer exists. Review this import again.`);
            if (!variant.stockMovements.some((movement) => movement.reference === reference)) {
              variant.attributes = { ...(variant.attributes || {}), ...(item.attributes || {}) };
              variant.stockOnHand += quantity;
              variant.stockMovements.push({ type: 'received', quantityChange: quantity, quantityAfter: variant.stockOnHand, note: `Excel import: ${batch.sourceFile}`, reference });
              await variant.save(); received += quantity;
            }
          } else if (allocation.createNew === true) {
            // A unique reference prevents duplicate creation if a request is retried after a partial failure.
            const alreadyCreated = await ProductVariant.findOne({ product: item.productId, 'stockMovements.reference': reference });
            if (!alreadyCreated) {
              const mrp = allocation.mrp === '' || allocation.mrp === null || allocation.mrp === undefined ? null : Number(allocation.mrp);
              await ProductVariant.create({ product: item.productId, mrp, batchCode: String(allocation.batchCode || '').trim().toLocaleUpperCase(), attributes: { ...(item.attributes || {}), ...(allocation.attributes || {}) }, stockOnHand: quantity, stockMovements: [{ type: 'received', quantityChange: quantity, quantityAfter: quantity, note: `Excel import: ${batch.sourceFile}`, reference }] });
              variantsCreated += 1;
            }
          }
        }
        item.allocations = allocations; item.status = 'completed'; item.message = 'All imported units allocated and received.'; await batch.save();
      }
      batch.status = 'completed'; batch.summary = { ...(batch.summary.toObject?.() || batch.summary), received, variantsCreated, skipped }; batch.committedAt = new Date(); await batch.save();
      res.json({ success: true, data: { batchId, received, variantsCreated, skipped, total: batch.items.length } });
    } catch (error) { batch.status = 'partial'; batch.summary = { ...(batch.summary.toObject?.() || batch.summary), received, variantsCreated, skipped, error: error.message }; await batch.save(); throw error; }
  } catch (error) { next(error); }
}

export async function listStockImportBatches(req, res, next) {
  try { const batches = await StockImportBatch.find().select('sourceFile status summary createdAt committedAt').sort({ createdAt: -1 }).limit(100).lean(); res.json({ success: true, data: batches }); }
  catch (error) { next(error); }
}
