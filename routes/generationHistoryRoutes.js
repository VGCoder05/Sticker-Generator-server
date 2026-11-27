import { Router } from 'express';
import { getGenerationDetails, listGenerationHistory, reprintGeneration } from '../controllers/generationHistoryController.js';
const router = Router();
router.get('/', listGenerationHistory);
router.get('/:generationId', getGenerationDetails);
router.post('/:generationId/reprint', reprintGeneration);
export default router;
