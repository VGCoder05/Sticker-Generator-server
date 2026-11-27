import Template from '../models/Template.js';

export async function listTemplates(_req, res, next) {
  try { const templates = await Template.find().sort({ updatedAt: -1 }).lean(); res.json({ success: true, data: templates }); }
  catch (error) { next(error); }
}
export async function getTemplate(req, res, next) {
  try { const template = await Template.findById(req.params.id); if (!template) return res.status(404).json({ success: false, message: 'Template not found.' }); res.json({ success: true, data: template }); }
  catch (error) { next(error); }
}
function validateBody(body) {
  if (!body.name?.trim()) return 'Template name is required.';
  if (!Number.isFinite(Number(body.width)) || !Number.isFinite(Number(body.height)) || Number(body.width) < 1 || Number(body.height) < 1 || Number(body.width) > 300 || Number(body.height) > 300) return 'Template dimensions must be between 1 and 300 mm.';
  if (!Array.isArray(body.elements) || body.elements.length > 100) return 'Template must contain an element list with at most 100 elements.';
  return null;
}
export async function createTemplate(req, res, next) {
  try { const problem = validateBody(req.body); if (problem) return res.status(400).json({ success: false, message: problem }); const template = await Template.create({ ...req.body, unit: 'mm' }); res.status(201).json({ success: true, data: template }); }
  catch (error) { next(error); }
}
export async function updateTemplate(req, res, next) {
  try { const problem = validateBody(req.body); if (problem) return res.status(400).json({ success: false, message: problem }); const template = await Template.findByIdAndUpdate(req.params.id, { ...req.body, unit: 'mm', $inc: { version: 1 } }, { new: true, runValidators: true }); if (!template) return res.status(404).json({ success: false, message: 'Template not found.' }); res.json({ success: true, data: template }); }
  catch (error) { next(error); }
}
export async function deleteTemplate(req, res, next) {
  try { const template = await Template.findByIdAndDelete(req.params.id); if (!template) return res.status(404).json({ success: false, message: 'Template not found.' }); res.json({ success: true, message: 'Template deleted.' }); }
  catch (error) { next(error); }
}
