import mongoose from 'mongoose';
import Product from '../models/Product.js';
import ProductVariant from '../models/ProductVariant.js';
import { calculateStockChange, validateVariantInput } from '../services/variantService.js';

export async function listVariants(req, res, next) {
  try {
    if (!mongoose.isValidObjectId(req.params.productId)) return res.status(400).json({ success: false, message: 'Invalid product id.' });
    const product = await Product.findById(req.params.productId).select('_id name').lean();
    if (!product) return res.status(404).json({ success: false, message: 'Product not found.' });
    const variants = await ProductVariant.find({ product: product._id }).sort({ mrp: 1, batchCode: 1 }).lean();
    res.json({ success: true, data: { product, variants } });
  } catch (error) { next(error); }
}

export async function createVariant(req, res, next) {
  try {
    const { productId } = req.params;
    if (!mongoose.isValidObjectId(productId)) return res.status(400).json({ success: false, message: 'Invalid product id.' });
    const product = await Product.findById(productId).select('_id');
    if (!product) return res.status(404).json({ success: false, message: 'Product not found.' });
    const checked = validateVariantInput(req.body);
    if (!checked.valid) return res.status(400).json({ success: false, message: checked.message });
    const variant = await ProductVariant.create({
      product: productId, mrp: checked.mrp, batchCode: checked.batchCode,
      attributes: req.body.attributes || {}, stockOnHand: checked.openingStock,
      stockMovements: checked.openingStock ? [{ type: 'opening', quantityChange: checked.openingStock, quantityAfter: checked.openingStock, note: 'Opening stock' }] : []
    });
    res.status(201).json({ success: true, data: variant });
  } catch (error) { next(error); }
}

export async function updateVariant(req, res, next) {
  try {
    const variant = await ProductVariant.findOne({ _id: req.params.variantId, product: req.params.productId });
    if (!variant) return res.status(404).json({ success: false, message: 'Variant not found.' });
    if (req.body.mrp !== undefined) {
      const mrp = req.body.mrp === '' || req.body.mrp === null || req.body.mrp === undefined ? null : Number(req.body.mrp);
      if (mrp !== null && (!Number.isFinite(mrp) || mrp < 0)) return res.status(400).json({ success: false, message: 'MRP must be empty or a valid non-negative number.' });
      variant.mrp = mrp;
    }
    if (req.body.batchCode !== undefined) variant.batchCode = String(req.body.batchCode).trim().toLocaleUpperCase();
    if (req.body.attributes && typeof req.body.attributes === 'object') variant.attributes = req.body.attributes;
    if (req.body.isActive !== undefined) variant.isActive = Boolean(req.body.isActive);
    await variant.save();
    res.json({ success: true, data: variant });
  } catch (error) { next(error); }
}

export async function adjustVariantStock(req, res, next) {
  try {
    const variant = await ProductVariant.findOne({ _id: req.params.variantId, product: req.params.productId });
    if (!variant) return res.status(404).json({ success: false, message: 'Variant not found.' });
    const change = Number(req.body.quantityChange);
    const allowedTypes = ['received', 'sold', 'adjustment'];
    const type = String(req.body.type || 'adjustment');
    if (!Number.isInteger(change) || change === 0) return res.status(400).json({ success: false, message: 'Quantity change must be a non-zero whole number.' });
    if (!allowedTypes.includes(type)) return res.status(400).json({ success: false, message: 'Invalid stock movement type.' });
    if (type === 'received' && change < 0) return res.status(400).json({ success: false, message: 'Received quantity must be positive.' });
    if (type === 'sold' && change > 0) return res.status(400).json({ success: false, message: 'Sold quantity must be negative.' });
    const next = calculateStockChange(variant.stockOnHand, change);
    variant.stockOnHand = next;
    variant.stockMovements.push({ type, quantityChange: change, quantityAfter: next, note: String(req.body.note || '').trim(), reference: String(req.body.reference || '').trim() });
    await variant.save();
    res.json({ success: true, data: variant });
  } catch (error) { next(error); }
}

export async function deleteVariant(req, res, next) {
  try {
    const variant = await ProductVariant.findOneAndDelete({ _id: req.params.variantId, product: req.params.productId });
    if (!variant) return res.status(404).json({ success: false, message: 'Variant not found.' });
    res.json({ success: true, message: 'Variant deleted.' });
  } catch (error) { next(error); }
}
