import { Router } from 'express';
import { createTemplate, deleteTemplate, getTemplate, listTemplates, updateTemplate } from '../controllers/templateController.js';
const router = Router();
router.get('/', listTemplates);
router.get('/:id', getTemplate);
router.post('/', createTemplate);
router.put('/:id', updateTemplate);
router.delete('/:id', deleteTemplate);
export default router;
