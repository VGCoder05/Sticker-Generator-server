import { Router } from 'express';
import { exportBackup, restoreBackup } from '../controllers/backupController.js';
const router = Router();
router.get('/export', exportBackup);
router.post('/restore', restoreBackup);
export default router;
