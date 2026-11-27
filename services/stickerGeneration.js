import { randomBytes, randomUUID } from 'node:crypto';

export function makeUniqueCode(settings = {}, date = new Date(), requestedFormat = null) {
  if ((requestedFormat || settings.defaultBarcodeFormat) === 'EAN13') {
    // EAN-13 requires 12 numeric data digits plus its calculated check digit.
    const twelveDigits = randomBytes(8).toString('hex').replace(/[^0-9]/g, '').padEnd(12, '7').slice(0, 12);
    const sum = [...twelveDigits].reduce((total, digit, index) => total + Number(digit) * (index % 2 === 0 ? 1 : 3), 0);
    return `${twelveDigits}${(10 - (sum % 10)) % 10}`;
  }
  const format = settings.codeDateFormat || 'YYMMDD';
  const datePart = format === 'NONE' ? '' : format === 'YYYYMMDD' ? date.toISOString().slice(0, 10).replaceAll('-', '') : date.toISOString().slice(2, 10).replaceAll('-', '');
  const prefix = String(settings.codePrefix || 'STK').toUpperCase();
  const length = Math.min(20, Math.max(4, Number(settings.codeRandomLength) || 8));
  const randomPart = randomBytes(Math.ceil(length / 2)).toString('hex').slice(0, length).toUpperCase();
  return [prefix, datePart, randomPart].filter(Boolean).join('-');
}

export function buildStickerValues(product, variant, uniqueCode) {
  const fields = product.fields && typeof product.fields === 'object' ? product.fields : {};
  return {
    ...fields,
    ...(variant.attributes && typeof variant.attributes === 'object' ? variant.attributes : {}),
    productName: product.name,
    productCode: product.productCode || '',
    mrp: variant.mrp ?? fields.mrp ?? '',
    batchCode: variant.batchCode || '',
    brand: fields.brand || '',
    category: fields.category || '',
    sellingPrice: fields.sellingPrice ?? '',
    purchasePrice: fields.purchasePrice ?? '',
    uniqueCode,
    barcode: uniqueCode
  };
}

export function mergeStickerOverrides(baseValues, overrides = {}) {
  if (!overrides || typeof overrides !== 'object' || Array.isArray(overrides)) return { ...baseValues };
  const safe = {};
  for (const [key, value] of Object.entries(overrides)) {
    if (/^[a-zA-Z][a-zA-Z0-9_]{0,49}$/.test(key) && !['__proto__','prototype','constructor','uniqueCode','barcode'].includes(key)) safe[key] = value == null ? '' : String(value).slice(0, 500);
  }
  return { ...baseValues, ...safe };
}

export function validateGenerationRequest(body) {
  if (!body.templateId) return 'Choose a sticker template.';
  if (!Array.isArray(body.items) || !body.items.length) return 'Select at least one product variant.';
  if (body.items.length > 200) return 'Select no more than 200 variants per generation.';
  for (const item of body.items) {
    if (!item.variantId) return 'Every selected item must have a variant.';
    const quantity = Number(item.quantity);
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 500) return 'Each sticker quantity must be a whole number between 1 and 500.';
  }
  const total = body.items.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
  if (total > 5000) return 'A single generation is limited to 5,000 stickers.';
  return null;
}
export const createGenerationId = () => randomUUID();
