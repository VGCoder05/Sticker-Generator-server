import ExcelJS from 'exceljs';
import { Readable } from 'node:stream';
import ConsolidationConfig from '../models/ConsolidationConfig.js';
import { consolidateRecords } from '../services/consolidationEngine.js';
import { classifyAndNormalizeRows } from '../services/rowClassifier.js';

async function parseAllRows(file, sheetName) {
  const extension = file.originalname.toLowerCase().split('.').pop();
  const workbook = new ExcelJS.Workbook();
  if (extension === 'csv') { await workbook.csv.read(Readable.from(file.buffer)); if (workbook.worksheets[0]) workbook.worksheets[0].name = 'CSV Data'; }
  else if (extension === 'xlsx') await workbook.xlsx.load(file.buffer);
  else { const error = new Error('Only .xlsx and .csv files are supported.'); error.status = 400; throw error; }
  const worksheet = sheetName ? workbook.getWorksheet(sheetName) : workbook.worksheets[0];
  if (!worksheet) { const error = new Error('Selected worksheet was not found.'); error.status = 400; throw error; }
  const clean = (value) => {
    if (value == null) return '';
    if (value instanceof Date) return value.toISOString();
    if (typeof value === 'object') {
      if ('result' in value) return clean(value.result);
      if ('text' in value) return value.text;
      if ('richText' in value) return value.richText.map((part) => part.text).join('');
      if ('hyperlink' in value) return value.text || value.hyperlink;
      if ('formula' in value) return '';
    }
    return value;
  };
  let headerRow = null;
  worksheet.eachRow({ includeEmpty: false }, (row, number) => { if (!headerRow && row.values.slice(1).some((value) => clean(value) !== '')) headerRow = number; });
  if (!headerRow) { const error = new Error('No header row found in this worksheet.'); error.status = 400; throw error; }
  const headerCells = worksheet.getRow(headerRow).values.slice(1);
  const used = new Map();
  const headers = headerCells.map((value, index) => {
    const base = String(clean(value) || `Column ${index + 1}`).trim();
    const count = (used.get(base) || 0) + 1; used.set(base, count);
    return count === 1 ? base : `${base} (${count})`;
  });
  const rows = [];
  worksheet.eachRow({ includeEmpty: false }, (row, number) => {
    if (number <= headerRow) return;
    const values = headers.map((_header, index) => clean(row.getCell(index + 1).value));
    if (values.every((value) => value === '' || value == null)) return;
    const record = { _rowNumber: number };
    headers.forEach((header, index) => { record[header] = values[index]; });
    rows.push(record);
  });
  if (rows.length > 100000) { const error = new Error('This worksheet contains more than 100,000 data rows. Split the file into smaller files.'); error.status = 400; throw error; }
  return { headers, rows };
}

export async function previewConsolidation(req, res, next) {
  try {
    if (!req.file) { const error = new Error('Upload the source spreadsheet again to process its complete data.'); error.status = 400; throw error; }
    const { headers, rows } = await parseAllRows(req.file, req.body.sheetName);
    const mappings = JSON.parse(req.body.mappings || '{}');
    const config = JSON.parse(req.body.config || '{}');
    const classification = classifyAndNormalizeRows({ rows, mappings });
    const result = consolidateRecords({ rows: classification.rows, headers, mappings, groupBy: config.groupBy || [], aggregations: config.aggregations || {}, enabled: config.enabled !== false });
    res.json({ success: true, data: { ...result, classification: { format: classification.format, counts: classification.counts, unknownRows: classification.unknownRows, requiresUnknownAcknowledgement: classification.requiresUnknownAcknowledgement, explanation: classification.explanation }, headers, previewRows: result.rows.slice(0, 100), truncated: result.rows.length > 100, sourceFile: req.file.originalname } });
  } catch (error) { next(error); }
}
export async function listConsolidationConfigs(_req, res, next) {
  try { res.json({ success: true, data: await ConsolidationConfig.find().sort({ updatedAt: -1 }).lean() }); } catch (error) { next(error); }
}
export async function saveConsolidationConfig(req, res, next) {
  try {
    const { name, groupBy, aggregations } = req.body;
    if (!name?.trim()) return res.status(400).json({ success: false, message: 'Configuration name is required.' });
    const config = await ConsolidationConfig.create({ name: name.trim(), groupBy: Array.isArray(groupBy) ? groupBy : [], aggregations: aggregations || {} });
    res.status(201).json({ success: true, data: config });
  } catch (error) { next(error); }
}
