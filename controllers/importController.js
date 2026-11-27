import { readExcelUpload } from '../services/excelReader.js';

export async function previewImport(req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Choose an Excel or CSV file first.' });
    }
    const result = await readExcelUpload(req.file, req.query.sheetName);
    return res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}
