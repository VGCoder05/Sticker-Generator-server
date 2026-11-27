import ExcelJS from 'exceljs';
import { Readable } from 'node:stream';

const PREVIEW_LIMIT = 100;

function cellValue(value) {
  if (value == null) return '';
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'object') {
    if ('result' in value) return cellValue(value.result);
    if ('text' in value) return value.text;
    if ('richText' in value) return value.richText.map((part) => part.text).join('');
    if ('hyperlink' in value) return value.text || value.hyperlink;
    if ('formula' in value) return '';
  }
  return value;
}

function isEmptyRow(values) {
  return values.every((value) => value === '' || value == null);
}

function getHeaders(row) {
  const used = new Map();
  return row.values.slice(1).map((value, index) => {
    const base = String(cellValue(value) ?? '').trim() || `Column ${index + 1}`;
    const count = (used.get(base) || 0) + 1;
    used.set(base, count);
    return count === 1 ? base : `${base} (${count})`;
  });
}

function previewWorksheet(worksheet) {
  let headerRowNumber = null;
  let headers = [];
  worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (headerRowNumber !== null) return;
    const values = row.values.slice(1).map(cellValue);
    if (!isEmptyRow(values)) {
      headerRowNumber = rowNumber;
      headers = getHeaders(row);
    }
  });

  if (headerRowNumber === null || headers.length === 0) {
    return { name: worksheet.name, rowCount: 0, columnCount: 0, headers: [], rows: [], previewLimit: PREVIEW_LIMIT, warning: 'This sheet does not contain a usable header row.' };
  }

  const rows = [];
  let rowCount = 0;
  worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber <= headerRowNumber) return;
    const values = headers.map((_header, index) => cellValue(row.getCell(index + 1).value));
    if (isEmptyRow(values)) return;
    rowCount += 1;
    if (rows.length < PREVIEW_LIMIT) {
      const record = { _rowNumber: rowNumber };
      headers.forEach((header, index) => { record[header] = values[index]; });
      rows.push(record);
    }
  });

  return {
    name: worksheet.name,
    headerRowNumber,
    rowCount,
    columnCount: headers.length,
    headers,
    rows,
    previewLimit: PREVIEW_LIMIT,
    truncated: rowCount > PREVIEW_LIMIT
  };
}

export async function readExcelUpload(file, selectedSheetName) {
  const extension = file.originalname.toLowerCase().split('.').pop();
  const workbook = new ExcelJS.Workbook();

  if (extension === 'csv') {
    await workbook.csv.read(Readable.from(file.buffer));
    if (workbook.worksheets[0]) workbook.worksheets[0].name = 'CSV Data';
  } else if (extension === 'xlsx') {
    await workbook.xlsx.load(file.buffer);
  } else {
    const error = new Error('Unsupported file format. Please upload an .xlsx or .csv file. Legacy .xls files are not supported yet.');
    error.status = 400;
    throw error;
  }

  const sheets = workbook.worksheets.map((sheet) => ({ name: sheet.name, rowCount: sheet.rowCount, columnCount: sheet.columnCount }));
  if (!sheets.length) {
    const error = new Error('The uploaded workbook does not contain any worksheets.');
    error.status = 400;
    throw error;
  }

  const selected = selectedSheetName
    ? workbook.getWorksheet(selectedSheetName)
    : workbook.worksheets[0];
  if (!selected) {
    const error = new Error(`Worksheet "${selectedSheetName}" was not found.`);
    error.status = 400;
    throw error;
  }

  return {
    file: { name: file.originalname, size: file.size, extension },
    sheetCount: sheets.length,
    sheets,
    selectedSheet: previewWorksheet(selected)
  };
}
