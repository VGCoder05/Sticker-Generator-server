const isBlank = (value) => value === '' || value === null || value === undefined;
const isPositiveNumber = (value) => !isBlank(value) && Number.isFinite(Number(value)) && Number(value) > 0;

export function isSerialNumberRow(row) {
  const values = Object.values(row || {}).filter((value) => !isBlank(value));
  return values.some((value) => {
    const text = String(value).trim();
    return /^\.?\s*sr\s*\.?\s*no\.?\s*$/i.test(text)
      || /^\.?\s*\d+\(\d+\)\/\d+$/i.test(text)
      || /^\.?\s*\d+\/\d+$/i.test(text);
  });
}

/**
 * Classifies source rows before consolidation. Only explicit serial rows are
 * discarded automatically. Ambiguous rows are returned for user review.
 */
export function classifyAndNormalizeRows({ rows, mappings = {} }) {
  const productHeader = mappings.productName;
  const quantityHeader = mappings.quantity;
  const contextKeys = ['date', 'billNumber', 'partyName'];
  const contextHeaders = Object.fromEntries(contextKeys.map((key) => [key, mappings[key]]).filter(([, header]) => Boolean(header)));
  const context = {};
  const products = [];
  const unknownRows = [];
  const counts = { product: 0, voucherHeader: 0, serial: 0, summary: 0, empty: 0, unknown: 0 };
  let sawVoucherHeader = false;
  let sawSerial = false;

  for (const source of rows) {
    const values = Object.values(source).filter((value) => !isBlank(value));
    if (!values.length) { counts.empty += 1; continue; }

    if (isSerialNumberRow(source)) {
      counts.serial += 1;
      sawSerial = true;
      continue;
    }

    const rowText = values.map((value) => String(value).trim()).join(' ');
    const candidateProductName = source[productHeader];
    if (!isPositiveNumber(source[quantityHeader]) && /\b(?:grand\s+)?total(?:\s+amt)?\b/i.test(rowText)) {
      counts.summary += 1;
      continue;
    }

    // Voucher-level fields are repeated only on the first row of a bill.
    // Store non-empty values and apply them to subsequent product rows.
    for (const [key, header] of Object.entries(contextHeaders)) {
      const value = source[header];
      if (isBlank(value)) continue;
      if (key === 'partyName' && (Number.isFinite(Number(value)) || /\btotal\b/i.test(String(value)))) continue;
      context[key] = value;
    }

    const productName = source[productHeader];
    const hasProductName = !isBlank(productName) && String(productName).trim() !== '';
    const hasQuantity = isPositiveNumber(source[quantityHeader]);

    if (hasProductName) {
      const normalized = { ...source };
      for (const [key, header] of Object.entries(contextHeaders)) {
        if (isBlank(normalized[header]) && !isBlank(context[key])) normalized[header] = context[key];
      }
      products.push(normalized);
      counts.product += 1;
      continue;
    }

    const hasVoucherContext = Object.entries(contextHeaders).some(([key, header]) => {
      const value = source[header];
      if (isBlank(value)) return false;
      return key !== 'partyName' || (!Number.isFinite(Number(value)) && !/\btotal\b/i.test(String(value)));
    });
    if (hasVoucherContext && !hasQuantity) {
      counts.voucherHeader += 1;
      sawVoucherHeader = true;
      continue;
    }

    counts.unknown += 1;
    unknownRows.push({ rowNumber: source._rowNumber ?? null, values: values.slice(0, 6).map(String) });
  }

  const format = sawVoucherHeader || sawSerial ? 'voucher' : 'simple';
  return {
    rows: products,
    format,
    counts,
    unknownRows,
    requiresUnknownAcknowledgement: unknownRows.length > 0,
    explanation: format === 'voucher'
      ? 'Voucher-style layout detected. Bill details are carried forward; serial-number rows are excluded.'
      : 'Simple product-row layout detected. Each identified product row is kept as a separate source record.'
  };
}
