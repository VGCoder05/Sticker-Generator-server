import mongoose from 'mongoose';
import GeneratedSticker from '../models/GeneratedSticker.js';
import { buildHistoryFilter, normalizeStickerIds } from '../services/generationHistory.js';

export async function listGenerationHistory(req, res, next) {
  try {
    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, Number.parseInt(req.query.limit, 10) || 20));
    const searchFilter = buildHistoryFilter(req.query.search);
    const matchingIds = Object.keys(searchFilter).length ? await GeneratedSticker.distinct('generationId', searchFilter) : null;
    const filter = matchingIds ? { generationId: { $in: matchingIds } } : {};
    const [batches, countResult] = await Promise.all([
      GeneratedSticker.aggregate([
        { $match: filter }, { $sort: { createdAt: -1 } },
        { $group: { _id: '$generationId', generationId: { $first: '$generationId' }, generatedAt: { $min: '$generatedAt' }, stickerCount: { $sum: 1 }, productNames: { $addToSet: '$productName' }, printedCount: { $sum: { $cond: [{ $ne: ['$printedAt', null] }, 1, 0] } }, templateName: { $first: '$templateSnapshot.name' } } },
        { $sort: { generatedAt: -1 } }, { $skip: (page - 1) * limit }, { $limit: limit }
      ]),
      GeneratedSticker.aggregate([{ $match: filter }, { $group: { _id: '$generationId' } }, { $count: 'total' }])
    ]);
    res.json({ success: true, data: { batches, page, limit, total: countResult[0]?.total || 0 } });
  } catch (error) { next(error); }
}

export async function getGenerationDetails(req, res, next) {
  try {
    const generationId = String(req.params.generationId || '');
    if (!/^[\w-]{8,80}$/.test(generationId)) return res.status(400).json({ success: false, message: 'Invalid generation reference.' });
    const stickers = await GeneratedSticker.find({ generationId }).sort({ createdAt: 1 }).lean();
    if (!stickers.length) return res.status(404).json({ success: false, message: 'Generation not found.' });
    res.json({ success: true, data: stickers });
  } catch (error) { next(error); }
}

export async function reprintGeneration(req, res, next) {
  try {
    const generationId = String(req.params.generationId || '');
    if (!/^[\w-]{8,80}$/.test(generationId)) return res.status(400).json({ success: false, message: 'Invalid generation reference.' });
    let ids;
    try { ids = normalizeStickerIds(req.body?.stickerIds); }
    catch (error) { return res.status(400).json({ success: false, message: error.message }); }
    if (ids && ids.some(id => !mongoose.isValidObjectId(id))) return res.status(400).json({ success: false, message: 'One or more sticker IDs are invalid.' });
    const filter = { generationId, ...(ids ? { _id: { $in: ids } } : {}) };
    const stickers = await GeneratedSticker.find(filter).sort({ createdAt: 1 }).lean();
    if (!stickers.length) return res.status(404).json({ success: false, message: 'No matching stickers were found in this generation.' });
    if (ids && stickers.length !== ids.length) return res.status(404).json({ success: false, message: 'Some selected stickers do not belong to this generation.' });
    const printedAt = new Date();
    await GeneratedSticker.updateMany(filter, { $set: { printedAt } });
    res.json({ success: true, data: { generationId, stickers: stickers.map(sticker => ({ ...sticker, printedAt })), reusedCodes: true, newCodesCreated: false } });
  } catch (error) { next(error); }
}
