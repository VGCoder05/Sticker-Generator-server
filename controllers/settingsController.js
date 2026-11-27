import AppSettings from '../models/AppSettings.js';

const DEFAULTS = {
  businessName: 'Sticker Studio', codePrefix: 'STK', codeDateFormat: 'YYMMDD',
  codeRandomLength: 8, defaultBarcodeFormat: 'CODE128', defaultPaper: 'A4',
  defaultOrientation: 'Portrait', defaultMargin: 5
};

export async function getSettings(_req, res, next) {
  try {
    const settings = await AppSettings.findOneAndUpdate({ key: 'workspace' }, { $setOnInsert: { key: 'workspace', ...DEFAULTS } }, { new: true, upsert: true, setDefaultsOnInsert: true });
    res.json({ success: true, data: settings });
  } catch (error) { next(error); }
}

export async function updateSettings(req, res, next) {
  try {
    const allowed = Object.keys(DEFAULTS);
    const payload = Object.fromEntries(allowed.filter(key => req.body[key] !== undefined).map(key => [key, req.body[key]]));
    if (payload.codePrefix !== undefined && !/^[A-Z0-9_-]{1,10}$/i.test(String(payload.codePrefix))) return res.status(400).json({ success: false, message: 'Code prefix may contain 1–10 letters, numbers, hyphens or underscores.' });
    if (payload.codeRandomLength !== undefined && (!Number.isInteger(Number(payload.codeRandomLength)) || Number(payload.codeRandomLength) < 4 || Number(payload.codeRandomLength) > 20)) return res.status(400).json({ success: false, message: 'Random code length must be between 4 and 20.' });
    const settings = await AppSettings.findOneAndUpdate({ key: 'workspace' }, { $set: payload, $setOnInsert: { key: 'workspace' } }, { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true });
    res.json({ success: true, data: settings });
  } catch (error) { next(error); }
}
