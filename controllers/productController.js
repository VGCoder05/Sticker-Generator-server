import Product from '../models/Product.js';
import ProductVariant from '../models/ProductVariant.js';
import { buildProductFields, findProductMatch } from '../services/productMatching.js';

export async function listProducts(req, res, next) {
  try {
    const search = String(req.query.search || '').trim();
    const filter = search ? { $or: [{ name: { $regex: search, $options: 'i' } }, { productCode: { $regex: search, $options: 'i' } }] } : {};
    const products = await Product.find(filter).populate('defaultTemplate', 'name').sort({ updatedAt: -1 }).limit(500).lean();
    res.json({ success: true, data: products });
  } catch (error) { next(error); }
}

export async function createProduct(req, res, next) {
  try {
    const { name, productCode = '', fields = {}, defaultTemplate = null } = req.body;
    if (!String(name || '').trim()) return res.status(400).json({ success: false, message: 'Product name is required.' });
    const product = await Product.create({ name, productCode, fields, defaultTemplate: defaultTemplate || null });
    res.status(201).json({ success: true, data: product });
  } catch (error) { next(error); }
}

export async function updateProduct(req, res, next) {
  try {
    const allowed = ['name', 'productCode', 'fields', 'defaultTemplate', 'codeGeneration'];
    const updates = Object.fromEntries(Object.entries(req.body).filter(([key]) => allowed.includes(key)));
    const product = await Product.findByIdAndUpdate(req.params.id, { $set: updates }, { new: true, runValidators: true }).lean();
    if (!product) return res.status(404).json({ success: false, message: 'Product not found.' });
    res.json({ success: true, data: product });
  } catch (error) { next(error); }
}

export async function deleteProduct(req, res, next) {
  try {
    const variantCount = await ProductVariant.countDocuments({ product: req.params.id });
    if (variantCount) return res.status(409).json({ success: false, message: 'This product has variants and stock history. Delete or archive its variants first.' });
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) return res.status(404).json({ success: false, message: 'Product not found.' });
    res.json({ success: true, message: 'Product deleted.' });
  } catch (error) { next(error); }
}

export async function previewProductImport(req, res, next) {
  try {
    const records = req.body.records;
    if (!Array.isArray(records) || records.length > 100000) return res.status(400).json({ success: false, message: 'A valid import record list (maximum 100,000) is required.' });
    const products = await Product.find().lean();
    const preview = records.map((record, index) => {
      const data = buildProductFields(record);
      const match = findProductMatch(record, products);
      return { index, ...data, matchId: match.product?._id || null, matchName: match.product?.name || null, matchMethod: match.method, suggestedAction: match.product ? 'keep' : 'create', sourceRows: record._sourceRows || [] };
    });
    res.json({ success: true, data: { rows: preview, summary: { total: preview.length, newProducts: preview.filter((row) => !row.matchId && row.matchMethod !== 'ambiguous').length, matched: preview.filter((row) => row.matchId).length, ambiguous: preview.filter((row) => row.matchMethod === 'ambiguous').length } } });
  } catch (error) { next(error); }
}

export async function commitProductImport(req, res, next) {
  try {
    const rows = req.body.rows;
    if (!Array.isArray(rows) || rows.length > 100000) return res.status(400).json({ success: false, message: 'A valid import review is required.' });
    const products = await Product.find().lean();
    const created = [], updated = [], kept = [], skipped = [];
    const processedMatchIds = new Set();
    for (const row of rows) {
      const action = row.action;
      if (action === 'skip') { skipped.push(row.index); continue; }
      const data = { name: String(row.name || '').trim(), productCode: String(row.productCode || '').trim(), fields: row.fields || {} };
      if (!data.name) { skipped.push(row.index); continue; }
      if (action === 'create') {
        // Repeated SKU rows in one un-consolidated import must not create duplicate catalog entries.
        const duplicate = data.productCode ? products.find((item) => String(item.productCode || '').trim().toLowerCase() === data.productCode.toLowerCase()) : null;
        if (duplicate) { kept.push(duplicate._id); continue; }
        const product = await Product.create(data); created.push(product._id);
        products.push(product.toObject());
      } else if (action === 'update' && row.matchId) {
        if (processedMatchIds.has(String(row.matchId))) { skipped.push(row.index); continue; }
        processedMatchIds.add(String(row.matchId));
        const product = await Product.findByIdAndUpdate(row.matchId, { $set: data }, { new: true, runValidators: true });
        if (product) { updated.push(product._id); const at = products.findIndex((item) => String(item._id) === String(row.matchId)); if (at >= 0) products[at] = product.toObject(); }
        else skipped.push(row.index);
      } else if (action === 'keep' && row.matchId) { processedMatchIds.add(String(row.matchId)); kept.push(row.matchId); }
      else skipped.push(row.index);
    }
    res.json({ success: true, data: { created: created.length, updated: updated.length, kept: kept.length, skipped: skipped.length } });
  } catch (error) { next(error); }
}
