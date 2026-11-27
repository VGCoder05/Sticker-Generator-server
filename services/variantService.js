export function normalizeBatch(value) {
  return String(value ?? '').trim().toLocaleUpperCase();
}

export function validateVariantInput(input) {
  const mrp = input.mrp === '' || input.mrp === null || input.mrp === undefined ? null : Number(input.mrp);
  const openingStock = Number(input.openingStock ?? input.stockOnHand ?? 0);
  if (mrp !== null && (!Number.isFinite(mrp) || mrp < 0)) return { valid: false, message: 'MRP must be empty or a valid non-negative number.' };
  if (!Number.isInteger(openingStock) || openingStock <= 0) return { valid: false, message: 'Opening stock must be a whole number greater than zero. Use Receive Stock to add stock to an existing variant.' };
  return { valid: true, mrp, openingStock, batchCode: normalizeBatch(input.batchCode) };
}

export function calculateStockChange(current, change) {
  const next = Number(current) + Number(change);
  if (!Number.isFinite(next) || next < 0) throw Object.assign(new Error('This adjustment would make stock negative.'), { status: 400 });
  return next;
}
