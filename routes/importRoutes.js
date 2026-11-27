import { Router } from 'express';
import multer from 'multer';
import { previewImport } from '../controllers/importController.js';

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: (_req, file, callback) => {
    const extension = file.originalname.toLowerCase().split('.').pop();
    if (['xlsx', 'csv'].includes(extension)) return callback(null, true);
    const error = new Error('Only .xlsx and .csv files are supported.');
    error.status = 400;
    callback(error);
  }
});

router.post('/preview', upload.single('file'), previewImport);
export default router;
