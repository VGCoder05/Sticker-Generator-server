import { Router } from 'express';
import { createMappingConfig, getMappingConfigs } from '../controllers/mappingController.js';
const router = Router();
router.get('/', getMappingConfigs);
router.post('/', createMappingConfig);
export default router;
