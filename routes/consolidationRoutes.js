import { Router } from 'express';
import multer from 'multer';
import { listConsolidationConfigs, previewConsolidation, saveConsolidationConfig } from '../controllers/consolidationController.js';
const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 15 * 1024 * 1024 }, fileFilter: (_req, file, cb) => ['xlsx', 'csv'].includes(file.originalname.toLowerCase().split('.').pop()) ? cb(null, true) : cb(Object.assign(new Error('Only .xlsx and .csv files are supported.'), { status: 400 })) });
router.get('/configs', listConsolidationConfigs);
router.post('/configs', saveConsolidationConfig);
router.post('/preview', upload.single('file'), previewConsolidation);
export default router;
