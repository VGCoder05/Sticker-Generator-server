import mongoose from 'mongoose';
import Product from '../models/Product.js';
import ProductVariant from '../models/ProductVariant.js';
import Template from '../models/Template.js';
import GeneratedSticker from '../models/GeneratedSticker.js';
import AppSettings from '../models/AppSettings.js';
import { buildStickerValues, mergeStickerOverrides, makeUniqueCode, validateGenerationRequest } from '../services/stickerGeneration.js';

export async function generateStickers(req, res, next) {
  try {
    const problem = validateGenerationRequest(req.body);
    if (problem) return res.status(400).json({ success: false, message: problem });
    const { templateId, items, generationId } = req.body;
    if (!mongoose.isValidObjectId(templateId)) return res.status(400).json({ success: false, message: 'Invalid template.' });
    if (!/^[\w-]{8,80}$/.test(String(generationId || ''))) return res.status(400).json({ success: false, message: 'A valid generation reference is required.' });

    // Idempotency: a completed retry returns the already-created sticker set.
    const expectedCount = items.reduce((sum, item) => sum + Number(item.quantity), 0);
    const previous = await GeneratedSticker.find({ generationId }).sort({ createdAt: 1 }).lean();
    if (previous.length === expectedCount) return res.json({ success: true, data: { generationId, stickers: previous, reused: true } });

    const template = await Template.findById(templateId).lean();
    if (!template) return res.status(404).json({ success: false, message: 'Template not found.' });
    const preparedItems = [];
    const requestedByVariant = new Map();
    for (const item of items) {
      requestedByVariant.set(String(item.variantId), (requestedByVariant.get(String(item.variantId)) || 0) + Number(item.quantity));
      if (!mongoose.isValidObjectId(item.variantId)) return res.status(400).json({ success: false, message: 'Invalid product variant.' });
      const variant = await ProductVariant.findById(item.variantId).lean();
      if (!variant || !variant.isActive) return res.status(404).json({ success: false, message: 'A selected variant was not found or is inactive.' });
      if (Number(variant.stockOnHand || 0) <= 0) return res.status(400).json({ success: false, message: 'Cannot generate stickers for a variant with zero stock.' });
      const requestedTotal = requestedByVariant.get(String(item.variantId));
      if (requestedTotal > Number(variant.stockOnHand || 0)) return res.status(400).json({ success: false, message: `Requested ${requestedTotal} stickers but only ${variant.stockOnHand} units are in stock.` });
      const product = await Product.findById(variant.product).lean();
      if (!product) return res.status(404).json({ success: false, message: 'A selected product was not found.' });
      preparedItems.push({ item, variant, product });
    }
    const partial = await GeneratedSticker.countDocuments({ generationId });
    if (partial) await GeneratedSticker.deleteMany({ generationId });
    const settings = await AppSettings.findOne({ key: 'workspace' }).lean() || {};
    const barcodeElement = (template.elements || []).find(element => element.type === 'barcode');
    const barcodeFormat = barcodeElement?.barcodeFormat || settings.defaultBarcodeFormat || 'CODE128';
    const created = [];
    for (const { item, variant, product } of preparedItems) {
      for (let index = 0; index < Number(item.quantity); index += 1) {
        let sticker;
        for (let attempt = 0; attempt < 4; attempt += 1) {
          const uniqueCode = makeUniqueCode(settings, new Date(), barcodeFormat);
          try {
            sticker = await GeneratedSticker.create({
              generationId, product: product._id, productName: product.name, uniqueCode,
              barcodeFormat, values: mergeStickerOverrides(buildStickerValues(product, variant, uniqueCode), item.values),
              templateSnapshot: { _id: template._id, name: template.name, width: template.width, height: template.height, unit: template.unit, elements: template.elements }
            });
            break;
          } catch (error) {
            if (error.code !== 11000 || attempt === 3) throw error;
          }
        }
        created.push(sticker);
      }
    }
    if (created.length !== expectedCount) throw new Error('Sticker generation did not produce the expected number of records.');
    res.status(201).json({ success: true, data: { generationId, stickers: created, reused: false } });
  } catch (error) { next(error); }
}

export async function listGeneratedStickers(req, res, next) {
  try {
    const filter = req.query.generationId ? { generationId: String(req.query.generationId) } : {};
    const stickers = await GeneratedSticker.find(filter).sort({ createdAt: -1 }).limit(500).lean();
    res.json({ success: true, data: stickers });
  } catch (error) { next(error); }
}
