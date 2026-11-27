import { Router } from 'express';
import { generateStickers, listGeneratedStickers } from '../controllers/stickerGenerationController.js';
const router = Router();
router.get('/', listGeneratedStickers);
router.post('/', generateStickers);
export default router;
