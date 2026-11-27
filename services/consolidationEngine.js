const OPERATIONS = new Set(['SUM', 'AVERAGE', 'MIN', 'MAX', 'COUNT', 'FIRST', 'LAST', 'IGNORE']);
const numeric = (value) => value !== '' && value !== null && value !== undefined && Number.isFinite(Number(value));
const normalize = (value) => value instanceof Date ? value.toISOString() : value;
const keyPart = (value) => `${typeof value}:${String(normalize(value) ?? '')}`;

export function consolidateRecords({ rows, headers, mappings, groupBy = [], aggregations = {}, enabled = true }) {
  if (!Array.isArray(rows) || !Array.isArray(headers) || !mappings || typeof mappings !== 'object') {
    const error = new Error('Invalid consolidation input.'); error.status = 400; throw error;
  }
  const mappedFields = Object.entries(mappings).filter(([, header]) => header && headers.includes(header));
  if (!mappedFields.some(([field]) => field === 'productName')) {
    const error = new Error('Product Name must be mapped before consolidation.'); error.status = 400; throw error;
  }
  if (!mappedFields.some(([field]) => field === 'quantity')) {
    const error = new Error('Quantity must be mapped before consolidation.'); error.status = 400; throw error;
  }
  const normalized = rows.map((source, index) => {
    const record = { _sourceRows: [source._rowNumber ?? index + 1] };
    for (const [field, header] of mappedFields) record[field] = normalize(source[header] ?? '');
    return record;
  });
  const invalidRows = rows.filter((row) => !String(row[mappings.productName] ?? '').trim() || !numeric(row[mappings.quantity]) || Number(row[mappings.quantity]) <= 0).length;
  if (!enabled) return { rows: normalized, summary: { originalCount: rows.length, resultCount: normalized.length, mergedRows: 0, conflictCount: 0, invalidRows }, conflicts: [], consolidated: false };

  const validGroups = [...new Set(groupBy)].filter((field) => mappedFields.some(([mapped]) => mapped === field));
  if (!validGroups.length) {
    const error = new Error('Select at least one mapped field for grouping, or choose not to consolidate.'); error.status = 400; throw error;
  }
  const buckets = new Map();
  for (const record of normalized) {
    const key = validGroups.map((field) => keyPart(record[field])).join('|');
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key).push(record);
  }
  const conflicts = [];
  const output = [];
  const fieldNames = mappedFields.map(([field]) => field);
  for (const [key, group] of buckets) {
    const result = { _sourceRows: group.flatMap((row) => row._sourceRows) };
    for (const field of fieldNames) {
      if (validGroups.includes(field)) { result[field] = group[0][field]; continue; }
      const values = group.map((row) => row[field]).filter((value) => value !== '' && value !== null && value !== undefined);
      const unique = [...new Map(values.map((value) => [keyPart(value), value])).values()];
      const operation = String(aggregations[field] || (field === 'quantity' ? 'SUM' : 'FIRST')).toUpperCase();
      if (!OPERATIONS.has(operation)) { const error = new Error(`Unsupported aggregation operation for ${field}.`); error.status = 400; throw error; }
      if (operation === 'IGNORE') continue;
      if (unique.length > 1 && ['FIRST', 'LAST'].includes(operation)) conflicts.push({ groupKey: key, field, values: unique.slice(0, 8), sourceRows: result._sourceRows });
      const numbers = values.filter(numeric).map(Number);
      switch (operation) {
        case 'SUM': result[field] = numbers.reduce((sum, value) => sum + value, 0); break;
        case 'AVERAGE': result[field] = numbers.length ? numbers.reduce((sum, value) => sum + value, 0) / numbers.length : ''; break;
        case 'MIN': result[field] = numbers.length ? Math.min(...numbers) : ''; break;
        case 'MAX': result[field] = numbers.length ? Math.max(...numbers) : ''; break;
        case 'COUNT': result[field] = values.length; break;
        case 'LAST': result[field] = values.at(-1) ?? ''; break;
        case 'FIRST': result[field] = values[0] ?? ''; break;
      }
    }
    output.push(result);
  }
  return {
    rows: output,
    summary: { originalCount: rows.length, resultCount: output.length, mergedRows: rows.length - output.length, conflictCount: conflicts.length, invalidRows },
    conflicts,
    consolidated: true
  };
}

export const AGGREGATION_OPERATIONS = [...OPERATIONS];
