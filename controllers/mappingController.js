import MappingConfig from '../models/MappingConfig.js';

export async function getMappingConfigs(_req, res, next) {
  try {
    const configs = await MappingConfig.find().sort({ updatedAt: -1 }).lean();
    res.json({ success: true, data: configs });
  } catch (error) { next(error); }
}

export async function createMappingConfig(req, res, next) {
  try {
    const { name, headers, mappings, sourceSheetName = '' } = req.body;
    if (!String(name || '').trim()) return res.status(400).json({ success: false, message: 'Enter a name for this mapping configuration.' });
    if (!Array.isArray(headers) || !headers.length) return res.status(400).json({ success: false, message: 'No spreadsheet headers were supplied.' });
    if (!mappings || typeof mappings !== 'object' || Array.isArray(mappings)) return res.status(400).json({ success: false, message: 'Provide valid field mappings.' });
    const allowedHeaders = new Set(headers);
    for (const [field, header] of Object.entries(mappings)) {
      if (header && !allowedHeaders.has(header)) return res.status(400).json({ success: false, message: `The selected column for ${field} is not in this spreadsheet.` });
    }
    const config = await MappingConfig.create({ name: name.trim(), headers, mappings, sourceSheetName });
    res.status(201).json({ success: true, data: config });
  } catch (error) {
    if (error.code === 11000) error.status = 409;
    next(error);
  }
}
