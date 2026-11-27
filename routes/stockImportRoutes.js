import { Router } from 'express';
import { previewStockImport, commitStockImport, listStockImportBatches } from '../controllers/stockImportController.js';
const router = Router();
router.get('/stock-batches', listStockImportBatches);
router.post('/stock-preview', previewStockImport);
router.post('/stock-commit', commitStockImport);
export default router;
