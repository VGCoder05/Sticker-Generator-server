import { findProductMatch } from './productMatching.js';

const clean = (value) => String(value ?? '').trim();
const normalizeBatch = (value) => clean(value).toLocaleUpperCase();

export function buildStockReconciliation(records, products, existingVariants = []) {
  if (!Array.isArray(records) || records.length > 100000) {
    const error = new Error('A valid list of up to 100,000 import records is required.'); error.status = 400; throw error;
  }
  return records.map((record, index) => {
    const fields = record.fields || record;
    const productRecord = { productName: record.name ?? record.productName, productCode: record.productCode, brand: fields.brand };
    const match = findProductMatch(productRecord, products);
    const mrpValue = fields.mrp ?? record.mrp;
    const mrp = mrpValue === '' || mrpValue === null || mrpValue === undefined ? null : Number(mrpValue);
    const quantity = Number(fields.quantity ?? record.quantity);
    const batchCode = normalizeBatch(fields.batchCode ?? record.batchCode);
    const valid = Boolean(match.product) && (mrp === null || (Number.isFinite(mrp) && mrp >= 0)) && Number.isInteger(quantity) && quantity > 0;
    const variants = match.product ? existingVariants.filter((item) => String(item.product) === String(match.product._id)) : [];
    const exact = mrp !== null || batchCode
      ? variants.filter((item) => (mrp === null || Number(item.mrp) === mrp) && (!batchCode || normalizeBatch(item.batchCode) === batchCode))
      : [];
    const suggestedVariant = exact.length === 1 ? exact[0] : null;
    return {
      sourceIndex: index, productId: match.product?._id || null,
      productName: match.product?.name || clean(productRecord.productName), productCode: clean(productRecord.productCode),
      matchMethod: match.method || '', mrp: Number.isFinite(mrp) ? mrp : null, batchCode,
      attributes: Object.fromEntries(Object.entries(fields).filter(([key]) => !['quantity','mrp','batchCode','productName','productCode','brand','category'].includes(key))),
      quantity: Number.isInteger(quantity) ? quantity : 0,
      existingVariantId: suggestedVariant?._id || null, currentStock: suggestedVariant?.stockOnHand ?? null,
      availableVariants: variants.map((item) => ({ _id: item._id, mrp: item.mrp ?? null, batchCode: item.batchCode || '', stockOnHand: item.stockOnHand || 0, attributes: item.attributes || {} })),
      suggestedAction: suggestedVariant ? 'receive' : 'allocate', valid,
      message: !match.product ? (match.method === 'ambiguous' ? 'Product match is ambiguous.' : 'Product not found. Create or match it first.') : !valid ? 'Check optional MRP and positive whole-number quantity.' : suggestedVariant ? 'A matching variant is suggested. You can change or split this allocation.' : 'Choose an existing variant or create a new one. MRP and batch are optional.'
    };
  });
}

export function validateStockAllocations(item, allocations) {
  if (!item.productId) return 'A product must be matched before stock can be allocated.';
  if (!Number.isInteger(item.quantity) || item.quantity <= 0) return 'Imported quantity must be a positive whole number.';
  if (!Array.isArray(allocations) || !allocations.length) return 'Allocate the imported quantity to at least one destination.';
  let total = 0;
  for (const allocation of allocations) {
    const quantity = Number(allocation.quantity);
    if (!Number.isInteger(quantity) || quantity <= 0) return 'Every allocation quantity must be a positive whole number.';
    total += quantity;
    if (allocation.variantId) {
      if (!item.availableVariants.some((variant) => String(variant._id) === String(allocation.variantId))) return 'An allocation references a variant that does not belong to this product.';
    } else if (allocation.createNew !== true) return 'Choose an existing variant or create a new variant for every allocation.';
    if (allocation.mrp !== '' && allocation.mrp !== null && allocation.mrp !== undefined && (!Number.isFinite(Number(allocation.mrp)) || Number(allocation.mrp) < 0)) return 'New variant MRP must be empty or a non-negative number.';
  }
  if (total !== item.quantity) return `Allocated quantity (${total}) must equal imported quantity (${item.quantity}).`;
  return null;
}
