export function buildHistoryFilter(search = '') {
  const term = String(search || '').trim();
  if (!term) return {};
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(escaped, 'i');
  return { $or: [{ generationId: regex }, { productName: regex }, { uniqueCode: regex }] };
}

export function normalizeStickerIds(ids) {
  if (ids === undefined || ids === null) return null;
  if (!Array.isArray(ids) || ids.length === 0 || ids.length > 5000) throw new Error('Select between 1 and 5,000 stickers to reprint.');
  return [...new Set(ids.map(String))];
}
